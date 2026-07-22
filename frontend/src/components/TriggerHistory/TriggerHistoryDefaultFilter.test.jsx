import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TriggerHistoryOrchestrator from './index';

vi.mock('../../contexts/ClientContext', () => ({
    useClient: () => ({ activeClient: { id: 1 } })
}));

vi.mock('./hooks/useTriggerHistory', () => ({
    useTriggerHistory: (refreshKey, initialTriggerType) => ({
        user: { role: 'admin' },
        activeClient: { id: 1 },
        triggers: [],
        loading: false,
        monitoringTrigger: null,
        setMonitoringTrigger: vi.fn(),
        modalConfig: { isOpen: false },
        setModalConfig: vi.fn(),
        editParamsModal: { isOpen: false },
        setEditParamsModal: vi.fn(),
        errorModal: { isOpen: false },
        setErrorModal: vi.fn(),
        childrenModal: { isOpen: false },
        setChildrenModal: vi.fn(),
        contactsModal: { isOpen: false, contacts: [] },
        setContactsModal: vi.fn(),
        triggerType: initialTriggerType,
        setTriggerType: vi.fn(),
        selectedIds: [],
        setSelectedIds: vi.fn(),
        page: 1,
        setPage: vi.fn(),
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: 10,
        setItemsPerPage: vi.fn(),
        showOnlyPinned: false,
        setShowOnlyPinned: vi.fn(),
        selectedFolderId: null,
        setSelectedFolderId: vi.fn(),
        folders: [],
        loadingFolders: false,
        contactsPage: 1,
        setContactsPage: vi.fn(),
        contactsPerPage: 10,
        setContactsPerPage: vi.fn(),
        contactsTotal: 0,
        contactsSearchPhone: '',
        setContactsSearchPhone: vi.fn(),
        contactsFilterDdi: 'ALL',
        setContactsFilterDdi: vi.fn(),
        contactsFilterDdd: 'ALL',
        setContactsFilterDdd: vi.fn(),
        contactsDdiOptions: [],
        contactsDddOptions: [],
        fetchHistory: vi.fn()
    })
}));

describe('TriggerHistoryOrchestrator Default Filter', () => {
    it('deve selecionar "Disparos em Massa" (bulk) por padrão no dropdown', () => {
        render(<TriggerHistoryOrchestrator />);
        const selects = screen.getAllByRole('combobox');
        expect(selects[0].value).toBe('bulk');
    });
});
