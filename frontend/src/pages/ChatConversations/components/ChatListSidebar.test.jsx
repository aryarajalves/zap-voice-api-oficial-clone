import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ChatListSidebar from './ChatListSidebar';

// Mock do ChatListFilters para simular o callback onLabelDropdownOpenChange
vi.mock('./ChatListFilters', () => ({
    default: ({ onLabelDropdownOpenChange }) => (
        <div data-testid="mock-chat-list-filters">
            <button
                type="button"
                data-testid="simulate-open-label-dropdown"
                onClick={() => onLabelDropdownOpenChange && onLabelDropdownOpenChange(true)}
            >
                Abrir Marcadores
            </button>
            <button
                type="button"
                data-testid="simulate-close-label-dropdown"
                onClick={() => onLabelDropdownOpenChange && onLabelDropdownOpenChange(false)}
            >
                Fechar Marcadores
            </button>
        </div>
    )
}));

// Mock do ChatListItem
vi.mock('./ChatListItem', () => ({
    default: ({ convo }) => (
        <div data-testid={`chat-item-${convo.id}`}>{convo.contact_name}</div>
    )
}));

describe('ChatListSidebar - Controle de Scroll durante Filtro de Marcadores', () => {
    const mockEngine = {
        conversations: [
            { id: 1, contact_name: 'Cliente Alpha', labels: ['vip'] },
            { id: 2, contact_name: 'Cliente Beta', labels: ['suporte'] }
        ],
        availableLabels: ['vip', 'suporte'],
        availableLabelsDetails: [],
        getLabelColor: () => '#3b82f6',
        selectedConvoIds: [],
        setSelectedConvoIds: vi.fn(),
        isLoadingConvos: false,
        totalConvos: 2,
        limit: 20,
        setLimit: vi.fn(),
        page: 1,
        setPage: vi.fn(),
        handleBulkArchive: vi.fn(),
        setConfirmDeleteConvos: vi.fn(),
        handleToggleArchive: vi.fn(),
        setDeletingConvoId: vi.fn()
    };

    const defaultProps = {
        activeTab: 'todos',
        setActiveTab: vi.fn(),
        statusFilter: 'open',
        setStatusFilter: vi.fn(),
        searchQuery: '',
        setSearchQuery: vi.fn(),
        selectedLabelFilter: null,
        setSelectedLabelFilter: vi.fn(),
        activeFilterTab: 'marcador',
        setActiveFilterTab: vi.fn(),
        filterWindowOpen: false,
        setFilterWindowOpen: vi.fn(),
        filterTemplate24h: false,
        setFilterTemplate24h: vi.fn(),
        filterUnread: false,
        setFilterUnread: vi.fn(),
        filterHasNote: false,
        setFilterHasNote: vi.fn(),
        filterUrgent: false,
        setFilterUrgent: vi.fn(),
        filterHasReplied: false,
        setFilterHasReplied: vi.fn(),
        filterHasActiveFunnel: false,
        setFilterHasActiveFunnel: vi.fn(),
        filterBlockStatus: null,
        setFilterBlockStatus: vi.fn(),
        filterStartDate: '',
        setFilterStartDate: vi.fn(),
        filterEndDate: '',
        setFilterEndDate: vi.fn(),
        orderBy: 'recent',
        setOrderBy: vi.fn(),
        engine: mockEngine,
        selectedConvo: null,
        setSelectedConvo: vi.fn(),
        selectAllPages: false,
        setSelectAllPages: vi.fn(),
        setIsBulkTagModalOpen: vi.fn(),
        isOpenAiConfigured: false,
        isAnalyzingAi: false,
        handleAnalyzeBulkChatsDoubts: vi.fn(),
        formatTime: vi.fn()
    };

    it('renderiza o container de conversas com scroll normal (overflow-y-auto e custom-scrollbar) quando o filtro esta fechado', () => {
        const { container } = render(<ChatListSidebar {...defaultProps} />);

        const scrollContainer = container.querySelector('#chat-conversations-list-scroll-container');
        expect(scrollContainer).toBeInTheDocument();
        expect(scrollContainer).toHaveClass('overflow-y-auto');
        expect(scrollContainer).toHaveClass('custom-scrollbar');
        expect(scrollContainer).not.toHaveClass('overflow-hidden');
    });

    it('oculta e bloqueia o scroll (overflow-hidden e pointer-events-none) quando o dropdown de marcadores e aberto', () => {
        const { container } = render(<ChatListSidebar {...defaultProps} />);

        const scrollContainer = container.querySelector('#chat-conversations-list-scroll-container');
        const openBtn = screen.getByTestId('simulate-open-label-dropdown');

        act(() => {
            openBtn.click();
        });

        // Quando o filtro de marcadores abre, o scroll deve sumir e ser bloqueado
        expect(scrollContainer).toHaveClass('overflow-hidden');
        expect(scrollContainer).toHaveClass('pointer-events-none');
        expect(scrollContainer).not.toHaveClass('overflow-y-auto');
        expect(scrollContainer).not.toHaveClass('custom-scrollbar');
    });

    it('restaura o scroll normal quando o dropdown de marcadores e fechado', () => {
        const { container } = render(<ChatListSidebar {...defaultProps} />);

        const scrollContainer = container.querySelector('#chat-conversations-list-scroll-container');
        const openBtn = screen.getByTestId('simulate-open-label-dropdown');
        const closeBtn = screen.getByTestId('simulate-close-label-dropdown');

        act(() => {
            openBtn.click();
        });
        expect(scrollContainer).toHaveClass('overflow-hidden');

        act(() => {
            closeBtn.click();
        });
        // Scroll restaurado com estilo customizado
        expect(scrollContainer).toHaveClass('overflow-y-auto');
        expect(scrollContainer).toHaveClass('custom-scrollbar');
        expect(scrollContainer).not.toHaveClass('overflow-hidden');
    });
});
