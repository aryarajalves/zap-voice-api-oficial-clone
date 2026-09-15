import { toast } from 'react-hot-toast';
import { fetchWithAuth } from '../../../../AuthContext';
import { API_URL } from '../../../../config';

export function useChatMessageActionsOperations({ selectedConvo, setSelectedConvo, activeClient, engine }) {
    const handleTogglePinMessage = async (msg) => {
        if (!selectedConvo || !msg || !activeClient) return;
        try {
            const res = await fetchWithAuth(
                `${API_URL}/chat/conversations/${selectedConvo.id}/messages/${msg.id}/pin`,
                { method: 'POST' },
                activeClient.id
            );
            if (res.ok) {
                const data = await res.json();
                const newPinnedId = data.pinned_message_id;
                setSelectedConvo(prev => prev ? { ...prev, pinned_message_id: newPinnedId } : prev);
                engine.setConversations(prev => prev.map(c => c.id === selectedConvo.id ? { ...c, pinned_message_id: newPinnedId } : c));
                toast.success(data.action === 'pinned' ? 'Mensagem fixada no topo!' : 'Mensagem desafixada.');
            } else {
                toast.error('Erro ao fixar mensagem.');
            }
        } catch {
            toast.error('Falha de conexão ao fixar mensagem.');
        }
    };

    const handleToggleStarMessage = async (msg) => {
        if (!selectedConvo || !msg || !activeClient) return;
        try {
            const res = await fetchWithAuth(
                `${API_URL}/chat/conversations/${selectedConvo.id}/messages/${msg.id}/star`,
                { method: 'POST' },
                activeClient.id
            );
            if (res.ok) {
                const data = await res.json();
                const isStarred = data.is_starred;
                engine.setMessages(prev => prev.map(m => m.id === msg.id ? {
                    ...m,
                    is_starred: isStarred,
                    meta_data: { ...(m.meta_data || {}), is_starred: isStarred }
                } : m));
                toast.success(isStarred ? 'Mensagem favoritada! ⭐' : 'Mensagem removida dos favoritos.');
            } else {
                toast.error('Erro ao favoritar mensagem.');
            }
        } catch {
            toast.error('Falha de conexão ao favoritar mensagem.');
        }
    };

    const handleCopyMessageContent = async (msg) => {
        if (!msg) return;
        let textToCopy = msg.content || '';
        if (!textToCopy && msg.media_url) textToCopy = msg.media_url;
        if (!textToCopy) {
            toast.error('Nenhum conteúdo para copiar.');
            return;
        }
        try {
            if (navigator?.clipboard?.writeText) {
                await navigator.clipboard.writeText(textToCopy);
            } else {
                const textArea = document.createElement('textarea');
                textArea.value = textToCopy;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
            toast.success('Mensagem copiada com sucesso!');
        } catch {
            toast.error('Não foi possível copiar o texto.');
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

    const handleRetryTemplateMessage = async (msg) => {
        if (!selectedConvo || !msg || !activeClient) return false;
        try {
            const res = await fetchWithAuth(
                `${API_URL}/chat/conversations/${selectedConvo.id}/messages/${msg.id}/retry-template`,
                { method: 'POST' },
                activeClient.id
            );
            if (res.ok) {
                const data = await res.json();
                toast.success(data.message || 'Template redisparado com sucesso!');
                engine.setMessages(prev => prev.map(m => {
                    if (m.id === msg.id) {
                        const curMeta = { ...(m.meta_data || {}) };
                        curMeta.status = 'sent';
                        delete curMeta.failure_reason;
                        curMeta.can_retry = false;
                        return { ...m, meta_data: curMeta, wa_message_id: data.wa_message_id || m.wa_message_id };
                    }
                    return m;
                }));
                return true;
            } else {
                const errData = await res.json().catch(() => ({}));
                toast.error(errData.detail || 'Erro ao redisparar template.');
                return false;
            }
        } catch (err) {
            console.error('Erro ao redisparar template:', err);
            toast.error('Falha de rede ao redisparar template.');
            return false;
        }
    };

    return {
        handleTogglePinMessage,
        handleToggleStarMessage,
        handleCopyMessageContent,
        handleResendToAgentFlow,
        handleRetryTemplateMessage
    };
}
