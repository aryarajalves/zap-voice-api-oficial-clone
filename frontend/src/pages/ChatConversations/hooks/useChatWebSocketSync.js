import { useEffect } from 'react';
import { WS_URL } from '../../../config';
import { appendOrUpdateMessage } from '../utils/messageDeduplicator';

export function useChatWebSocketSync({
  activeClient,
  selectedConvo,
  setConversations,
  setMessages,
  setShouldScrollToBottom,
  loadConversationMedia
}) {
  useEffect(() => {
    if (!activeClient?.id) return;

    let ws = null;
    let reconnectTimeout = null;

    const connectWs = () => {
      try {
        const wsBase = WS_URL.endsWith('/ws') ? WS_URL : `${WS_URL}/ws`;
        const token = localStorage.getItem('token') || '';
        const wsUrl = token ? `${wsBase}?token=${token}` : wsBase;

        ws = new WebSocket(wsUrl);

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            const evtName = data.event || data.type;
            const payload = data.data || data.payload || data;

            if (payload?.client_id && String(payload.client_id) !== String(activeClient.id)) {
              return;
            }

            if (evtName === 'new_message' || data.event === 'new_message') {
              const msg = payload.id ? payload : (data.payload || data);
              const convoId = Number(msg.conversation_id);

              // 1. Atualiza lista de conversas
              setConversations(prev => {
                const index = prev.findIndex(c => Number(c.id) === convoId);
                if (index !== -1) {
                  const updated = [...prev];
                  const target = { ...updated[index] };
                  target.last_message_content = msg.content || (msg.media_url ? '[Mídia]' : '');
                  target.last_message_at = msg.timestamp || new Date().toISOString();
                  if (Number(selectedConvo?.id) !== convoId && msg.sender_type === 'contact') {
                    target.unread_count = (target.unread_count || 0) + 1;
                  }
                  updated.splice(index, 1);
                  return [target, ...updated];
                }
                return prev;
              });

              // 2. Se a conversa recebida for a selecionada atualmente
              if (selectedConvo?.id && Number(selectedConvo.id) === convoId) {
                setMessages(prev => appendOrUpdateMessage(prev, msg));
                setShouldScrollToBottom(true);

                // SE tiver mídia, link, documento ou anotação privada, atualiza mediaData na hora!
                const isMediaMsg = msg.media_url ||
                  ['image', 'video', 'document', 'audio', 'voice'].includes(msg.message_type) ||
                  (typeof msg.content === 'string' && (msg.content.includes('http://') || msg.content.includes('https://') || msg.content.includes('www.'))) ||
                  (msg.meta_data && msg.meta_data.header);

                const isNoteMsg = msg.sender_type === 'system' &&
                  typeof msg.content === 'string' &&
                  (msg.content.includes('Anotação Privada:') || msg.content.includes('Nota:'));

                if (isMediaMsg || isNoteMsg) {
                  loadConversationMedia(selectedConvo.id);
                }
              }
            }
          } catch (err) {
            console.error('Erro ao processar mensagem do WebSocket no Chat:', err);
          }
        };

        ws.onclose = () => {
          reconnectTimeout = setTimeout(connectWs, 3000);
        };

        ws.onerror = () => {
          if (ws) ws.close();
        };
      } catch (err) {
        console.error('Falha ao conectar WebSocket no Chat:', err);
      }
    };

    connectWs();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeClient?.id, selectedConvo?.id]);
}
