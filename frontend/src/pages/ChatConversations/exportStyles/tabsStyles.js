/**
 * Estilos das abas de navegação (Chat vs QA e abas de datas).
 */

export const TABS_STYLES = `
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
`;
