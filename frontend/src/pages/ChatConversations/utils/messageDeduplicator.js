/**
 * Adiciona ou atualiza uma mensagem em uma lista de mensagens garantindo deduplicação estrita.
 * Evita duplicações visuais entre a resposta da mutação HTTP e eventos de broadcast WebSocket.
 * 
 * @param {Array} prevMessages - Lista anterior de mensagens
 * @param {Object} newMsg - Nova mensagem recebida (via HTTP ou WebSocket)
 * @returns {Array} - Nova lista de mensagens sem duplicatas
 */
export function appendOrUpdateMessage(prevMessages, newMsg) {
    if (!Array.isArray(prevMessages)) return newMsg ? [newMsg] : [];
    if (!newMsg) return prevMessages;

    const newIdStr = newMsg.id != null ? String(newMsg.id) : null;
    const newWaId = newMsg.wa_message_id ? String(newMsg.wa_message_id) : null;

    const existingIndex = prevMessages.findIndex(m => {
        if (!m) return false;
        
        // 1. Match exato por ID do banco
        if (newIdStr && m.id != null && String(m.id) === newIdStr) {
            return true;
        }

        // 2. Match por WhatsApp Message ID
        if (newWaId && m.wa_message_id && String(m.wa_message_id) === newWaId) {
            return true;
        }

        // 3. Match de envio recente (mesmo remetente, tipo, conteúdo, mídia e timestamp próximo)
        if (
            m.sender_type === newMsg.sender_type &&
            m.message_type === newMsg.message_type &&
            (m.content || '') === (newMsg.content || '') &&
            (m.media_url || '') === (newMsg.media_url || '')
        ) {
            const timeA = m.timestamp ? new Date(m.timestamp).getTime() : 0;
            const timeB = newMsg.timestamp ? new Date(newMsg.timestamp).getTime() : 0;
            if (timeA && timeB && Math.abs(timeA - timeB) < 6000) {
                return true;
            }
        }

        return false;
    });

    if (existingIndex !== -1) {
        const updated = [...prevMessages];
        updated[existingIndex] = { ...updated[existingIndex], ...newMsg };
        return updated;
    }

    return [...prevMessages, newMsg];
}
