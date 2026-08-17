import { toast } from 'react-hot-toast';
import { fetchWithAuth } from '../../../AuthContext';
import { API_URL } from '../../../config';

export function useChatFunnelAndStatus({
  activeClient,
  selectedConvo,
  setSelectedConvo,
  loadConversations,
  isSending,
  setIsSending,
  setTimeLeft24h
}) {
  const handleToggleStatus = async () => {
    if (!selectedConvo) return;
    const newStatus = selectedConvo.status === 'open' ? 'resolved' : 'open';
    const loadingToast = toast.loading(newStatus === 'resolved' ? 'Resolvendo conversa...' : 'Reabrindo conversa...');
    try {
      const res = await fetchWithAuth(`${API_URL}/chat/conversations/${selectedConvo.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      }, activeClient.id);

      if (res.ok) {
        toast.dismiss(loadingToast);
        toast.success(newStatus === 'resolved' ? 'Conversa resolvida!' : 'Conversa reaberta!');
        setSelectedConvo(prev => ({ ...prev, status: newStatus }));
        loadConversations();
      } else {
        throw new Error();
      }
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error('Falha ao atualizar status da conversa.');
    }
  };

  const handleTriggerFunnel = async (funnelId) => {
    if (!selectedConvo || isSending) return false;
    setIsSending(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/chat/conversations/${selectedConvo.id}/funnel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ funnel_id: funnelId })
      }, activeClient.id);

      if (res.ok) {
        const data = await res.json();
        toast.success(`Funil "${data.funnel_name}" iniciado com sucesso!`);
        setSelectedConvo(prev => prev ? { 
          ...prev, 
          active_funnel: { id: data.funnel_id, trigger_id: data.trigger_id, name: data.funnel_name, status: data.trigger_status } 
        } : prev);
        await loadConversations();
        return true;
      } else {
        const errData = await res.json();
        toast.error(errData.detail || 'Erro ao iniciar funil.');
        return false;
      }
    } catch (err) {
      toast.error('Erro de conexão ao iniciar funil.');
      return false;
    } finally {
      setIsSending(false);
    }
  };

  const handleCancelFunnel = async () => {
    if (!selectedConvo || isSending) return false;
    setIsSending(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/chat/conversations/${selectedConvo.id}/cancel-funnel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, activeClient.id);

      if (res.ok) {
        toast.success('Execução do funil cancelada com sucesso!');
        setSelectedConvo(prev => prev ? { ...prev, active_funnel: null } : prev);
        await loadConversations();
        return true;
      } else {
        const errData = await res.json();
        toast.error(errData.detail || 'Erro ao cancelar execução do funil.');
        return false;
      }
    } catch (err) {
      toast.error('Erro de conexão ao cancelar funil.');
      return false;
    } finally {
      setIsSending(false);
    }
  };

  const handleClose24hWindow = async (convoToClose = selectedConvo, setConvo = setSelectedConvo) => {
    if (!convoToClose || !activeClient) return;
    try {
      const res = await fetchWithAuth(
        `${API_URL}/chat/conversations/${convoToClose.id}/reset-24h-window`,
        { method: 'POST' },
        activeClient.id
      );
      if (res.ok) {
        const data = await res.json();
        toast.success("Janela de 24h encerrada para testes!");
        setTimeLeft24h('Janela Fechada');
        if (setConvo) {
          setConvo(prev => prev ? {
            ...prev,
            last_contact_message_at: null,
            labels: data.conversation?.labels || prev.labels
          } : prev);
        }
        loadConversations();
      } else {
        const errData = await res.json();
        toast.error(errData.detail || "Erro ao encerrar janela de 24h.");
      }
    } catch (err) {
      toast.error("Erro de conexão ao encerrar janela de 24h.");
    }
  };

  return {
    handleToggleStatus,
    handleTriggerFunnel,
    handleCancelFunnel,
    handleClose24hWindow
  };
}
