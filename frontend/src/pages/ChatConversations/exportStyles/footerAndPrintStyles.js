/**
 * Estilos para rodapé e regras de impressão (@media print).
 */

export const FOOTER_AND_PRINT_STYLES = `
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
