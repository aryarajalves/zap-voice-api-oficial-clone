import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useBlockedImport } from './useBlockedImport';
import { fetchWithAuth } from '../../../../AuthContext';

vi.mock('../../../../AuthContext', () => ({
    fetchWithAuth: vi.fn()
}));

vi.mock('react-hot-toast', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn()
    }
}));

describe('useBlockedImport hook', () => {
    const mockClient = { id: 'client-1' };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('inicializa com estados padrão de importação', () => {
        const { result } = renderHook(() =>
            useBlockedImport({ activeClient: mockClient, blockType: 'permanent' })
        );

        expect(result.current.importData.headers).toEqual([]);
        expect(result.current.importing).toBe(false);
        expect(result.current.showColumnSelector).toBe(false);
        expect(result.current.selectedPhoneCols).toEqual([]);
        expect(result.current.selectedNameCol).toBe(-1);
    });

    it('alerta se tentar processar importação sem selecionar coluna de telefone', async () => {
        const { result } = renderHook(() =>
            useBlockedImport({ activeClient: mockClient, blockType: 'permanent' })
        );

        await act(async () => {
            await result.current.processMappedImport();
        });

        expect(fetchWithAuth).not.toHaveBeenCalled();
    });

    it('processa importação mapeada em lotes com sucesso', async () => {
        const fetchBlockedContacts = vi.fn();
        vi.mocked(fetchWithAuth).mockResolvedValue({
            ok: true,
            json: async () => ({
                success_count: 2,
                already_blocked_count: 0
            })
        });

        const { result } = renderHook(() =>
            useBlockedImport({
                activeClient: mockClient,
                blockType: 'permanent',
                fetchBlockedContacts
            })
        );

        act(() => {
            result.current.setImportData({
                headers: ['Nome', 'Telefone'],
                rows: [
                    ['Maria', '5511999990000'],
                    ['Pedro', '5511988880000']
                ],
                nonEmptyIndices: [0, 1]
            });
            result.current.setSelectedPhoneCols([1]);
            result.current.setSelectedNameCol(0);
        });

        await act(async () => {
            await result.current.processMappedImport();
        });

        expect(fetchWithAuth).toHaveBeenCalledWith(
            expect.stringContaining('/blocked/block_bulk'),
            expect.objectContaining({
                method: 'POST',
                body: expect.stringContaining('5511999990000')
            }),
            'client-1'
        );
        expect(fetchBlockedContacts).toHaveBeenCalled();
        expect(result.current.showColumnSelector).toBe(false);
    });
});
