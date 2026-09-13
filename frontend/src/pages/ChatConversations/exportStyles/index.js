/**
 * Exportador principal (Barrel) dos estilos para o documento exportado ZapVoice.
 * Monta a constante unificada EXPORT_CSS mantendo 100% de compatibilidade retroativa.
 */

import { BASE_STYLES } from './baseStyles.js';
import { HEADER_AND_ACTION_STYLES } from './headerStyles.js';
import { TABS_STYLES } from './tabsStyles.js';
import { MESSAGES_STYLES } from './messagesStyles.js';
import { QA_PANEL_STYLES } from './qaStyles.js';
import { FOOTER_AND_PRINT_STYLES } from './footerAndPrintStyles.js';

export {
    BASE_STYLES,
    HEADER_AND_ACTION_STYLES,
    TABS_STYLES,
    MESSAGES_STYLES,
    QA_PANEL_STYLES,
    FOOTER_AND_PRINT_STYLES
};

export const EXPORT_CSS = `
${BASE_STYLES}
${HEADER_AND_ACTION_STYLES}
${TABS_STYLES}
${MESSAGES_STYLES}
${QA_PANEL_STYLES}
${FOOTER_AND_PRINT_STYLES}
`;

export default EXPORT_CSS;
