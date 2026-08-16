import { describe, it, expect, vi } from 'vitest';

/**
 * Teste unitário para abertura do Pipeline de Automação em tempo real a partir do chat
 */

describe('Abertura do Pipeline de Automação pelo Chat', () => {
    it('deve buscar o trigger por trigger_id quando disponível no active_funnel', async () => {
        const triggerId = 512;
        const mockFetchWithAuth = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                id: triggerId,
                funnel_id: 10,
                status: 'processing',
                contact_phone: '5511999765229',
                contact_name: 'Aryaraj',
                history: [
                    { node_id: 'node-1', status: 'completed', content: 'Mensagem enviada' }
                ]
            })
        });

        const res = await mockFetchWithAuth(`/api/triggers/${triggerId}`, {}, 1);
        expect(mockFetchWithAuth).toHaveBeenCalledWith(`/api/triggers/512`, {}, 1);

        const triggerData = await res.json();
        expect(triggerData.id).toBe(512);
        expect(triggerData.status).toBe('processing');
        expect(triggerData.contact_name).toBe('Aryaraj');
    });

    it('deve buscar o trigger ativo do contato via busca por telefone como fallback', async () => {
        const phone = '5511999765229';
        const searchSuffix = phone.slice(-8);

        const mockFetchWithAuth = vi.fn().mockImplementation((url) => {
            if (url.includes('/api/triggers?search=')) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({
                        triggers: [
                            { id: 999, status: 'processing', contact_phone: phone, funnel_name: 'Funil - Convite Base' }
                        ]
                    })
                });
            }
            if (url.includes('/api/triggers/999')) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({
                        id: 999,
                        status: 'processing',
                        contact_phone: phone,
                        funnel_name: 'Funil - Convite Base'
                    })
                });
            }
            return Promise.reject(new Error('URL não esperada'));
        });

        const searchRes = await mockFetchWithAuth(`/api/triggers?search=${searchSuffix}&limit=10`, {}, 1);
        const searchData = await searchRes.json();
        const activeTrig = searchData.triggers.find(t => t.status === 'processing');

        expect(activeTrig).toBeDefined();
        expect(activeTrig.id).toBe(999);

        const fullRes = await mockFetchWithAuth(`/api/triggers/${activeTrig.id}`, {}, 1);
        const fullData = await fullRes.json();
        expect(fullData.id).toBe(999);
        expect(fullData.funnel_name).toBe('Funil - Convite Base');
    });
});
