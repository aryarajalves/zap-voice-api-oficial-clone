import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { fetchWithAuth } from '../../../AuthContext';
import { API_URL } from '../../../config';

export function useChatOperations({
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
    setSelectAllPages
}) {
    const [pipelineTrigger, setPipelineTrigger] = useState(null);
    const [isLoadingPipeline, setIsLoadingPipeline] = useState(false);
    const [isBulkTagModalOpen, setIsBulkTagModalOpen] = useState(false);
    const [selectedBulkTag, setSelectedBulkTag] = useState('');
    const [customBulkTag, setCustomBulkTag] = useState('');
    const [isApplyingBulkTag, setIsApplyingBulkTag] = useState(false);

    const handleOpenActiveFunnelPipeline = async () => {
        if (!selectedConvo?.active_funnel) return;
        const triggerId = selectedConvo.active_funnel.trigger_id;
        setIsLoadingPipeline(true);
        try {
            if (triggerId) {
                const res = await fetchWithAuth(`${API_URL}/triggers/${triggerId}`, {}, activeClient?.id);
                if (res.ok) {
                    const data = await res.json();
                    setPipelineTrigger(data);
                    return;
                }
            }

            const phoneDigits = (selectedConvo.phone || "").replace(/\D/g, '');
            const searchParam = phoneDigits.length >= 8 ? phoneDigits.slice(-8) : phoneDigits;
            const resSearch = await fetchWithAuth(`${API_URL}/triggers?search=${encodeURIComponent(searchParam)}&limit=10`, {}, activeClient?.id);
            if (resSearch.ok) {
                const listData = await resSearch.json();
                const triggers = listData.triggers || listData.items || listData || [];
                const activeTrig = Array.isArray(triggers) ? triggers.find(t => 
                    ['queued', 'processing', 'paused_waiting_delivery', 'suspended'].includes(t.status)
                ) || triggers[0] : null;

                if (activeTrig) {
                    const fullRes = await fetchWithAuth(`${API_URL}/triggers/${activeTrig.id}`, {}, activeClient?.id);
                    if (fullRes.ok) {
                        const fullData = await fullRes.json();
                        setPipelineTrigger(fullData);
                        return;
                    }
                    setPipelineTrigger(activeTrig);
                    return;
                }
            }
            toast.error("Não foi possível carregar o pipeline do funil ativo.");
        } catch (err) {
            console.error("Erro ao carregar pipeline:", err);
            toast.error("Erro de conexão ao carregar pipeline.");
        } finally {
            setIsLoadingPipeline(false);
        }
    };

    const handleAddTagWithName = async (tagName, customColor = null) => {
        if (!tagName || !tagName.trim() || !selectedConvo) return;
        const cleanTag = tagName.trim().slice(0, 20);
        const currentTags = selectedConvo.labels || [];

        if (currentTags.map(t => t.toLowerCase()).includes(cleanTag.toLowerCase())) {
            toast.error('Esta etiqueta já foi adicionada.');
            return;
        }

        if (customColor) {
            try {
                await fetchWithAuth(`${API_URL}/chat/labels`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: cleanTag, color: customColor })
                }, activeClient.id);
            } catch (err) {
                console.error('Erro ao registrar nova etiqueta:', err);
            }
        }

        const updatedTags = [...currentTags, cleanTag];
        try {
            const res = await fetchWithAuth(`${API_URL}/chat/conversations/${selectedConvo.id}/labels`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ labels: updatedTags })
            }, activeClient.id);

            if (res.ok) {
                setSelectedConvo(prev => ({ ...prev, labels: updatedTags }));
                engine.setTagSearchQuery('');
                engine.loadConversations();
                engine.loadAvailableLabels();
                toast.success('Etiqueta adicionada!');
            }
        } catch (err) {
            toast.error('Erro ao adicionar etiqueta.');
        }
    };

    const handleRemoveTag = async (tagToRemove) => {
        if (!selectedConvo) return;
        const updatedTags = (selectedConvo.labels || []).filter(t => t !== tagToRemove);
        try {
            const res = await fetchWithAuth(`${API_URL}/chat/conversations/${selectedConvo.id}/labels`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ labels: updatedTags })
            }, activeClient.id);

            if (res.ok) {
                setSelectedConvo(prev => ({ ...prev, labels: updatedTags }));
                engine.loadConversations();
                engine.loadAvailableLabels();
                toast.success('Etiqueta removida.');
            }
        } catch (err) {
            toast.error('Erro ao remover etiqueta.');
        }
    };

    const handleTogglePin = async () => {
        if (!selectedConvo) return;
        const newPinned = !selectedConvo.pinned;
        try {
            const res = await fetchWithAuth(`${API_URL}/chat/conversations/${selectedConvo.id}/pin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pinned: newPinned })
            }, activeClient.id);

            if (res.ok) {
                setSelectedConvo(prev => ({ ...prev, pinned: newPinned }));
                engine.setConversations(prev => prev.map(c => c.id === selectedConvo.id ? { ...c, pinned: newPinned } : c));
                toast.success(newPinned ? 'Conversa fixada!' : 'Conversa desafixada.');
                engine.loadConversations();
            }
        } catch (err) {
            toast.error('Erro ao fixar conversa.');
        }
    };

    const handleToggleUrgent = async () => {
        if (!selectedConvo) return;
        const newUrgent = !selectedConvo.urgent;
        try {
            const res = await fetchWithAuth(`${API_URL}/chat/conversations/${selectedConvo.id}/urgent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ urgent: newUrgent })
            }, activeClient.id);

            if (res.ok) {
                setSelectedConvo(prev => ({ ...prev, urgent: newUrgent }));
                engine.setConversations(prev => prev.map(c => c.id === selectedConvo.id ? { ...c, urgent: newUrgent } : c));
                toast.success(newUrgent ? 'Contato marcado como urgente!' : 'Marcação de urgência removida.');
                engine.loadConversations();
            }
        } catch (err) {
            toast.error('Erro ao atualizar marcação de urgência.');
        }
    };

    const handleResendToAgentFlow = async (messageId, editedContent) => {
        if (!activeClient) return;
        try {
            const res = await fetchWithAuth(`${API_URL}/chat/messages/${messageId}/resend-agentflow`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content: editedContent })
            }, activeClient.id);
            if (res.ok) {
                toast.success('Reenvio ao AgentFlow iniciado!');
            } else {
                const errData = await res.json();
                toast.error(errData.detail || 'Erro ao reenviar ao AgentFlow.');
            }
        } catch (err) {
            toast.error('Falha de rede ao reenviar mensagem.');
        }
    };

    const handleConfirmBlockContact = async (type, hours) => {
        if (!selectedConvo || !activeClient) return;
        engine.setIsBlockingContact(true);
        try {
            const endpoint = type === 'resting' ? `${API_URL}/resting/` : `${API_URL}/blocked/`;
            const body = type === 'resting'
                ? { phone: selectedConvo.phone, name: selectedConvo.contact_name, reason: 'Bloqueado via Atendimento', hours }
                : { phone: selectedConvo.phone, name: selectedConvo.contact_name, reason: 'Bloqueado via Atendimento' };

            const res = await fetchWithAuth(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            }, activeClient.id);

            if (res.ok) {
                toast.success(type === 'resting' ? 'Contato em repouso.' : 'Contato bloqueado.');
                engine.setIsBlockModalOpen(false);
                setSelectedConvo(prev => prev ? { ...prev, block_status: type === 'resting' ? 'resting' : 'blocked' } : prev);
                engine.setConversations(prev => prev.map(c => c.id === selectedConvo.id ? { ...c, block_status: type === 'resting' ? 'resting' : 'blocked' } : c));
                engine.loadConversations(false);
            }
        } catch (err) {
            toast.error('Erro ao bloquear contato.');
        } finally {
            engine.setIsBlockingContact(false);
        }
    };

    const handleUnblockContact = async () => {
        if (!selectedConvo || !activeClient) return;
        const currentStatus = selectedConvo.block_status;
        if (!currentStatus || currentStatus === 'none') return;

        const isResting = currentStatus === 'resting';
        const endpoint = isResting 
            ? `${API_URL}/resting/by_phone/${selectedConvo.phone}`
            : `${API_URL}/blocked/by_phone/${selectedConvo.phone}`;

        const loadingToast = toast.loading(isResting ? 'Removendo do repouso...' : 'Desbloqueando contato...');
        try {
            const res = await fetchWithAuth(endpoint, {
                method: 'DELETE'
            }, activeClient.id);

            if (res.ok) {
                toast.dismiss(loadingToast);
                toast.success(isResting ? 'Contato removido do repouso!' : 'Contato desbloqueado!');
                setSelectedConvo(prev => prev ? { ...prev, block_status: null } : prev);
                engine.setConversations(prev => prev.map(c => c.id === selectedConvo.id ? { ...c, block_status: null } : c));
                engine.loadConversations(false);
            } else {
                throw new Error();
            }
        } catch (err) {
            toast.dismiss(loadingToast);
            toast.error('Falha ao desbloquear o contato.');
        }
    };

    const handleSaveNote = async () => {
        if (!selectedConvo) return;
        engine.setIsSavingNote(true);
        try {
            const res = await fetchWithAuth(`${API_URL}/chat/conversations/${selectedConvo.id}/note`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ private_note: engine.privateNote })
            }, activeClient.id);

            if (res.ok) {
                const data = await res.json();
                setSelectedConvo(prev => ({ ...prev, private_note: engine.privateNote }));
                engine.setConversations(prev => prev.map(c => c.id === selectedConvo.id ? { ...c, private_note: engine.privateNote } : c));
                if (data.message) {
                    engine.setMessages(prev => [...prev, data.message]);
                    engine.setShouldScrollToBottom(true);
                }
                engine.setPrivateNote('');
                toast.success('Anotação privada salva!');
            }
        } catch (err) {
            toast.error('Erro ao salvar anotação.');
        } finally {
            engine.setIsSavingNote(false);
        }
    };

    const handleClearConversationMessages = async (convoId) => {
        if (!convoId || !activeClient) return;
        engine.setIsClearingChat(true);
        try {
            const res = await fetchWithAuth(`${API_URL}/chat/conversations/${convoId}/messages`, {
                method: 'DELETE'
            }, activeClient.id);

            if (res.ok) {
                engine.setMessages([]);
                engine.setConversations(prev => prev.map(c => c.id === convoId ? { ...c, last_message_content: null, unread_count: 0 } : c));
                if (selectedConvo?.id === convoId) {
                    setSelectedConvo(prev => prev ? { ...prev, last_message_content: null, unread_count: 0 } : prev);
                }
                toast.success('Conversa limpa com sucesso!');
                engine.setIsClearChatModalOpen(false);
            } else {
                const data = await res.json().catch(() => ({}));
                toast.error(data.detail || 'Erro ao limpar mensagens da conversa.');
            }
        } catch {
            toast.error('Erro de conexão ao limpar conversa.');
        } finally {
            engine.setIsClearingChat(false);
        }
    };

    const handleDeleteConversation = async (convoId) => {
        try {
            const res = await fetchWithAuth(`${API_URL}/chat/conversations/${convoId}`, { method: 'DELETE' }, activeClient?.id);
            if (res.ok) {
                engine.setConversations(prev => prev.filter(c => c.id !== convoId));
                engine.setSelectedConvoIds(prev => prev.filter(id => id !== convoId));
                if (selectedConvo?.id === convoId) setSelectedConvo(null);
                toast.success('Conversa deletada.');
            }
        } catch {
            toast.error('Erro ao deletar.');
        } finally {
            engine.setConfirmDeleteConvos(null);
            engine.setDeletingConvoId(null);
        }
    };

    const handleDeleteSelectedConversations = async () => {
        if (!engine.selectedConvoIds.length && !selectAllPages) return;
        
        const payload = selectAllPages ? {
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
            has_replied: filterHasReplied || undefined
        } : {
            ids: engine.selectedConvoIds
        };

        const toastId = toast.loading(selectAllPages ? 'Deletando todas as conversas selecionadas...' : 'Deletando conversas selecionadas...');
        try {
            const res = await fetchWithAuth(`${API_URL}/chat/conversations`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }, activeClient?.id);
            if (res.ok) {
                if (selectAllPages) {
                    engine.setConversations([]);
                    setSelectedConvo(null);
                    engine.setSelectedConvoIds([]);
                    setSelectAllPages(false);
                    engine.loadConversations(true);
                } else {
                    engine.setConversations(prev => prev.filter(c => !engine.selectedConvoIds.includes(c.id)));
                    if (engine.selectedConvoIds.includes(selectedConvo?.id)) setSelectedConvo(null);
                    engine.setSelectedConvoIds([]);
                }
                toast.success('Conversas deletadas com sucesso!', { id: toastId });
            } else {
                const errData = await res.json();
                toast.error(errData.detail || 'Erro ao deletar conversas.', { id: toastId });
            }
        } catch {
            toast.error('Erro ao deletar.', { id: toastId });
        } finally {
            engine.setConfirmDeleteConvos(null);
        }
    };

    const handleBulkTagConversations = async (tagToApply) => {
        const label = (tagToApply || customBulkTag || selectedBulkTag || '').trim();
        if (!label) {
            toast.error('Informe ou selecione uma etiqueta.');
            return;
        }
        if (!engine.selectedConvoIds.length && !selectAllPages) return;

        setIsApplyingBulkTag(true);
        const payload = selectAllPages ? {
            select_all_pages: true,
            labels: [label],
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
            labels: [label],
            ids: engine.selectedConvoIds
        };

        const toastId = toast.loading(`Aplicando etiqueta "${label}"...`);
        try {
            const res = await fetchWithAuth(`${API_URL}/chat/conversations/bulk-tag`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }, activeClient?.id);

            if (res.ok) {
                const data = await res.json();
                toast.success(`Etiqueta "${label}" aplicada em ${data.updated_count || 0} conversa(s)!`, { id: toastId });
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
        pipelineTrigger,
        setPipelineTrigger,
        isLoadingPipeline,
        handleOpenActiveFunnelPipeline,
        handleAddTagWithName,
        handleRemoveTag,
        handleTogglePin,
        handleToggleUrgent,
        handleResendToAgentFlow,
        handleConfirmBlockContact,
        handleUnblockContact,
        handleSaveNote,
        handleClearConversationMessages,
        handleDeleteConversation,
        handleDeleteSelectedConversations,
        isBulkTagModalOpen,
        setIsBulkTagModalOpen,
        selectedBulkTag,
        setSelectedBulkTag,
        customBulkTag,
        setCustomBulkTag,
        isApplyingBulkTag,
        handleBulkTagConversations
    };
}
