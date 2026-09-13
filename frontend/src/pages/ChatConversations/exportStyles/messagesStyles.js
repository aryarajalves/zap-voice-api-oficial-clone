/**
 * Estilos para a renderização de mensagens, balões, separadores e mídias.
 */

export const MESSAGES_STYLES = `
    /* Mensagens */
    .date-separator {
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 28px 0 16px 0;
        position: relative;
    }
    .date-separator::before {
        content: '';
        position: absolute;
        left: 0;
        right: 0;
        top: 50%;
        height: 1px;
        background: #e2e8f0;
        z-index: 1;
    }
    .date-badge {
        position: relative;
        z-index: 2;
        background: #e2e8f0;
        color: #334155;
        font-size: 11px;
        font-weight: 700;
        padding: 4px 14px;
        border-radius: 9999px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
    }
    .message-card {
        border-radius: 12px;
        padding: 14px 18px;
        margin-bottom: 14px;
        border-width: 1px;
        border-style: solid;
        page-break-inside: avoid;
        break-inside: avoid;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
    }
    .contact-msg {
        background-color: var(--contact-bg);
        border-color: var(--contact-border);
    }
    .user-msg {
        background-color: var(--user-bg);
        border-color: var(--user-border);
    }
    .system-msg {
        background-color: var(--system-bg);
        border-color: var(--system-border);
    }
    .sender-title {
        font-weight: 700;
        font-size: 12px;
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        gap: 6px;
    }
    .sender-contact { color: #047857; }
    .sender-user { color: #1d4ed8; }
    .sender-system { color: #b45309; }
    
    .msg-item {
        margin-bottom: 8px;
    }
    .msg-item:last-child {
        margin-bottom: 0;
    }
    .content {
        font-size: 13.5px;
        line-height: 1.6;
        white-space: pre-wrap;
        word-break: break-word;
    }
    .message-card-footer {
        margin-top: 8px;
        padding-top: 6px;
        border-top: 1px dashed rgba(0, 0, 0, 0.08);
        display: flex;
        justify-content: flex-end;
    }
    .timestamp {
        font-size: 11px;
        color: var(--text-muted);
    }

    /* Ocultar anotações privadas */
    body.hide-private-notes .message-card[data-is-private="true"] {
        display: none !important;
    }

    /* Media */
    .media-container {
        margin: 8px 0;
        padding: 8px;
        background: rgba(0, 0, 0, 0.03);
        border-radius: 8px;
    }
    .media-container img, .media-container video {
        max-width: 100%;
        max-height: 300px;
        border-radius: 6px;
        display: block;
        margin-bottom: 6px;
    }
`;
