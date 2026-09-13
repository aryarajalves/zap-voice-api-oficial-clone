/**
 * Normaliza reações brutas da mensagem para uma lista homogênea de objetos { sender, emoji }.
 * @param {Array|Object|null} raw 
 * @returns {Array<{sender?: string, emoji: string}>}
 */
export const getReactionsList = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.filter(r => r && r.emoji);
    if (typeof raw === 'object') {
        return Object.entries(raw).map(([sender, val]) => {
            if (typeof val === 'object' && val !== null && val.emoji) return val;
            if (typeof val === 'string' && val) return { sender, emoji: val };
            return null;
        }).filter(Boolean);
    }
    return [];
};
