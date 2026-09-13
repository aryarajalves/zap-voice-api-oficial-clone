import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useBlockedList } from './useBlockedList';
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

describe('useBlockedList hook', () => {
    const mockClient = { id: 'client-1' };
    const mockContacts = [
        { id: 1, phone: '5511999991111', name: 'Alice Silva', reason: 'Spam' },
        { id: 2, phone: '5511988882222', name: 'Bob Souza', reason: 'Manual' },
        { id: 3, phone: '5521977773333', name: 'Carlos Lima', reason: 'Spam' }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(fetchWithAuth).mockResolvedValue({
            ok: true,
            json: async () => mockContacts
        });
    });

    it('busca contatos bloqueados e filtra por termo de busca', async () => {
        const { result } = renderHook(() =>
            useBlockedList({ activeClient: mockClient })
        );

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.contacts.length).toBe(3);

        act(() => {
            result.current.setSearchTerm('Alice');
        });

        expect(result.current.filteredContacts.length).toBe(1);
        expect(result.current.filteredContacts[0].name).toBe('Alice Silva');
    });

    it('filtra contatos por motivo (reasonFilter)', async () => {
        const { result } = renderHook(() =>
            useBlockedList({ activeClient: mockClient })
        );

        await waitFor(() => expect(result.current.loading).toBe(false));

        act(() => {
            result.current.setReasonFilter('Spam');
        });

        expect(result.current.filteredContacts.length).toBe(2);
    });

    it('gerencia seleção individual e coletiva de contatos', async () => {
        const { result } = renderHook(() =>
            useBlockedList({ activeClient: mockClient })
        );

        await waitFor(() => expect(result.current.loading).toBe(false));

        act(() => {
            result.current.toggleSelectRow(1);
        });

        expect(result.current.selectedIds.has(1)).toBe(true);
        expect(result.current.selectedIds.size).toBe(1);

        act(() => {
            result.current.selectAllFiltered();
        });

        expect(result.current.selectedIds.size).toBe(3);
        expect(result.current.isAllFilteredSelected).toBe(true);

        act(() => {
            result.current.clearSelection();
        });

        expect(result.current.selectedIds.size).toBe(0);
    });

    it('executa desbloqueio individual via performUnblock', async () => {
        vi.mocked(fetchWithAuth).mockImplementation((url, options) => {
            if (options?.method === 'DELETE') {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({ status: 'success' })
                });
            }
            return Promise.resolve({
                ok: true,
                json: async () => mockContacts
            });
        });

        const { result } = renderHook(() =>
            useBlockedList({ activeClient: mockClient })
        );

        await waitFor(() => expect(result.current.loading).toBe(false));

        let success = false;
        await act(async () => {
            success = await result.current.performUnblock(1);
        });

        expect(success).toBe(true);
        expect(result.current.contacts.some(c => c.id === 1)).toBe(false);
    });
});
