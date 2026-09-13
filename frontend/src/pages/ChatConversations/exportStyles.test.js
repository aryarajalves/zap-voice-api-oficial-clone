import { describe, it, expect } from 'vitest';
import {
    EXPORT_CSS,
    BASE_STYLES,
    HEADER_AND_ACTION_STYLES,
    TABS_STYLES,
    MESSAGES_STYLES,
    QA_PANEL_STYLES,
    FOOTER_AND_PRINT_STYLES
} from './exportStyles.js';
import EXPORT_CSS_DEFAULT from './exportStyles/index.js';

describe('Modularização de exportStyles', () => {
    it('deve exportar todas as constantes parciais de estilo', () => {
        expect(BASE_STYLES).toBeDefined();
        expect(BASE_STYLES).toContain('--primary: #2563eb;');
        expect(BASE_STYLES).toContain('.page-container');

        expect(HEADER_AND_ACTION_STYLES).toBeDefined();
        expect(HEADER_AND_ACTION_STYLES).toContain('.action-bar');
        expect(HEADER_AND_ACTION_STYLES).toContain('.header');

        expect(TABS_STYLES).toBeDefined();
        expect(TABS_STYLES).toContain('.main-nav-tabs');
        expect(TABS_STYLES).toContain('.tabs-container');

        expect(MESSAGES_STYLES).toBeDefined();
        expect(MESSAGES_STYLES).toContain('.message-card');
        expect(MESSAGES_STYLES).toContain('.contact-msg');
        expect(MESSAGES_STYLES).toContain('.user-msg');

        expect(QA_PANEL_STYLES).toBeDefined();
        expect(QA_PANEL_STYLES).toContain('.qa-panel-wrapper');
        expect(QA_PANEL_STYLES).toContain('.qa-card');

        expect(FOOTER_AND_PRINT_STYLES).toBeDefined();
        expect(FOOTER_AND_PRINT_STYLES).toContain('.footer');
        expect(FOOTER_AND_PRINT_STYLES).toContain('@media print');
    });

    it('deve compor o EXPORT_CSS completo contendo todas as seções', () => {
        expect(EXPORT_CSS).toBeDefined();
        expect(EXPORT_CSS).toContain('--primary: #2563eb;');
        expect(EXPORT_CSS).toContain('.action-bar');
        expect(EXPORT_CSS).toContain('.main-nav-tabs');
        expect(EXPORT_CSS).toContain('.message-card');
        expect(EXPORT_CSS).toContain('.qa-panel-wrapper');
        expect(EXPORT_CSS).toContain('@media print');
    });

    it('deve garantir igualdade entre exportStyles.js e exportStyles/index.js (retrocompatibilidade)', () => {
        expect(EXPORT_CSS).toEqual(EXPORT_CSS_DEFAULT);
    });
});
