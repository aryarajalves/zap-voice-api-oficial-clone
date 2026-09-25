import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { fetchWithAuth } from '../../../../AuthContext';
import { API_URL } from '../../../../config';

export function useChatBulkTagOperations({
    engine,
    selectedConvo,
    setSelectedConvo,
    activeClient,
    activeTab,
    statusFilter,
    searchQuery,
    selectedLabelFilter,
    filterBlockStatus,
    filterHasNote,
    filterStartDate,
    filterEndDate,
    filterUnread,
    filterWindowOpen,
    filterTemplate24h,
    filterHasReplied,
    selectAllPages,
    setSelectAllPages,
    excludedConvoIds,
    setExcludedConvoIds
}) {
    const [isBulkTagModalOpen, setIsBulkTagModalOpen] = useState(false);
    const [selectedBulkTag, setSelectedBulkTag] = useState('');
    const [customBulkTag, setCustomBulkTag] = useState('');
    const [isApplyingBulkTag, setIsApplyingBulkTag] = useState(false);

    const getBulkPayloadExtra = () => {
        const inc = selectedLabelFilter?.include_labels || (selectedLabelFilter?.items?.filter(i => i.mode === 'has').map(i => i.name)) || [];
        const exc = selectedLabelFilter?.exclude_labels || (selectedLabelFilter?.items?.filter(i => i.mode === 'has_not').map(i => i.name)) || [];

        const labelPayload = typeof selectedLabelFilter === 'string'
            ? { label: selectedLabelFilter || undefined }
            : (inc.length > 0 || exc.length > 0 ? {
                include_labels: inc.length > 0 ? inc : undefined,
                exclude_labels: exc.length > 0 ? exc : undefined,
                label_op: selectedLabelFilter?.op || 'or'
            } : (selectedLabelFilter?.labels?.length > 0 ? {
                labels: selectedLabelFilter.labels,
                label_mode: selectedLabelFilter.mode || 'has',
                label_op: selectedLabelFilter.op || 'or'
            } : {}));

        return selectAllPages ? {
            select_all_pages: true,
            excluded_ids: excludedConvoIds?.length > 0 ? excludedConvoIds : undefined,
            tab: activeTab,
            status: statusFilter,
            search: searchQuery || undefined,
            ...labelPayload,
            block_status: filterBlockStatus || undefined,
            has_note: filterHasNote || undefined,
            start_date: filterStartDate || undefined,
            end_date: filterEndDate || undefined,
            unread_only: filterUnread || undefined,
            window_open_only: filterWindowOpen || undefined,
            template_sent_24h_only: filterTemplate24h || undefined,
            has_replied: filterHasReplied || undefined
        } : {
            ids: engine.selectedConvoIds
        };
    };

    const handleBulkTagConversations = async (tagToApply, target = 'chat', options = {}) => {
        let labels = [];
        if (Array.isArray(tagToApply)) {
            labels = tagToApply.map(t => (t || '').trim()).filter(Boolean);
        } else if (typeof tagToApply === 'string' && tagToApply.trim()) {
            labels = [tagToApply.trim()];
        } else {
            const fallback = (customBulkTag || selectedBulkTag || '').trim();
            if (fallback) labels = [fallback];
        }

        const initialTags = Array.isArray(options?.initialTags) ? options.initialTags : [];
        const removedLabels = initialTags.filter(
            t => !labels.some(l => l.toLowerCase() === String(t).toLowerCase())
        );

        if (labels.length === 0 && removedLabels.length === 0) {
            toast.error('Informe ou selecione ao menos uma etiqueta.');
            return;
        }
        if (!engine.selectedConvoIds.length && !selectAllPages) return;

        setIsApplyingBulkTag(true);
        const payload = {
            ...getBulkPayloadExtra(),
            labels,
            remove_labels: removedLabels,
            mode: 'sync',
            target
        };

        const targetLabel = target === 'contacts' ? 'na Aba de Contatos' : 'no Chat';
        let actionDescription = '';
        if (removedLabels.length > 0 && labels.length === 0) {
            actionDescription = `Removendo etiqueta(s) ${targetLabel}...`;
        } else if (removedLabels.length > 0 && labels.length > 0) {
            actionDescription = `Atualizando etiquetas ${targetLabel}...`;
        } else {
            const labelDisplay = labels.length === 1 ? `etiqueta "${labels[0]}"` : `${labels.length} etiquetas`;
            actionDescription = `Aplicando ${labelDisplay} ${targetLabel}...`;
        }

        const toastId = toast.loading(actionDescription);
        try {
            const res = await fetchWithAuth(`${API_URL}/chat/conversations/bulk-tag`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }, activeClient?.id);

            if (res.ok) {
                const data = await res.json();
                const unitName = target === 'contacts' ? 'contato(s) na Aba de Contatos' : 'conversa(s) no Chat';
                let successMsg = '';
                if (removedLabels.length > 0 && labels.length === 0) {
                    successMsg = `Etiqueta(s) removida(s) de ${data.updated_count || 0} ${unitName}!`;
                } else if (removedLabels.length > 0) {
                    successMsg = `Etiquetas atualizadas em ${data.updated_count || 0} ${unitName}!`;
                } else {
                    const labelDisplay = labels.length === 1 ? `etiqueta "${labels[0]}"` : `${labels.length} etiquetas`;
                    successMsg = `${labelDisplay} aplicada(s) em ${data.updated_count || 0} ${unitName}!`;
                }
                toast.success(successMsg, { id: toastId });
                setIsBulkTagModalOpen(false);
                setSelectedBulkTag('');
                setCustomBulkTag('');

                if (selectedConvo && target !== 'contacts') {
                    const isSelectedAffected = selectAllPages
                        ? (!excludedConvoIds || !excludedConvoIds.includes(selectedConvo.id))
                        : (engine.selectedConvoIds.includes(selectedConvo.id) || !engine.selectedConvoIds.length);

                    if (isSelectedAffected) {
                        if (typeof setSelectedConvo === 'function') {
                            setSelectedConvo(prev => {
                                if (!prev) return prev;
                                return {
                                    ...prev,
                                    labels: [...labels]
                                };
                            });
                        }
                        if (typeof engine.loadMessages === 'function') {
                            engine.loadMessages(selectedConvo.id);
                        }
                    }
                }

                engine.setSelectedConvoIds([]);
                setSelectAllPages(false);
                if (setExcludedConvoIds) setExcludedConvoIds([]);
                engine.loadConversations(true);
                engine.loadAvailableLabels();
            } else {
                const errData = await res.json().catch(() => ({}));
                toast.error(errData.detail || 'Erro ao processar etiquetas.', { id: toastId });
            }
        } catch {
            toast.error('Erro de conexão ao processar etiquetas.', { id: toastId });
        } finally {
            setIsApplyingBulkTag(false);
        }
    };

    return {
        isBulkTagModalOpen,
        setIsBulkTagModalOpen,
        selectedBulkTag,
        setSelectedBulkTag,
        customBulkTag,
        setCustomBulkTag,
        isApplyingBulkTag,
        handleBulkTagConversations,
        getBulkPayloadExtra
    };
}
