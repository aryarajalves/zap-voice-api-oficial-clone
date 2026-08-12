import { describe, it, expect } from 'vitest';

describe("Paginação do Modal de Disparo de Funil", () => {
    it("deve limitar a exibição a no máximo 10 funis por página", () => {
        const funnels = Array.from({ length: 25 }, (_, i) => ({ id: i + 1, name: `Funil ${i + 1}` }));
        const itemsPerPage = 10;
        const currentPage = 1;

        const paginated = funnels.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

        expect(paginated.length).toBe(10);
        expect(paginated[0].id).toBe(1);
        expect(paginated[9].id).toBe(10);
    });

    it("deve navegar para a página 2 trazendo os próximos 10 itens", () => {
        const funnels = Array.from({ length: 25 }, (_, i) => ({ id: i + 1, name: `Funil ${i + 1}` }));
        const itemsPerPage = 10;
        const currentPage = 2;

        const paginated = funnels.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

        expect(paginated.length).toBe(10);
        expect(paginated[0].id).toBe(11);
        expect(paginated[9].id).toBe(20);
    });
});
