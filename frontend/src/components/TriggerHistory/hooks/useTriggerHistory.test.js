import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useTriggerHistory } from './useTriggerHistory';
import * as AuthContext from '../../../AuthContext';
import * as ClientContext from '../../../contexts/ClientContext';

// Mock contexts com vi.mock (Vitest)
vi.mock('../../../AuthContext');
vi.mock('../../../contexts/ClientContext');

describe('useTriggerHistory', () => {
    const mockActiveClient = { id: 1 };
    const mockUser = { role: 'super_admin' };

    beforeEach(() => {
        vi.clearAllMocks();
        AuthContext.useAuth = vi.fn().mockReturnValue({ user: mockUser });
        ClientContext.useClient = vi.fn().mockReturnValue({ activeClient: mockActiveClient });
        AuthContext.fetchWithAuth = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ items: [], total: 0 })
        });
    });

    it('deve inicializar com estados padrão', async () => {
        const { result } = renderHook(() => useTriggerHistory());
        
        expect(result.current.loading).toBe(true);
        expect(result.current.triggers).toEqual([]);
        
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });
    });

    it('deve atualizar filtros corretamente', async () => {
        const { result } = renderHook(() => useTriggerHistory());
        
        await waitFor(() => expect(result.current.loading).toBe(false));

        act(() => {
            result.current.setFilterName('Teste');
        });

        expect(result.current.filterName).toBe('Teste');
    });

    it('deve gerenciar a seleção em massa', async () => {
        const { result } = renderHook(() => useTriggerHistory());
        
        await waitFor(() => expect(result.current.loading).toBe(false));

        act(() => {
            result.current.handleSelectOne(1);
        });

        expect(result.current.selectedIds).toContain(1);

        act(() => {
            result.current.handleSelectOne(1);
        });

        expect(result.current.selectedIds).not.toContain(1);
    });

    it('deve armazenar trigger no monitoringTrigger ao abrir o pipeline', async () => {
        const { result } = renderHook(() => useTriggerHistory());
        await waitFor(() => expect(result.current.loading).toBe(false));

        const trigger = { id: 99, status: 'queued', execution_history: [] };
        act(() => { result.current.setMonitoringTrigger(trigger); });

        expect(result.current.monitoringTrigger).toEqual(trigger);
    });

    it('não deve iniciar polling para trigger com status completed', async () => {
        // Para triggers já finalizados, o useEffect não cria intervalo
        const completedTrigger = { id: 55, status: 'completed', execution_history: [] };

        AuthContext.fetchWithAuth = vi.fn()
            .mockResolvedValue({ ok: true, json: async () => ({ items: [], total: 0 }) });

        const { result } = renderHook(() => useTriggerHistory());
        await waitFor(() => expect(result.current.loading).toBe(false));

        const callsBefore = AuthContext.fetchWithAuth.mock.calls.length;

        act(() => { result.current.setMonitoringTrigger(completedTrigger); });

        // Aguarda brevemente — nenhum poll adicional deve ter ocorrido
        await new Promise(r => setTimeout(r, 200));

        expect(AuthContext.fetchWithAuth.mock.calls.length).toBe(callsBefore);
        expect(result.current.monitoringTrigger?.status).toBe('completed');
    });

    it('deve limpar o monitoringTrigger ao fechar o modal', async () => {
        const { result } = renderHook(() => useTriggerHistory());
        await waitFor(() => expect(result.current.loading).toBe(false));

        act(() => { result.current.setMonitoringTrigger({ id: 1, status: 'queued' }); });
        expect(result.current.monitoringTrigger).not.toBeNull();

        act(() => { result.current.setMonitoringTrigger(null); });
        expect(result.current.monitoringTrigger).toBeNull();
    });
});

