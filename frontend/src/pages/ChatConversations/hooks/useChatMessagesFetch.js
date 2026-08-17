import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { fetchWithAuth } from '../../../AuthContext';
import { API_URL } from '../../../config';
import { appendOrUpdateMessage } from '../utils/messageDeduplicator';

export function useChatMessagesFetch({
  activeClient,
  selectedConvo,
  setSelectedConvo,
  setConversations,
  setShouldScrollToBottom
}) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isLoadingMoreMessages, setIsLoadingMoreMessages] = useState(false);

  const loadMessages = async (convoId, showLoading = false) => {
    if (!activeClient || !convoId) return;
    if (showLoading) {
      setIsLoadingMessages(true);
      setHasMoreMessages(true);
    }
    try {
      const limitVal = 50;
      const res = await fetchWithAuth(`${API_URL}/chat/conversations/${convoId}/messages?limit=${limitVal}`, {}, activeClient.id);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
        if (data.length < limitVal) {
          setHasMoreMessages(false);
        }
        if (showLoading) setShouldScrollToBottom(true);
      } else {
        setMessages([]);
      }
    } catch (err) {
      setMessages([]);
    } finally {
      if (showLoading) setIsLoadingMessages(false);
    }
  };

  const loadMoreMessages = async () => {
    if (!activeClient || !selectedConvo || isLoadingMoreMessages || !hasMoreMessages) return;
    if (messages.length === 0) return;
    
    setIsLoadingMoreMessages(true);
    try {
      const oldestMsgId = messages[0].id;
      const limitVal = 50;
      const res = await fetchWithAuth(
        `${API_URL}/chat/conversations/${selectedConvo.id}/messages?limit=${limitVal}&before_id=${oldestMsgId}`,
        {},
        activeClient.id
      );
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          setMessages(prev => [...data, ...prev]);
        }
        if (data.length < limitVal) {
          setHasMoreMessages(false);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar mais mensagens:", err);
    } finally {
      setIsLoadingMoreMessages(false);
    }
  };

  const handleSendMessage = async (e, options = {}) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !selectedConvo || isSending) return;

    setIsSending(true);
    const textToSend = newMessage;
    setNewMessage('');

    try {
      if (selectedConvo.status === 'resolved') {
        await fetchWithAuth(`${API_URL}/chat/conversations/${selectedConvo.id}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'open' })
        }, activeClient.id);
        setSelectedConvo(prev => ({ ...prev, status: 'open' }));
      }

      if (options?.splitLines) {
        const parts = textToSend.split('\n').map(p => p.trim()).filter(p => p !== '');
        if (parts.length === 0) {
          setIsSending(false);
          return;
        }

        for (let i = 0; i < parts.length; i++) {
          const contentPart = parts[i];
          const res = await fetchWithAuth(`${API_URL}/chat/conversations/${selectedConvo.id}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: contentPart })
          }, activeClient.id);

          if (res.ok) {
            const sentMsg = await res.json();
            setMessages(prev => appendOrUpdateMessage(prev, sentMsg));
            setShouldScrollToBottom(true);
            setConversations(prev => prev.map(c => 
              c.id === selectedConvo.id 
                ? { ...c, last_message_content: contentPart, last_message_at: new Date().toISOString(), status: 'open' } 
                : c
            ));
            
            if (i < parts.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 800));
            }
          } else {
            const errData = await res.json();
            toast.error(errData.detail || `Erro ao enviar parte ${i + 1} da mensagem.`);
          }
        }
      } else {
        const bodyPayload = { content: textToSend };
        if (options?.quotedWaMessageId) {
          bodyPayload.quoted_wa_message_id = options.quotedWaMessageId;
        }

        const res = await fetchWithAuth(`${API_URL}/chat/conversations/${selectedConvo.id}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload)
        }, activeClient.id);

        if (res.ok) {
          const sentMsg = await res.json();
          setMessages(prev => appendOrUpdateMessage(prev, sentMsg));
          setShouldScrollToBottom(true);
          setConversations(prev => prev.map(c => 
            c.id === selectedConvo.id 
              ? { ...c, last_message_content: textToSend, last_message_at: new Date().toISOString(), status: 'open' } 
              : c
          ));
        } else {
          const errData = await res.json();
          toast.error(errData.detail || 'Erro ao enviar mensagem.');
          setNewMessage(textToSend);
        }
      }
    } catch (err) {
      toast.error('Erro de conexão ao enviar mensagem.');
      setNewMessage(textToSend);
    } finally {
      setIsSending(false);
    }
  };

  const sendReaction = async (messageId, emoji) => {
    if (!selectedConvo || !selectedConvo.phone) {
      toast.error("Nenhuma conversa selecionada.");
      return;
    }

    const normalizeReactions = (rawReactions) => {
      if (Array.isArray(rawReactions)) return rawReactions.filter(Boolean);
      if (rawReactions && typeof rawReactions === 'object') {
        return Object.entries(rawReactions).map(([s, val]) => {
          if (typeof val === 'object' && val !== null && val.emoji) return val;
          if (typeof val === 'string' && val) return { sender: s, emoji: val };
          return null;
        }).filter(Boolean);
      }
      return [];
    };

    let previousMessages = null;
    setMessages(prev => {
      previousMessages = prev;
      return prev.map(m => {
        if (String(m.id) === String(messageId) || m.wa_message_id === messageId || m.wamid === messageId || m.message_id === messageId) {
          const meta = { ...(m.meta_data || {}) };
          const reactions = normalizeReactions(meta.reactions);
          const filtered = reactions.filter(r => r && r.sender !== 'agent');
          if (emoji) filtered.push({ sender: 'agent', emoji: emoji });
          meta.reactions = filtered;
          return { ...m, meta_data: meta };
        }
        return m;
      });
    });

    try {
      const res = await fetchWithAuth(`${API_URL}/chat/react`, {
        method: 'POST',
        body: JSON.stringify({
          phone: selectedConvo.phone,
          message_id: String(messageId),
          emoji: emoji
        })
      }, activeClient?.id);

      if (res.ok) {
        toast.success(emoji ? `Reação ${emoji} enviada!` : "Reação removida");
      } else {
        if (previousMessages) setMessages(previousMessages);
        const err = await res.json().catch(() => ({}));
        toast.error(err.detail || "Erro ao enviar reação.");
      }
    } catch (e) {
      if (previousMessages) setMessages(previousMessages);
      console.error("Erro ao reagir:", e);
      toast.error("Falha ao comunicar com o servidor.");
    }
  };

  return {
    messages,
    setMessages,
    newMessage,
    setNewMessage,
    isLoadingMessages,
    isSending,
    hasMoreMessages,
    isLoadingMoreMessages,
    loadMessages,
    loadMoreMessages,
    handleSendMessage,
    sendReaction
  };
}
