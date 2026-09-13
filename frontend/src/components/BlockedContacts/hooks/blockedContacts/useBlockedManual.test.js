import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useBlockedManual } from './useBlockedManual';
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

describe('useBlockedManual hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('adiciona DDI 55 aos números que não começam com 55', () => {
        const { result } = renderHook(() =>
            useBlockedManual({
                activeClient: { id: 'client-1' },
                blockType: 'permanent'
            })
        );

        act(() => {
            result.current.setManualInput('11999998888\n5511977776666\n21988887777');
        });

        act(() => {
            result.current.add55ToManualInput();
        });

        expect(result.current.manualInput).toBe('5511999998888\n5511977776666\n5521988887777');
    });

    it('bloqueia contatos manualmente e limpa o input ao concluir', async () => {
        const fetchBlockedContacts = vi.fn();
        vi.mocked(fetchWithAuth).mockResolvedValue({ ok: true, json: async () => ({}) });

        const { result } = renderHook(() =>
            useBlockedManual({
                activeClient: { id: 'client-1' },
                blockType: 'permanent',
                fetchBlockedContacts
            })
        );

        act(() => {
            result.current.setManualInput('5511999999999; João');
        });

        await act(async () => {
            await result.current.handleBlockManual();
        });

        expect(fetchWithAuth).toHaveBeenCalledWith(
            expect.stringContaining('/blocked/'),
            expect.objectContaining({
                method: 'POST',
                body: expect.stringContaining('5511999999999')
            }),
            'client-1'
        );
        expect(fetchBlockedContacts).toHaveBeenCalled();
        expect(result.current.manualInput).toBe('');
    });
});
