import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sanitizeFileName, exportFunnelAsJson, parseFunnelJson, importFunnelFromJson } from './funnelExportImport';
import { toast } from 'react-hot-toast';

vi.mock('react-hot-toast', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        loading: vi.fn(),
        dismiss: vi.fn()
    }
}));

vi.mock('../AuthContext', () => ({
    fetchWithAuth: vi.fn()
}));

describe('funnelExportImport', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('sanitizeFileName', () => {
        it('deve limpar caracteres especiais e espaços', () => {
            expect(sanitizeFileName('Funil VIP #1 / Teste!')).toBe('funil_vip_1_teste');
            expect(sanitizeFileName('')).toBe('funil');
        });
    });

    describe('parseFunnelJson', () => {
        it('deve extrair dados de JSON no formato envelopado', () => {
            const rawJson = JSON.stringify({
                version: "1.0",
                type: "zapvoice_funnel",
                funnel: {
                    name: 'Funil Boas-Vindas',
                    description: 'Descrição teste',
                    steps: { nodes: [{ id: '1', type: 'messageNode' }], edges: [] }
                }
            });

            const parsed = parseFunnelJson(rawJson);
            expect(parsed.name).toBe('Funil Boas-Vindas');
            expect(parsed.description).toBe('Descrição teste');
            expect(parsed.steps.nodes).toHaveLength(1);
        });

        it('deve extrair dados de JSON no formato direto', () => {
            const rawJson = JSON.stringify({
                name: 'Funil Direto',
                steps: { nodes: [], edges: [] }
            });

            const parsed = parseFunnelJson(rawJson);
            expect(parsed.name).toBe('Funil Direto');
        });

        it('deve lançar erro para JSON inválido ou corrompido', () => {
            expect(() => parseFunnelJson('{ invalido')).toThrow('Arquivo JSON corrompido ou inválido.');
            expect(() => parseFunnelJson('{}')).toThrow('O arquivo não contém etapas nem o nome do funil.');
        });
    });

    describe('exportFunnelAsJson', () => {
        it('deve criar link de download e exibir toast de sucesso', () => {
            const mockAppend = vi.spyOn(document.body, 'appendChild');
            const mockRemove = vi.spyOn(document.body, 'removeChild');

            const sampleFunnel = {
                id: 123,
                name: 'Funil Black Friday',
                steps: { nodes: [{ id: 'n1' }], edges: [] }
            };

            exportFunnelAsJson(sampleFunnel);

            expect(mockAppend).toHaveBeenCalled();
            expect(mockRemove).toHaveBeenCalled();
            expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('Funil "Funil Black Friday" exportado com sucesso!'));
        });

        it('deve exibir toast de erro se nenhum funil for informado', () => {
            exportFunnelAsJson(null);
            expect(toast.error).toHaveBeenCalledWith('Nenhum funil selecionado para exportação.');
        });
    });

    describe('importFunnelFromJson', () => {
        it('deve importar arquivo JSON com sucesso e resolver conflito de nome', async () => {
            const { fetchWithAuth } = await import('../AuthContext');
            fetchWithAuth.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ id: 456, name: 'Funil Vendas (Importado)' })
            });

            const fakeFile = {
                text: async () => JSON.stringify({
                    name: 'Funil Vendas',
                    steps: { nodes: [], edges: [] }
                })
            };

            const existingFunnels = [{ id: 1, name: 'Funil Vendas' }];
            const onSuccess = vi.fn();

            const result = await importFunnelFromJson(fakeFile, 15, existingFunnels, onSuccess);

            expect(fetchWithAuth).toHaveBeenCalled();
            expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('importado com sucesso!'));
            expect(onSuccess).toHaveBeenCalled();
            expect(result.id).toBe(456);
        });
    });
});
