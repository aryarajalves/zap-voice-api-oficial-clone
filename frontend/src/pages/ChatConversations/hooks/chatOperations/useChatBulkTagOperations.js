import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { fetchWithAuth } from '../../../../AuthContext';
import { API_URL } from '../../../../config';

export function useChatBulkTagOperations({
    engine,
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
    setSelectAllPages
}) {
    const [isBulkTagModalOpen, setIsBulkTagModalOpen] = useState(false);
    const [selectedBulkTag, setSelectedBulkTag] = useState('');
    const [customBulkTag, setCustomBulkTag] = useState('');
    const [isApplyingBulkTag, setIsApplyingBulkTag] = useState(false);

    const getBulkPayloadExtra = () => {
        return selectAllPages ? {
            select_all_pages: true,
            tab: activeTab,
            status: statusFilter,
            search: searchQuery || undefined,
            label: selectedLabelFilter || undefined,
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

    const handleBulkTagConversations = async (tagToApply, target = 'chat') => {
        let labels = [];
        if (Array.isArray(tagToApply)) {
            labels = tagToApply.map(t => (t || '').trim()).filter(Boolean);
        } else if (typeof tagToApply === 'string' && tagToApply.trim()) {
            labels = [tagToApply.trim()];
        } else {
            const fallback = (customBulkTag || selectedBulkTag || '').trim();
            if (fallback) labels = [fallback];
        }

        if (labels.length === 0) {
            toast.error('Informe ou selecione ao menos uma etiqueta.');
            return;
        }
        if (!engine.selectedConvoIds.length && !selectAllPages) return;

        setIsApplyingBulkTag(true);
        const payload = {
            ...getBulkPayloadExtra(),
            labels,
            target
        };

        const targetLabel = target === 'contacts' ? 'na Aba de Contatos' : 'no Chat';
        const labelDisplay = labels.length === 1 ? `etiqueta "${labels[0]}"` : `${labels.length} etiquetas`;
        const toastId = toast.loading(`Aplicando ${labelDisplay} ${targetLabel}...`);
        try {
            const res = await fetchWithAuth(`${API_URL}/chat/conversations/bulk-tag`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }, activeClient?.id);

            if (res.ok) {
                const data = await res.json();
                const unitName = target === 'contacts' ? 'contato(s) na Aba de Contatos' : 'conversa(s) no Chat';
                toast.success(`${labelDisplay} aplicada(s) em ${data.updated_count || 0} ${unitName}!`, { id: toastId });
                setIsBulkTagModalOpen(false);
                setSelectedBulkTag('');
                setCustomBulkTag('');
                engine.setSelectedConvoIds([]);
                setSelectAllPages(false);
                engine.loadConversations(true);
                engine.loadAvailableLabels();
            } else {
                const errData = await res.json().catch(() => ({}));
                toast.error(errData.detail || 'Erro ao aplicar etiqueta.', { id: toastId });
            }
        } catch {
            toast.error('Erro de conexão ao aplicar etiqueta.', { id: toastId });
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
