/**
 * Utilitários de data, formatação e sanitização para exportação de conversas.
 */

export const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

/**
 * Converte qualquer timestamp em objeto de data e strings formatadas.
 */
export function parseMessageDate(ts) {
    if (!ts) {
        return {
            dateObj: null,
            dateKey: 'Sem Data',
            dateLabel: 'Sem Data',
            timeStr: '',
            fullFormatted: ''
        };
    }

    let d = null;
    if (typeof ts === 'number') {
        d = new Date(ts > 1e11 ? ts : ts * 1000);
    } else if (typeof ts === 'string') {
        const trimmed = ts.trim();
        if (!isNaN(trimmed)) {
            const num = Number(trimmed);
            d = new Date(num > 1e11 ? num : num * 1000);
        } else {
            d = new Date(trimmed);
        }
    }

    if (!d || isNaN(d.getTime())) {
        return {
            dateObj: null,
            dateKey: 'Sem Data',
            dateLabel: 'Sem Data',
            timeStr: '',
            fullFormatted: String(ts || '')
        };
    }

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const dateKey = `${day}/${month}/${year}`;
    const dateLabel = `${day} de ${MONTH_NAMES[d.getMonth()]} de ${year}`;
    const timeStr = d.toLocaleTimeString('pt-BR');
    const fullFormatted = d.toLocaleString('pt-BR');

    return { dateObj: d, dateKey, dateLabel, timeStr, fullFormatted };
}

export function formatTimestamp(ts) {
    return parseMessageDate(ts).fullFormatted;
}

export function getSenderCategory(msg) {
    if (!msg) return 'contact';
    if (msg.sender_type === 'contact') return 'contact';
    if (msg.sender_type === 'user' || msg.sender_type === 'agent') return 'user';
    if (msg.sender_type === 'system') return 'system';
    return 'other';
}

export function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
