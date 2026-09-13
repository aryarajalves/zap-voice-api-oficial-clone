import { useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../../config';
import { fetchWithAuth } from '../../../AuthContext';

export function useChatConversationOpen({
  activeClient,
  conversations,
  setConversations,
  setSelectedConvo
}) {
  const openConversationById = useCallback(async (convoId) => {
    if (!convoId || !activeClient?.id) return;
    const targetId = Number(convoId);

    // 1. Procura na lista local em memória
    const existing = conversations.find(c => Number(c.id) === targetId);
    if (existing) {
      setSelectedConvo(existing);
      const name = existing.contact_name || existing.phone || `#${targetId}`;
      toast.success(`Abrindo conversa de ${name}`);
      return;
    }

    // 2. Se não estiver na lista visível, busca via API
    try {
      const res = await fetchWithAuth(`${API_URL}/chat/conversations/${targetId}`, {}, activeClient.id);
      if (res.ok) {
        const convoData = await res.json();
        setConversations(prev => [convoData, ...prev.filter(c => Number(c.id) !== targetId)]);
        setSelectedConvo(convoData);
        const name = convoData.contact_name || convoData.phone || `#${targetId}`;
        toast.success(`Abrindo conversa de ${name}`);
      } else {
        toast.error(`Conversa #${targetId} não encontrada.`);
      }
    } catch (err) {
      toast.error('Erro ao abrir conversa mencionada.');
    }
  }, [activeClient?.id, conversations, setConversations, setSelectedConvo]);

  return { openConversationById };
}
