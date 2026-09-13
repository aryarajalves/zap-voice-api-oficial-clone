import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
    useContactsModalLogic,
    getContactPhone,
    useContactsModalPagination,
    useContactsSelection,
    useContactsActions
} from './useContactsModalLogic';

describe('Modularização de useContactsModalLogic', () => {
    it('deve extrair telefone de diferentes formatos de contato com getContactPhone', () => {
        expect(getContactPhone('5511999999999')).toBe('5511999999999');
        expect(getContactPhone({ phone_number: '5511888888888' })).toBe('5511888888888');
        expect(getContactPhone({ whatsapp: '5511777777777' })).toBe('5511777777777');
        expect(getContactPhone(null)).toBe('');
    });

    it('deve controlar paginação corretamente com useContactsModalPagination', () => {
        const mockModal = {
            isOpen: true,
            contacts: Array.from({ length: 50 }, (_, i) => ({ phone: `55119999900${i}` }))
        };

        const { result } = renderHook(() => useContactsModalPagination({
            contactsModal: mockModal,
            contactsTotal: 50,
            contactsPage: 1,
            setContactsPage: vi.fn(),
            contactsPerPage: 20,
            setContactsPerPage: vi.fn(),
            contactsFilter: 'all',
            contactsTypeFilter: 'all',
            contactsErrorFilter: 'all'
        }));

        expect(result.current.totalCount).toBe(50);
        expect(result.current.totalPages).toBe(3);
        expect(result.current.perPage).toBe(20);
    });

    it('deve permitir seleção individual e alternância em useContactsSelection', () => {
        const contacts = [
            { phone: '5511999991111' },
            { phone: '5511999992222' }
        ];

        const { result } = renderHook(() => useContactsSelection({
            safeModalContacts: contacts,
            displayContacts: contacts,
            totalCount: 2,
            isClientSidePaging: true,
            getAllTargetContacts: vi.fn()
        }));

        expect(result.current.selectedPhones).toEqual([]);

        act(() => {
            result.current.toggleSelectOne(contacts[0]);
        });

        expect(result.current.selectedPhones).toEqual(['5511999991111']);
        expect(result.current.isSelected(contacts[0])).toBe(true);
        expect(result.current.isSelected(contacts[1])).toBe(false);

        act(() => {
            result.current.toggleSelectAll();
        });

        expect(result.current.selectedPhones).toEqual(['5511999991111', '5511999992222']);
    });

    it('deve inicializar o hook principal consolidando todos os submódulos', () => {
        const setModal = vi.fn();
        const { result } = renderHook(() => useContactsModalLogic({
            contactsModal: { isOpen: true, contacts: [] },
            setContactsModal: setModal,
            contactsFilter: 'all',
            contactsTypeFilter: 'all',
            contactsErrorFilter: 'all',
            activeClient: { id: 1 },
            onRefresh: vi.fn()
        }));

        expect(result.current.selectedPhones).toEqual([]);
        expect(result.current.isTagModalOpen).toBe(false);
        expect(result.current.isConfirmBlockOpen).toBe(false);
        expect(result.current.handleOpenTagModal).toBeTypeOf('function');
        expect(result.current.handleBlockSelectedContacts).toBeTypeOf('function');
        expect(result.current.handleRestSelectedContacts).toBeTypeOf('function');
    });
});
