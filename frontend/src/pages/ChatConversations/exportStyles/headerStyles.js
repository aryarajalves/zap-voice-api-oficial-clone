/**
 * Estilos da barra de ações superior, cabeçalho e metadados.
 */

export const HEADER_AND_ACTION_STYLES = `
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
`;
