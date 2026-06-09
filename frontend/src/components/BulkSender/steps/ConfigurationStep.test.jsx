import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ConfigurationStep from './ConfigurationStep';

vi.mock('react-hot-toast', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        custom: vi.fn()
    }
}));

vi.mock('./TemplateSelectionSection', () => ({
    default: () => <div data-testid="template-selection-section" />
}));

const baseProps = {
    selectedTemplate: 'meu_template',
    templates: [],
    isLoadingTemplates: false,
    templateSearch: '',
    setTemplateSearch: vi.fn(),
    isTemplateDropdownOpen: false,
    setIsTemplateDropdownOpen: vi.fn(),
    handleTemplateChange: vi.fn(),
    selectedTemplateObj: null,
    templateParams: {},
    handleParamChange: vi.fn(),
    openExpansion: vi.fn(),
    chatwootLabels: [],
    selectedChatwootLabels: [],
    setSelectedChatwootLabels: vi.fn(),
    setStep: vi.fn()
};

describe('ConfigurationStep — Validação de Mídia', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('deve avançar normalmente quando template não tem cabeçalho de mídia', () => {
        const props = {
            ...baseProps,
            selectedTemplateObj: {
                components: [{ type: 'BODY', text: 'Olá {{1}}' }]
            }
        };
        render(<ConfigurationStep {...props} />);
        fireEvent.click(document.getElementById('bulk-advance-btn'));
        expect(props.setStep).toHaveBeenCalledWith(2);
    });

    it('deve bloquear avanço e exibir toast quando HEADER_0 está vazio com template de vídeo', async () => {
        const { toast } = await import('react-hot-toast');
        const props = {
            ...baseProps,
            selectedTemplateObj: {
                components: [
                    { type: 'HEADER', format: 'VIDEO' },
                    { type: 'BODY', text: 'Olá {{1}}' }
                ]
            },
            templateParams: { 'HEADER_0': '' }
        };
        render(<ConfigurationStep {...props} />);
        fireEvent.click(document.getElementById('bulk-advance-btn'));
        expect(props.setStep).not.toHaveBeenCalled();
        expect(toast.custom).toHaveBeenCalled();
    });

    it('deve avançar quando template de vídeo tem HEADER_0 preenchido', () => {
        const props = {
            ...baseProps,
            selectedTemplateObj: {
                components: [
                    { type: 'HEADER', format: 'VIDEO' },
                    { type: 'BODY', text: 'Olá {{1}}' }
                ]
            },
            templateParams: { 'HEADER_0': 'https://exemplo.com/video.mp4' }
        };
        render(<ConfigurationStep {...props} />);
        fireEvent.click(document.getElementById('bulk-advance-btn'));
        expect(props.setStep).toHaveBeenCalledWith(2);
    });

    it('deve bloquear avanço para template de Imagem sem HEADER_0', async () => {
        const { toast } = await import('react-hot-toast');
        const props = {
            ...baseProps,
            selectedTemplateObj: {
                components: [{ type: 'HEADER', format: 'IMAGE' }]
            },
            templateParams: {}
        };
        render(<ConfigurationStep {...props} />);
        fireEvent.click(document.getElementById('bulk-advance-btn'));
        expect(props.setStep).not.toHaveBeenCalled();
        expect(toast.custom).toHaveBeenCalled();
    });
});
