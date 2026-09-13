import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
    useTriggerHistory,
    useTriggerHistoryFilters,
    useTriggerHistorySync,
    useTriggerContactsLoader,
    useTriggerNavigation
} from './useTriggerHistory';
import * as ClientContext from '../../../contexts/ClientContext';
import * as AuthContext from '../../../AuthContext';

describe('Modularização de useTriggerHistory', () => {
    beforeEach(() => {
        vi.spyOn(ClientContext, 'useClient').mockReturnValue({
            activeClient: { id: 1, name: 'Cliente Teste' }
        });
        vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
            user: { id: 10, email: 'teste@exemplo.com' }
        });
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ items: [], total: 0 })
        });
    });

    it('deve inicializar useTriggerHistoryFilters com valores padrão e permitir alterações', () => {
        const { result } = renderHook(() => useTriggerHistoryFilters('bulk'));

        expect(result.current.triggerType).toBe('bulk');
        expect(result.current.filterStatus).toBe('all');
        expect(result.current.page).toBe(1);

        act(() => {
            result.current.setFilterName('Campanha VIP');
            result.current.setFilterStatus('completed');
            result.current.setPage(2);
        });

        expect(result.current.filterName).toBe('Campanha VIP');
        expect(result.current.filterStatus).toBe('completed');
        expect(result.current.page).toBe(2);
    });

    it('deve inicializar useTriggerContactsLoader e permitir visualização de contatos com handleViewContacts', () => {
        const setModal = vi.fn();
        const { result } = renderHook(() => useTriggerContactsLoader({
            activeClient: { id: 1 },
            contactsModal: { isOpen: false, triggerId: null },
            setContactsModal: setModal,
            setTriggers: vi.fn()
        }));

        expect(result.current.contactsFilter).toBe('all');
        expect(result.current.contactsPage).toBe(1);

        act(() => {
            result.current.handleViewContacts({ id: 123, template_name: 'aviso_urgente' }, 'failed');
        });

        expect(result.current.contactsFilter).toBe('failed');
        expect(setModal).toHaveBeenCalledWith(expect.objectContaining({
            isOpen: true,
            triggerId: 123
        }));
    });

    it('deve inicializar useTriggerHistory completo consolidando os submódulos', () => {
        const { result } = renderHook(() => useTriggerHistory(0, 'bulk'));

        expect(result.current.triggerType).toBe('bulk');
        expect(result.current.triggers).toEqual([]);
        expect(result.current.fetchHistory).toBeTypeOf('function');
        expect(result.current.handleSelectAll).toBeTypeOf('function');
        expect(result.current.handleViewContacts).toBeTypeOf('function');
        expect(result.current.handleEditParams).toBeTypeOf('function');
    });
});
