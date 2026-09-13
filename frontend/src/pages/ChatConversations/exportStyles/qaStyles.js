/**
 * Estilos para o painel de Perguntas & Respostas (QA), métricas, filtros e cartões.
 */

export const QA_PANEL_STYLES = `
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
`;
