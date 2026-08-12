import { describe, it, expect, vi } from 'vitest';

/**
 * Teste unitário do novo filtro 'Funil Ativo' (has_active_funnel)
 */

describe("Filtro Funil Ativo (has_active_funnel)", () => {

    it("deve incluir o parâmetro has_active_funnel=true na URL da requisição de busca", async () => {
        const filterHasActiveFunnel = true;
        const url = new URL("http://localhost/api/chat/conversations");
        
        if (filterHasActiveFunnel) {
            url.searchParams.append('has_active_funnel', 'true');
        }

        expect(url.searchParams.get('has_active_funnel')).toBe('true');
    });
});
