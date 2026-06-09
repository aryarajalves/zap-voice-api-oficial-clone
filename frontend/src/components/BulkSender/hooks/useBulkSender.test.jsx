import { renderHook } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useBulkSender } from './useBulkSender';

// Mock dependencies
vi.mock('../../../contexts/ClientContext', () => ({
    useClient: () => ({
        activeClient: { id: 1, name: 'Client Test' }
    })
}));

vi.mock('../../../AuthContext', () => ({
    fetchWithAuth: vi.fn(),
    useAuth: () => ({})
}));

vi.mock('react-hot-toast', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn()
    }
}));

describe('useBulkSender Hook - extractTemplateVariables', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('deve extrair variáveis do corpo e cabeçalho de mídia corretamente', () => {
        const { result } = renderHook(() => useBulkSender(vi.fn(), vi.fn()));
        
        const mockTemplate = {
            name: 'convite_live',
            components: [
                {
                    type: 'HEADER',
                    format: 'VIDEO'
                },
                {
                    type: 'BODY',
                    text: 'Olá {{1}}, seu código é {{2}}.'
                }
            ]
        };

        const variables = result.current.extractTemplateVariables(mockTemplate);

        expect(variables).toEqual([
            {
                key: 'HEADER_0',
                label: 'Link do Cabeçalho (Vídeo)'
            },
            {
                key: 'BODY_0',
                label: '{{1}}'
            },
            {
                key: 'BODY_1',
                label: '{{2}}'
            }
        ]);
    });

    it('deve extrair apenas variáveis do corpo se o cabeçalho for de texto', () => {
        const { result } = renderHook(() => useBulkSender(vi.fn(), vi.fn()));
        
        const mockTemplate = {
            name: 'texto_simples',
            components: [
                {
                    type: 'HEADER',
                    format: 'TEXT',
                    text: 'Olá'
                },
                {
                    type: 'BODY',
                    text: 'Seja bem-vindo {{1}}.'
                }
            ]
        };

        const variables = result.current.extractTemplateVariables(mockTemplate);

        expect(variables).toEqual([
            {
                key: 'BODY_0',
                label: '{{1}}'
            }
        ]);
    });
});
