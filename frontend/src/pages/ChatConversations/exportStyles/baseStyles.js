/**
 * Estilos base e variáveis CSS para o documento exportado ZapVoice.
 */

export const BASE_STYLES = `
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
`;
