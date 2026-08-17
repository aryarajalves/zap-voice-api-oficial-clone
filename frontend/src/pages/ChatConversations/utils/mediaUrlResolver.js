import { API_URL } from '../../../config';

/**
 * Resolve uma URL de mídia (relativa, MinIO, WhatsApp, estática ou externa) para exibição segura no frontend.
 * @param {string} rawUrl - URL ou chave bruta da mídia (ex: "/static/uploads/img.jpg", "minio:whatsapp/img.jpg", "https://...")
 * @param {number|string} [activeClientId] - ID do cliente ativo
 * @returns {string} - URL pronta para uso em <img>, <video>, <audio> ou <a>
 */
export function resolveMediaUrl(rawUrl, activeClientId) {
    if (!rawUrl || typeof rawUrl !== 'string') return '';
    
    // Se for URL absoluta externa
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
        return rawUrl;
    }

    const backendBase = API_URL.replace(/\/api\/?$/, '');

    // Se for arquivo estático do backend (/static/...)
    if (rawUrl.startsWith('/static') || rawUrl.startsWith('static/')) {
        const cleanPath = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
        return `${backendBase}${cleanPath}`;
    }

    const token = localStorage.getItem('token') || '';
    let mediaKey = rawUrl;
    if (rawUrl.includes(':')) {
        const parts = rawUrl.split(':');
        mediaKey = parts.slice(1).join(':');
    }

    const cId = activeClientId || '';
    return `${API_URL}/chat/media/${encodeURIComponent(mediaKey)}?token=${token}&client_id=${cId}`;
}
