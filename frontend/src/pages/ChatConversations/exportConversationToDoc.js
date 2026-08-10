/**
 * Utilitário para exportar o histórico de conversa entre o Usuário (Cliente) e o Agente (Atendente)
 * nos formatos de Arquivo HTML / PDF (.html) e Documento Word (.doc).
 */

import { API_URL } from '../../config';

function formatTimestamp(ts) {
    if (!ts) return '';
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

    if (!d || isNaN(d.getTime())) return '';
    return d.toLocaleString('pt-BR');
}

function resolveMediaUrl(msg, clientId) {
    if (!msg || !msg.media_url) return '';
    const url = msg.media_url;
    if (url.startsWith('http') || url.startsWith('/static')) {
        return url;
    }
    if (url.includes(':')) {
        const parts = url.split(':');
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
        const cid = clientId || '';
        return `${API_URL}/chat/media/${parts[1]}?token=${token}&client_id=${cid}`;
    }
    return url;
}

function isImageMedia(msg) {
    if (!msg) return false;
    if (msg.message_type === 'image') return true;
    if (msg.media_url) {
        const url = msg.media_url.toLowerCase();
        return url.endsWith('.png') || url.endsWith('.jpg') || url.endsWith('.jpeg') ||
               url.endsWith('.gif') || url.endsWith('.webp') || url.includes('image');
    }
    return false;
}

