/**
 * Estilos CSS para o documento exportado em HTML/PDF de Histórico de Atendimento ZapVoice.
 */

export const EXPORT_CSS = `
    :root {
        --primary: #2563eb;
        --primary-dark: #1d4ed8;
        --primary-light: #eff6ff;
        --primary-border: #bfdbfe;
        --contact-bg: #f0fdf4;
        --contact-border: #10b981;
        --user-bg: #eff6ff;
        --user-border: #2563eb;
        --system-bg: #fffbeb;
        --system-border: #f59e0b;
        --text-dark: #0f172a;
        --text-muted: #64748b;
    }
    * { box-sizing: border-box; }
    body {
        font-family: 'Segoe UI', Calibri, -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
        margin: 0;
        padding: 25px;
        color: var(--text-dark);
        background-color: #f1f5f9;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }
    .page-container {
        max-width: 880px;
        margin: 0 auto;
        background: #ffffff;
        padding: 32px;
        border-radius: 16px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
    }
    
    /* Barra de Ações Superior */
    .action-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 12px;
        background: var(--primary-light);
        border: 1px solid var(--primary-border);
        padding: 14px 20px;
        border-radius: 12px;
        margin-bottom: 24px;
    }
    .action-left {
        display: flex;
        align-items: center;
        gap: 16px;
        flex-wrap: wrap;
    }
    .action-title {
        font-weight: 700;
        color: #1e40af;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 6px;
    }
    .filter-private-container {
        display: inline-flex;
        align-items: center;
        background: #ffffff;
        border: 1px solid #cbd5e1;
        padding: 6px 12px;
        border-radius: 8px;
        cursor: pointer;
        user-select: none;
        transition: all 0.2s;
    }
    .filter-private-container:hover {
        border-color: #94a3b8;
        background: #f8fafc;
    }
    .filter-private-container input {
        margin: 0 8px 0 0;
        cursor: pointer;
        width: 16px;
        height: 16px;
        accent-color: #2563eb;
    }
    .filter-private-label {
        font-size: 13px;
        font-weight: 600;
        color: #334155;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 5px;
    }
    .btn-print {
        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
        color: #ffffff;
        border: none;
        padding: 8px 16px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
        transition: all 0.2s;
    }
    .btn-print:hover {
        background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
        box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3);
        transform: translateY(-1px);
    }
    
    /* Cabeçalho */
    .header {
        border-bottom: 2px solid #e2e8f0;
        padding-bottom: 18px;
        margin-bottom: 20px;
    }
    .header h1 {
        margin: 0 0 10px 0;
        font-size: 22px;
        color: #1e293b;
        font-weight: 800;
    }
    .meta-info {
        font-size: 13px;
        color: #475569;
        line-height: 1.7;
    }
    .meta-tag {
        background: #f1f5f9;
        padding: 2px 6px;
        border-radius: 4px;
        font-family: monospace;
        font-size: 12px;
        color: #334155;
        border: 1px solid #e2e8f0;
    }
    .private-notes-count-badge {
        display: inline-block;
        background: #fef3c7;
        color: #b45309;
        border: 1px solid #fde68a;
        font-size: 11px;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 9999px;
        margin-left: 8px;
    }

    /* Abas Principais (Chat vs QA) */
    .main-nav-tabs {
        display: flex;
        gap: 8px;
        border-bottom: 2px solid #e2e8f0;
        margin-bottom: 20px;
    }
    .nav-tab-btn {
        background: transparent;
        border: none;
        border-bottom: 3px solid transparent;
        padding: 10px 18px;
        font-size: 14px;
        font-weight: 700;
        color: #64748b;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.2s;
        margin-bottom: -2px;
    }
    .nav-tab-btn:hover {
        color: #1e293b;
    }
    .nav-tab-btn.active {
        color: #2563eb;
        border-bottom-color: #2563eb;
    }
    .nav-badge {
        background: #e2e8f0;
        color: #475569;
        font-size: 11px;
        padding: 2px 7px;
        border-radius: 9999px;
    }
    .nav-badge.qa-highlight {
        background: #dbeafe;
        color: #1e40af;
    }

    /* Abas de Datas */
    .tabs-container {
        margin-bottom: 24px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        padding: 12px 16px;
        border-radius: 12px;
    }
    .tabs-label {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #64748b;
        margin-bottom: 8px;
    }
    .tabs-bar {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
    }
    .tab-btn {
        background: #ffffff;
        border: 1px solid #cbd5e1;
        color: #475569;
        padding: 6px 12px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        transition: all 0.15s ease-in-out;
    }
    .tab-btn:hover {
        border-color: #94a3b8;
        color: #1e293b;
        background: #f1f5f9;
    }
    .tab-btn.active {
        background: #2563eb;
        border-color: #2563eb;
        color: #ffffff;
        box-shadow: 0 2px 4px rgba(37, 99, 235, 0.25);
    }
    .tab-badge {
        background: rgba(0, 0, 0, 0.08);
        padding: 1px 6px;
        border-radius: 9999px;
        font-size: 11px;
    }
    .tab-btn.active .tab-badge {
        background: rgba(255, 255, 255, 0.25);
        color: #ffffff;
    }

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

    /* PAINEL DE PERGUNTAS & RESPOSTAS (QA) */
    .qa-panel-wrapper {
        margin-top: 10px;
    }
    .qa-header-card {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 16px 20px;
        margin-bottom: 20px;
    }
    .qa-metrics-summary {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 18px;
        margin-bottom: 14px;
        padding-bottom: 12px;
        border-bottom: 1px solid #e2e8f0;
    }
    .qa-metric-item {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
    }
    .qa-metric-val {
        font-size: 20px;
        font-weight: 800;
        line-height: 1;
    }
    .qa-metric-lbl {
        font-size: 11px;
        font-weight: 600;
        color: #64748b;
        margin-top: 3px;
    }
    .text-green { color: #059669; }
    .text-amber { color: #d97706; }
    .text-red { color: #dc2626; }
    .qa-model-badge {
        margin-left: auto;
        background: #ede9fe;
        color: #6d28d9;
        font-size: 11px;
        padding: 4px 10px;
        border-radius: 9999px;
        font-weight: 600;
        border: 1px solid #ddd6fe;
    }
    .qa-filters-bar {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
    }
    .qa-filters-title {
        font-size: 12px;
        font-weight: 700;
        color: #475569;
        margin-right: 4px;
    }
    .qa-filter-btn {
        background: #ffffff;
        border: 1px solid #cbd5e1;
        color: #475569;
        padding: 5px 12px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s;
    }
    .qa-filter-btn:hover {
        background: #f1f5f9;
        border-color: #94a3b8;
    }
    .qa-filter-btn.active {
        background: #2563eb;
        color: #ffffff;
        border-color: #2563eb;
    }

    /* Cards de QA */
    .qa-cards-list {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }
    .qa-card {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 16px 20px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
        transition: all 0.2s;
    }
    .qa-card.status-answered {
        border-left: 4px solid #10b981;
    }
    .qa-card.status-incomplete {
        border-left: 4px solid #f59e0b;
    }
    .qa-card.status-unanswered {
        border-left: 4px solid #ef4444;
    }
    .qa-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
    }
    .qa-q-title {
        font-size: 13px;
        color: #1e293b;
        display: flex;
        align-items: center;
        gap: 6px;
    }
    .qa-time {
        font-size: 11px;
        color: #94a3b8;
        font-weight: normal;
        margin-left: 4px;
    }
    .qa-status-badge {
        font-size: 11px;
        font-weight: 700;
        padding: 3px 10px;
        border-radius: 9999px;
    }
    .badge-answered {
        background: #d1fae5;
        color: #065f46;
        border: 1px solid #a7f3d0;
    }
    .badge-incomplete {
        background: #fef3c7;
        color: #92400e;
        border: 1px solid #fde68a;
    }
    .badge-unanswered {
        background: #fee2e2;
        color: #991b1b;
        border: 1px solid #fecaca;
    }
    .qa-question-box {
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        border-radius: 8px;
        padding: 10px 14px;
        margin-bottom: 10px;
    }
    .qa-answer-box {
        background: #eff6ff;
        border: 1px solid #bfdbfe;
        border-radius: 8px;
        padding: 10px 14px;
        margin-bottom: 10px;
    }
    .qa-answer-box.empty-answer {
        background: #fef2f2;
        border-color: #fecaca;
    }
    .qa-box-label {
        font-size: 11px;
        font-weight: 700;
        color: #475569;
        margin-bottom: 4px;
        display: flex;
        justify-content: space-between;
    }
    .qa-box-content {
        font-size: 13px;
        line-height: 1.5;
        color: #1e293b;
        white-space: pre-wrap;
    }
    .qa-analysis-box {
        background: #fbfbfe;
        border: 1px dashed #c7d2fe;
        border-radius: 8px;
        padding: 8px 12px;
        font-size: 12px;
    }
    .qa-analysis-label {
        font-weight: 700;
        color: #4338ca;
        margin-bottom: 3px;
    }
    .qa-analysis-content {
        color: #3730a3;
        line-height: 1.4;
    }
    .qa-empty-state {
        text-align: center;
        padding: 30px;
        color: #64748b;
        font-style: italic;
        background: #f8fafc;
        border-radius: 12px;
    }

    .footer {
        margin-top: 30px;
        padding-top: 15px;
        border-top: 1px solid #e2e8f0;
        text-align: center;
        font-size: 11px;
        color: #94a3b8;
    }

    @media print {
        body { background: #ffffff; padding: 0; }
        .page-container { box-shadow: none; padding: 0; max-width: 100%; }
        .action-bar, .main-nav-tabs, .tabs-container, .qa-filters-bar { display: none !important; }
        .conversation-body, .qa-panel-wrapper { display: block !important; }
    }
`;
