import { toast } from 'react-hot-toast';
import { fetchWithAuth } from '../../../../AuthContext';
import { API_URL } from '../../../../config';

export function useChatDeletionOperations({
    selectedConvo,
    setSelectedConvo,
    activeClient,
    engine,
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
    filterHasReplied,
    selectAllPages,
    setSelectAllPages
}) {
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

    return {
        handleClearConversationMessages,
        handleDeleteConversation,
        handleDeleteSelectedConversations
    };
}
