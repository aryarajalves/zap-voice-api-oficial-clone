import { describe, it, expect } from 'vitest';

describe("Filtro por Etiqueta de Contatos em Vendas (Financeiro)", () => {
    it("deve formatar o parâmetro label=all quando nenhuma etiqueta for selecionada", () => {
        const selectedLabels = [];
        const labelParam = selectedLabels.length > 0 ? selectedLabels.join(',') : 'all';
        expect(labelParam).toBe('all');
    });

    it("deve formatar múltiplas etiquetas separadas por vírgula para a requisição da API", () => {
        const selectedLabels = ['VIP', 'Lead Mentoria', 'Carrinho Abandonado'];
        const labelParam = selectedLabels.length > 0 ? selectedLabels.join(',') : 'all';
        expect(labelParam).toBe('VIP,Lead Mentoria,Carrinho Abandonado');
    });
});
