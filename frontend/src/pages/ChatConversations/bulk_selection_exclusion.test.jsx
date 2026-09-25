import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ChatListSidebar from './components/ChatListSidebar';

describe('ChatConversations - Seleção em Massa com Exclusão de Conversas Específicas', () => {
    const mockConversations = [
        { id: 1, contact_name: 'Aryaraj', phone: '5511999990001', labels: [] },
        { id: 2, contact_name: 'Bruna', phone: '5511999990002', labels: [] },
        { id: 3, contact_name: 'Carlos', phone: '5511999990003', labels: [] }
    ];

    const baseEngine = {
        conversations: mockConversations,
        availableLabels: [],
        availableLabelsDetails: [],
        getLabelColor: () => '#3b82f6',
        selectedConvoIds: [],
        setSelectedConvoIds: vi.fn(),
        isLoadingConvos: false,
        totalConvos: 2274,
        limit: 20,
        setLimit: vi.fn(),
        page: 1,
        setPage: vi.fn(),
        handleBulkArchive: vi.fn(),
        setConfirmDeleteConvos: vi.fn(),
        handleToggleArchive: vi.fn(),
        setDeletingConvoId: vi.fn()
    };

    const baseProps = {
        activeTab: 'todos',
        setActiveTab: vi.fn(),
        statusFilter: 'open',
        setStatusFilter: vi.fn(),
        searchQuery: '',
        setSearchQuery: vi.fn(),
        selectedLabelFilter: null,
        setSelectedLabelFilter: vi.fn(),
        activeFilterTab: null,
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
        engine: baseEngine,
        selectedConvo: null,
        setSelectedConvo: vi.fn(),
        selectAllPages: true,
        setSelectAllPages: vi.fn(),
        excludedConvoIds: [],
        setExcludedConvoIds: vi.fn(),
        setIsBulkTagModalOpen: vi.fn(),
        isOpenAiConfigured: false,
        isAnalyzingAi: false,
        handleAnalyzeBulkChatsDoubts: vi.fn(),
        formatTime: vi.fn()
    };

    it('deve exibir o total correto quando todas as páginas estão selecionadas (ex: 2274 selecionados)', () => {
        render(<ChatListSidebar {...baseProps} />);
        expect(screen.getByText('2274 selecionados')).toBeInTheDocument();
        expect(screen.getByText(/Todos os/)).toBeInTheDocument();
        expect(screen.getByText('2274')).toBeInTheDocument();
    });

    it('quando 1 conversa é desmarcada, deve calcular totalConvos - excludedConvoIds.length (2273 selecionados)', () => {
        const { container } = render(
            <ChatListSidebar
                {...baseProps}
                selectAllPages={true}
                excludedConvoIds={[1]} // Aryaraj (id 1) desmarcado
            />
        );

        // O badge deve indicar 2273 selecionados e NÃO 19 ou 2
        expect(screen.getByText('2273 selecionados')).toBeInTheDocument();
        // O banner deve avisar sobre 1 desmarcado
        expect(container.textContent).toContain('1 desmarcado');
    });

    it('ao clicar no checkbox de uma conversa já selecionada via selectAllPages, deve adicionar seu ID aos excluídos', () => {
        const setExcludedConvoIds = vi.fn();
        render(
            <ChatListSidebar
                {...baseProps}
                selectAllPages={true}
                excludedConvoIds={[]}
                setExcludedConvoIds={setExcludedConvoIds}
            />
        );

        // Encontra o checkbox da conversa Aryaraj (id: 1)
        const checkboxes = screen.getAllByRole('checkbox');
        // O primeiro é o "Selecionar todas", os seguintes são as conversas
        const aryarajCheckbox = checkboxes[1];
        expect(aryarajCheckbox).toBeChecked();

        fireEvent.click(aryarajCheckbox);

        // Deve invocar setExcludedConvoIds adicionando o ID 1
        expect(setExcludedConvoIds).toHaveBeenCalled();
        const updater = setExcludedConvoIds.mock.calls[0][0];
        const newExcluded = typeof updater === 'function' ? updater([]) : updater;
        expect(newExcluded).toContain(1);
    });

    it('ao clicar no checkbox de uma conversa que já estava excluída, deve removê-la dos excluídos para voltar a selecioná-la', () => {
        const setExcludedConvoIds = vi.fn();
        render(
            <ChatListSidebar
                {...baseProps}
                selectAllPages={true}
                excludedConvoIds={[1]}
                setExcludedConvoIds={setExcludedConvoIds}
            />
        );

        const checkboxes = screen.getAllByRole('checkbox');
        const aryarajCheckbox = checkboxes[1];
        // Como o ID 1 está excluído, seu checkbox deve estar desmarcado
        expect(aryarajCheckbox).not.toBeChecked();

        fireEvent.click(aryarajCheckbox);

        // Deve invocar setExcludedConvoIds removendo o ID 1
        expect(setExcludedConvoIds).toHaveBeenCalled();
        const updater = setExcludedConvoIds.mock.calls[0][0];
        const newExcluded = typeof updater === 'function' ? updater([1]) : updater;
        expect(newExcluded).not.toContain(1);
    });

    it('ao clicar em arquivar em massa, deve enviar excluded_ids junto com select_all_pages: true', () => {
        const mockBulkArchive = vi.fn();
        const { container } = render(
            <ChatListSidebar
                {...baseProps}
                selectAllPages={true}
                excludedConvoIds={[1]}
                engine={{
                    ...baseEngine,
                    handleBulkArchive: mockBulkArchive
                }}
            />
        );

        const archiveBtn = container.querySelector('#bulk-archive-btn');
        expect(archiveBtn).toBeInTheDocument();
        fireEvent.click(archiveBtn);

        expect(mockBulkArchive).toHaveBeenCalledWith(
            true,
            expect.objectContaining({
                select_all_pages: true,
                excluded_ids: [1]
            })
        );
    });
});