export function generateConversationDocHtml(convo, messages = [], clientId = '') {
    const contactName = convo?.contact_name || convo?.phone || 'Contato';
    const phone = convo?.phone || 'N/A';
    const convoId = convo?.id || 'N/A';
    const exportDate = new Date().toLocaleString('pt-BR');

    const formattedMessages = messages.map(msg => {
        const isContact = msg.sender_type === 'contact';
        const isUserAgent = msg.sender_type === 'user';
        const isSystem = msg.sender_type === 'system';

        let senderLabel = '👤 Usuário (Cliente)';
        let senderClass = 'sender-contact';
        let cardClass = 'contact-msg';

        if (isUserAgent) {
            senderLabel = '🤖 Agente / Atendente';
            senderClass = 'sender-user';
            cardClass = 'user-msg';
        } else if (isSystem) {
            senderLabel = '🔒 Sistema / Anotação';
            senderClass = 'sender-system';
            cardClass = 'system-msg';
        }

        const timestampStr = formatTimestamp(msg.timestamp);
        const formattedTime = timestampStr ? ` (${timestampStr})` : '';

        let contentText = msg.content || '';
        if (isSystem && contentText.startsWith('🔒 Anotação Privada: ')) {
            contentText = contentText.replace('🔒 Anotação Privada: ', '');
        }

        let mediaHtml = '';
        if (msg.media_url) {
            const mediaUrl = resolveMediaUrl(msg, clientId);
            const mType = msg.message_type || 'mídia';

            if (isImageMedia(msg)) {
                mediaHtml = `
                    <div class="media-container" style="margin-top: 10px; margin-bottom: 6px;">
                        <img src="${mediaUrl}" alt="Imagem da conversa" style="max-width: 450px; max-height: 350px; border-radius: 8px; border: 1px solid #cbd5e1; display: block; margin-bottom: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" />
                        <a href="${mediaUrl}" target="_blank" style="font-size: 11px; color: #2563eb; text-decoration: underline;">🔗 Abrir imagem em alta resolução</a>
                    </div>
                `;
            } else if (mType === 'video') {
                mediaHtml = `
                    <div class="media-container" style="margin-top: 10px; margin-bottom: 6px;">
                        <video src="${mediaUrl}" controls style="max-width: 400px; max-height: 250px; border-radius: 8px; border: 1px solid #cbd5e1; display: block; margin-bottom: 6px;"></video>
                        <a href="${mediaUrl}" target="_blank" style="font-size: 11px; color: #2563eb; text-decoration: underline;">🎬 Abrir vídeo original</a>
                    </div>
                `;
            } else if (mType === 'audio') {
                mediaHtml = `
                    <div class="media-container" style="margin-top: 10px; margin-bottom: 6px;">
                        <audio src="${mediaUrl}" controls style="margin-bottom: 6px; display: block; width: 300px;"></audio>
                        <a href="${mediaUrl}" target="_blank" style="font-size: 11px; color: #2563eb; text-decoration: underline;">🎵 Ouvir áudio original</a>
                    </div>
                `;
            } else {
                mediaHtml = `
                    <div class="media-container" style="margin-top: 8px;">
                        📎 <b>Documento/Arquivo (${escapeHtml(mType)}):</b> 
                        <a href="${mediaUrl}" target="_blank" style="font-size: 12px; color: #2563eb; text-decoration: underline; font-weight: bold;">Baixar ${escapeHtml(mType)}</a>
                    </div>
                `;
            }
        }

        return `
            <div class="message-card ${cardClass}">
                <div class="sender-title ${senderClass}">
                    ${senderLabel}
                    <span class="timestamp">${formattedTime}</span>
                </div>
                ${contentText ? `<div class="content">${escapeHtml(contentText)}</div>` : ''}
                ${mediaHtml}
            </div>
        `;
    }).join('\n');

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Histórico de Conversa - ${escapeHtml(contactName)}</title>
<style>
    body { font-family: 'Calibri', 'Segoe UI', system-ui, Arial, sans-serif; margin: 0; padding: 25px; color: #0f172a; background-color: #f8fafc; }
    .page-container { max-width: 860px; margin: 0 auto; background: #ffffff; padding: 30px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .action-bar { display: flex; justify-content: space-between; align-items: center; background: #eff6ff; border: 1px solid #bfdbfe; padding: 12px 20px; border-radius: 10px; margin-bottom: 25px; }
    .action-title { font-weight: bold; color: #1e40af; font-size: 14px; }
    .btn-print { background: #2563eb; color: #ffffff; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 13px; transition: all 0.2s; }
    .btn-print:hover { background: #1d4ed8; }
    .header { border-bottom: 2px solid #2563eb; padding-bottom: 15px; margin-bottom: 25px; }
    .header h1 { color: #1e3a8a; font-size: 22px; margin: 0 0 8px 0; }
    .meta-info { font-size: 13px; color: #475569; line-height: 1.6; }
    .message-card { margin-bottom: 14px; padding: 12px 16px; border-radius: 8px; border-left: 4px solid #cbd5e1; background-color: #f8fafc; page-break-inside: avoid; }
    .user-msg { border-left-color: #2563eb; background-color: #eff6ff; }
    .contact-msg { border-left-color: #10b981; background-color: #f0fdf4; }
    .system-msg { border-left-color: #f59e0b; background-color: #fffbeb; }
    .sender-title { font-weight: bold; font-size: 13px; margin-bottom: 4px; }
    .sender-user { color: #1d4ed8; }
    .sender-contact { color: #047857; }
    .sender-system { color: #b45309; }
    .timestamp { font-size: 11px; color: #64748b; font-weight: normal; margin-left: 6px; }
    .content { font-size: 13px; line-height: 1.5; white-space: pre-wrap; color: #0f172a; }
    .media-container { font-size: 12px; }
    .footer { margin-top: 35px; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 11px; color: #94a3b8; text-align: center; }

    @media print {
        body { background-color: #ffffff; padding: 0; }
        .page-container { box-shadow: none; padding: 0; max-width: 100%; }
        .action-bar { display: none !important; }
        .message-card { page-break-inside: avoid; }
    }
</style>
</head>
<body>
    <div class="page-container">
        <div class="action-bar">
            <span class="action-title">📄 Histórico de Conversa em HTML</span>
            <button onclick="window.print()" class="btn-print">🖨️ Salvar como PDF / Imprimir</button>
        </div>

        <div class="header">
            <h1>📋 Histórico de Atendimento - ZapVoice</h1>
            <div class="meta-info">
                <strong>Contato / Usuário:</strong> ${escapeHtml(contactName)}<br>
                <strong>Telefone:</strong> ${escapeHtml(phone)} | <strong>ID da Conversa:</strong> #${escapeHtml(String(convoId))}<br>
                <strong>Data da Exportação:</strong> ${escapeHtml(exportDate)} | <strong>Total de Mensagens:</strong> ${messages.length}
            </div>
        </div>

        <div class="conversation-body">
            ${formattedMessages || '<p style="color: #64748b; font-style: italic;">Nenhuma mensagem registrada nesta conversa.</p>'}
        </div>

        <div class="footer">
            Documento gerado automaticamente pelo sistema ZapVoice - API Oficial do WhatsApp
        </div>
    </div>
</body>
</html>
    `.trim();
}

/**
 * Exporta o histórico como arquivo HTML navegável (que abre direto no navegador com botão de PDF / Imprimir).
 */
export function exportConversationToHtml(convo, messages = [], clientId = '') {
    const htmlContent = generateConversationDocHtml(convo, messages, clientId);
    const blob = new Blob([htmlContent], {
        type: 'text/html;charset=utf-8'
    });

    const contactName = (convo?.contact_name || convo?.phone || 'conversa')
        .toLowerCase()
        .replace(/[^a-z0-9]/gi, '_');

    const fileName = `historico_conversa_${contactName}_#${convo?.id || 'chat'}.html`;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

/**
 * Manter exportConversationToDoc por compatibilidade
 */
export function exportConversationToDoc(convo, messages = [], clientId = '') {
    exportConversationToHtml(convo, messages, clientId);
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
