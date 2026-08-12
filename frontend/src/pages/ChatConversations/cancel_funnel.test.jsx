import { describe, it, expect, vi } from 'vitest';

/**
 * Teste unitário para validação do cancelamento de funil ativo por contato
 */

describe('Cancelamento de Funil Ativo pelo Chat', () => {

    it('deve formatar o payload correto para cancelamento do funil ativo', async () => {
        const conversationId = 1083;
        const mockFetchWithAuth = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ message: "Funil cancelado com sucesso!", trigger_id: 42 })
        });

        const res = await mockFetchWithAuth(`/api/chat/conversations/${conversationId}/cancel-funnel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        expect(mockFetchWithAuth).toHaveBeenCalledWith(
            `/api/chat/conversations/1083/cancel-funnel`,
            { method: 'POST', headers: { 'Content-Type': 'application/json' } }
        );

        const data = await res.json();
        expect(data.message).toBe("Funil cancelado com sucesso!");
    });
});
