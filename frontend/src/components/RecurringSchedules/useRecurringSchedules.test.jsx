import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useRecurringSchedules } from './useRecurringSchedules';
import { fetchWithAuth } from '../../AuthContext';

// Mock dependencies
vi.mock('../../AuthContext', () => ({
    fetchWithAuth: vi.fn()
}));

vi.mock('react-hot-toast', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn()
    }
}));

describe('useRecurringSchedules Hook', () => {
    const mockClient = { id: 1 };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('inicializa com estados corretos', () => {
        const { result } = renderHook(() => useRecurringSchedules(mockClient));
        
        expect(result.current.schedules).toEqual([]);
        expect(result.current.isLoading).toBe(true);
        expect(result.current.isDeleting).toBe(false);
        expect(result.current.selectedSchedule).toBeNull();
    });

    it('busca agendamentos com sucesso', async () => {
        const mockData = { items: [{ id: 1, template_name: 'Template Teste' }] };
        fetchWithAuth.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(mockData)
        });

        const { result } = renderHook(() => useRecurringSchedules(mockClient));

        // Aguarda a execução do useEffect inicial
        await act(async () => {
            await Promise.resolve(); // Permite que a microtask do useEffect rode
        });

        expect(fetchWithAuth).toHaveBeenCalled();
        expect(result.current.schedules).toEqual(mockData.items);
        expect(result.current.isLoading).toBe(false);
    });

    it('abre o modo de edição com dados corretos', () => {
        const { result } = renderHook(() => useRecurringSchedules(mockClient));
        const schedule = {
            id: 1,
            frequency: 'weekly',
            days_of_week: [{ day: 0, time: '10:00' }],
            scheduled_time: '09:00'
        };

        act(() => {
            result.current.openEdit(schedule);
        });

        expect(result.current.selectedSchedule).toEqual(schedule);
        expect(result.current.editFreq).toBe('weekly');
        expect(result.current.editDays).toEqual([{ day: 0, time: '10:00' }]);
    });

    it('manipula a alteração de status', async () => {
        fetchWithAuth.mockResolvedValue({ ok: true });
        const { result } = renderHook(() => useRecurringSchedules(mockClient));

        await act(async () => {
            await result.current.handleToggleStatus({ id: 1, is_active: true });
        });

        expect(fetchWithAuth).toHaveBeenCalledWith(
            expect.stringContaining('/schedules/recurring/1'),
            expect.objectContaining({
                method: 'PATCH',
                body: JSON.stringify({ is_active: false })
            }),
            1
        );
    });

    it('exclui um agendamento com sucesso', async () => {
        fetchWithAuth.mockResolvedValue({ ok: true });
        const { result } = renderHook(() => useRecurringSchedules(mockClient));

        await act(async () => {
            await result.current.handleDelete(1);
        });

        expect(fetchWithAuth).toHaveBeenCalledWith(
            expect.stringContaining('/schedules/recurring/1'),
            expect.objectContaining({ method: 'DELETE' }),
            1
        );
        expect(result.current.selectedSchedule).toBeNull();
    });
});
