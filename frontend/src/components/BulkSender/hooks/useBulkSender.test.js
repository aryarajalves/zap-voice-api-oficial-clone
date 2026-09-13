import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
    useBulkSender,
    useBulkExclusion,
    useBulkDataLoaders,
    extractTemplateVariables,
    extractTemplateButtons
} from './useBulkSender';
import * as ClientContext from '../../../contexts/ClientContext';

describe('Modularização de useBulkSender', () => {
    beforeEach(() => {
        vi.spyOn(ClientContext, 'useClient').mockReturnValue({
            activeClient: { id: 1, name: 'Cliente Teste' }
        });
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => []
        });
    });

    it('deve exportar utilitários de template corretamente', () => {
        const mockTemplate = {
            name: 'promo_carnaval',
            components: [
                { type: 'HEADER', format: 'IMAGE' },
                { type: 'BODY', text: 'Olá {{1}}, aproveite nosso desconto de {{2}}!' },
                {
                    type: 'BUTTONS',
                    buttons: [
                        { type: 'QUICK_REPLY', text: 'Quero agora' },
                        { type: 'URL', text: 'Acessar site', url: 'https://exemplo.com' }
                    ]
                }
            ]
        };

        const vars = extractTemplateVariables(mockTemplate);
        expect(vars).toEqual([
            { key: 'HEADER_0', label: 'Link do Cabeçalho (Imagem)' },
            { key: 'BODY_0', label: '{{1}}' },
            { key: 'BODY_1', label: '{{2}}' }
        ]);

        const buttons = extractTemplateButtons(mockTemplate);
        expect(buttons).toEqual(['Quero agora']);
    });

    it('deve inicializar o hook useBulkExclusion com valores padrão e permitir adicionar exclusão manual', () => {
        const { result } = renderHook(() => useBulkExclusion({
            activeClient: { id: 1 },
            setIsWorking: vi.fn(),
            setWorkingMessage: vi.fn()
        }));

        expect(result.current.exclusionList).toEqual([]);
        expect(result.current.exclusionMode).toBe('manual');

        act(() => {
            result.current.setExclusionText('5511999998888\n5511988887777');
        });

        act(() => {
            result.current.handleSaveExclusion();
        });

        expect(result.current.exclusionList).toEqual(['5511999998888', '5511988887777']);
        expect(result.current.exclusionText).toBe('');
    });

    it('deve inicializar useBulkSender agregando estados e mantendo a assinatura completa', () => {
        const onViewChange = vi.fn();
        const onSuccess = vi.fn();

        const { result } = renderHook(() => useBulkSender(onViewChange, onSuccess));

        expect(result.current.step).toBe(1);
        expect(result.current.selectedTemplate).toBe('');
        expect(result.current.isSending).toBe(false);
        expect(result.current.handleTemplateChange).toBeTypeOf('function');
        expect(result.current.handleRecipientSelect).toBeTypeOf('function');
        expect(result.current.handleReset).toBeTypeOf('function');
        expect(result.current.handleSend).toBeTypeOf('function');
    });

    it('deve resetar configurações ao chamar handleReset', () => {
        const { result } = renderHook(() => useBulkSender());

        act(() => {
            result.current.setSelectedTemplate('promo_natal');
            result.current.setSendPrivateMessage(true);
            result.current.setStep(2);
        });

        expect(result.current.selectedTemplate).toBe('promo_natal');
        expect(result.current.step).toBe(2);

        act(() => {
            result.current.handleReset();
        });

        expect(result.current.selectedTemplate).toBe('');
        expect(result.current.step).toBe(1);
        expect(result.current.sendPrivateMessage).toBe(false);
    });
});
