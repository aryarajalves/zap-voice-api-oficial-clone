import { renderHook } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useBulkSender } from './useBulkSender';

// Mock dependencies
let mockClient = { id: 1, name: 'Client Test' };
vi.mock('../../../contexts/ClientContext', () => ({
    useClient: () => ({
        activeClient: mockClient
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

describe('useBulkSender Hook - handleSend validations', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        const { fetchWithAuth } = await import('../../../AuthContext');
        vi.mocked(fetchWithAuth).mockImplementation((url) => {
            let data = [];
            if (url.includes('/leads/filters')) {
                data = { tags: [] };
            }
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve(data)
            });
        });
    });

    it('deve rejeitar disparo se houver variáveis pendentes no template', async () => {
        const { toast } = await import('react-hot-toast');
        const { fetchWithAuth } = await import('../../../AuthContext');
        const { act } = await import('@testing-library/react');

        const mockTemplates = [
            {
                name: 'convite_live',
                language: 'pt_BR',
                components: [
                    {
                        type: 'BODY',
                        text: 'Olá {{1}}, seu código é {{2}}.'
                    }
                ]
            }
        ];

        vi.mocked(fetchWithAuth).mockImplementation((url) => {
            if (url.includes('/whatsapp/templates')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockTemplates)
                });
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        });

        const { result } = renderHook(() => useBulkSender(vi.fn(), vi.fn()));

        // Aguarda a renderização inicial e o useEffect rodar
        await act(async () => {
            await Promise.resolve();
        });

        // Configura estado mínimo para envio
        await act(async () => {
            result.current.handleRecipientSelect([{ phone: '5511999999999', vars: {} }], { isValidated: true });
            result.current.setSelectedTemplate('convite_live');
        });

        await act(async () => {
            await result.current.handleSend();
        });

        expect(toast.error).toHaveBeenCalledWith(
            expect.stringContaining('Defina o valor para as variáveis: {{1}}, {{2}}'),
            expect.any(Object)
        );
    });

    it('deve aceitar disparo se todas as variáveis estiverem preenchidas via templateParams ou contact vars', async () => {
        const { toast } = await import('react-hot-toast');
        const { fetchWithAuth } = await import('../../../AuthContext');
        const { act } = await import('@testing-library/react');

        const mockTemplates = [
            {
                name: 'convite_live',
                language: 'pt_BR',
                components: [
                    {
                        type: 'BODY',
                        text: 'Olá {{1}}, seu código é {{2}}.'
                    }
                ]
            }
        ];

        vi.mocked(fetchWithAuth).mockImplementation((url) => {
            if (url.includes('/whatsapp/templates')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockTemplates)
                });
            }
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ success: true })
            });
        });

        const { result } = renderHook(() => useBulkSender(vi.fn(), vi.fn()));

        // Aguarda a renderização inicial e o useEffect rodar
        await act(async () => {
            await Promise.resolve();
        });

        // Preenche BODY_0 no templateParams (global) e BODY_1 no contato (específico)
        await act(async () => {
            result.current.setTemplateParams({ BODY_0: 'Arya' });
            result.current.handleRecipientSelect([{ phone: '5511999999999', vars: { BODY_1: '123456' } }], { isValidated: true });
            result.current.setSelectedTemplate('convite_live');
        });

        await act(async () => {
            await result.current.handleSend();
        });

        expect(toast.error).not.toHaveBeenCalledWith(
            expect.stringContaining('Defina o valor para as variáveis:'),
            expect.any(Object)
        );
        expect(toast.success).toHaveBeenCalledWith("Disparo processado com sucesso!");
    });
});

describe('useBulkSender Hook - loadExclusionContactsByTag', () => {
    it('deve buscar contatos para múltiplas etiquetas em paralelo e mesclar na lista de exclusão', async () => {
        const { fetchWithAuth } = await import('../../../AuthContext');
        const { act } = await import('@testing-library/react');
        
        vi.mocked(fetchWithAuth).mockImplementation((url) => {
            let items = [];
            if (url.includes('tag=tag1') && url.includes('tag=tag2')) {
                items = [{ phone: '5511999999991' }, { phone: '5511999999992' }];
            } else if (url.includes('tag=tag1')) {
                items = [{ phone: '5511999999991' }];
            } else if (url.includes('tag=tag2')) {
                items = [{ phone: '5511999999992' }];
            }
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ items })
            });
        });

        const { result } = renderHook(() => useBulkSender(vi.fn(), vi.fn()));

        await act(async () => {
            result.current.setSelectedExclusionTag(['tag1', 'tag2']);
        });

        await act(async () => {
            await result.current.loadExclusionContactsByTag();
        });

        expect(result.current.exclusionList).toContain('5511999999991');
        expect(result.current.exclusionList).toContain('5511999999992');
        expect(result.current.exclusionList.length).toBe(2);
        expect(result.current.selectedExclusionTag).toEqual([]);
    });
});

describe('useBulkSender Hook - reset ao trocar de cliente ativo', () => {
    it('deve voltar para o passo 1 e desmarcar o template ao alterar o cliente ativo', async () => {
        const { act } = await import('@testing-library/react');
        
        mockClient = { id: 1, name: 'Cliente A' };
        const { result, rerender } = renderHook(() => useBulkSender(vi.fn(), vi.fn()));

        // Configurar estado no passo 2 com template selecionado
        await act(async () => {
            result.current.setStep(2);
            result.current.setSelectedTemplate('template_cliente_a');
            result.current.handleRecipientSelect([{ phone: '5511999999999' }]);
        });

        expect(result.current.step).toBe(2);
        expect(result.current.selectedTemplate).toBe('template_cliente_a');
        expect(result.current.finalContacts.length).toBe(1);

        // Simular troca de cliente ativo
        mockClient = { id: 2, name: 'Cliente B' };
        await act(async () => {
            rerender();
        });

        expect(result.current.step).toBe(1);
        expect(result.current.selectedTemplate).toBe('');
        expect(result.current.finalContacts.length).toBe(0);
    });
});


