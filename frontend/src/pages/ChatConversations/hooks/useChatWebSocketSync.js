import { useEffect } from 'react';
import { WS_URL } from '../../../config';
import { appendOrUpdateMessage } from '../utils/messageDeduplicator';

export function useChatWebSocketSync({
  activeClient,
  selectedConvo,
  setSelectedConvo,
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

                // Se for mensagem de sistema adicionando marcadores, extrai e atualiza badges de etiquetas imediatamente
                const isLabelSystemMsg = msg.sender_type === 'system' &&
                  typeof msg.content === 'string' &&
                  (msg.content.includes('adicionado(s)') || msg.content.includes('adicionou marcador'));

                if (isLabelSystemMsg) {
                  const matches = msg.content.match(/'([^']+)'/g);
                  if (matches) {
                    const newTags = matches.map(m => m.replace(/'/g, '').trim()).filter(Boolean);
                    if (newTags.length > 0) {
                      setSelectedConvo(prev => {
                        if (!prev) return prev;
                        const current = prev.labels || [];
                        const merged = Array.from(new Set([...current, ...newTags]));
                        return { ...prev, labels: merged };
                      });
                      setConversations(prev => {
                        const index = prev.findIndex(c => Number(c.id) === convoId);
                        if (index !== -1) {
                          const updated = [...prev];
                          const curLabels = updated[index].labels || [];
                          updated[index] = {
                            ...updated[index],
                            labels: Array.from(new Set([...curLabels, ...newTags]))
                          };
                          return updated;
                        }
                        return prev;
                      });
                    }
                  }
                }
              }
            } else if (evtName === 'conversation_updated' || data.event === 'conversation_updated') {
              const convoId = Number(payload.id || payload.conversation_id);
              if (convoId) {
                setConversations(prev => {
                  const index = prev.findIndex(c => Number(c.id) === convoId);
                  if (index !== -1) {
                    const updated = [...prev];
                    updated[index] = { ...updated[index], ...payload };
                    return updated;
                  }
                  return prev;
                });

                if (selectedConvo?.id && Number(selectedConvo.id) === convoId) {
                  setSelectedConvo(prev => prev ? ({
                    ...prev,
                    ...payload,
                    labels: payload.labels || prev.labels
                  }) : prev);
                }
              }
            } else if (evtName === 'message_reaction_updated' || data.event === 'message_reaction_updated') {
              const convoId = Number(payload.conversation_id);
              const targetMsgId = payload.message_id;
              const targetWaId = payload.wa_message_id;
              const metaData = payload.meta_data;
              const newLastContactAt = payload.last_contact_message_at;
              const newLastMessageAt = payload.last_message_at;
              const newStatus = payload.status;

              // 1. Atualiza lista de conversas com o novo timestamp da janela de 24h
              setConversations(prev => {
                const index = prev.findIndex(c => Number(c.id) === convoId);
                if (index !== -1) {
                  const updated = [...prev];
                  const target = { ...updated[index] };
                  if (newLastContactAt) target.last_contact_message_at = newLastContactAt;
                  if (newLastMessageAt) target.last_message_at = newLastMessageAt;
                  if (newStatus) target.status = newStatus;
                  updated[index] = target;
                  return updated;
                }
                return prev;
              });

              // 2. Se a conversa recebida for a selecionada atualmente
              if (selectedConvo?.id && Number(selectedConvo.id) === convoId) {
                // Atualiza last_contact_message_at para resetar o timer da janela de 24h imediatamente na interface
                if (newLastContactAt && setSelectedConvo) {
                  setSelectedConvo(prev => prev ? ({
                    ...prev,
                    last_contact_message_at: newLastContactAt,
                    ...(newStatus ? { status: newStatus } : {})
                  }) : prev);
                }

                // Atualiza as reações da mensagem na listagem de mensagens
                if (metaData && (targetMsgId || targetWaId)) {
                  setMessages(prev => prev.map(m => {
                    const matchId = targetMsgId && Number(m.id) === Number(targetMsgId);
                    const matchWaId = targetWaId && (
                      m.wa_message_id === targetWaId ||
                      m.wa_message_id === String(targetWaId).replace('wamid.', '') ||
                      `wamid.${m.wa_message_id}` === targetWaId
                    );
                    if (matchId || matchWaId) {
                      return {
                        ...m,
                        meta_data: {
                          ...(m.meta_data || {}),
                          reactions: metaData.reactions || []
                        }
                      };
                    }
                    return m;
                  }));
                }
              }
            } else if (evtName === 'message_status_updated' || data.event === 'message_status_updated') {
              const convoId = Number(payload.conversation_id);
              const targetMsgId = payload.message_id;
              const targetWaId = payload.wa_message_id;
              const newStatus = payload.status;

              if (selectedConvo?.id && Number(selectedConvo.id) === convoId) {
                setMessages(prev => prev.map(m => {
                  const matchId = targetMsgId && Number(m.id) === Number(targetMsgId);
                  const matchWaId = targetWaId && (
                    m.wa_message_id === targetWaId ||
                    m.wa_message_id === String(targetWaId).replace('wamid.', '') ||
                    `wamid.${m.wa_message_id}` === targetWaId
                  );
                  if (matchId || matchWaId) {
                    return {
                      ...m,
                      status: newStatus,
                      meta_data: {
                        ...(m.meta_data || {}),
                        status: newStatus
                      }
                    };
                  }
                  return m;
                }));
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
