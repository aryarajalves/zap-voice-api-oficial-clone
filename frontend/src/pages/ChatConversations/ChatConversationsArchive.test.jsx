import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ChatListFilters from './components/ChatListFilters';
import ActiveChatHeader from './components/ActiveChatHeader';
import ChatListItem from './components/ChatListItem';
import ChatListSidebar from './components/ChatListSidebar';

describe('ChatConversations - Funcionalidades de Arquivamento e Filtros', () => {
    it('ChatListFilters deve conter a opção "Arquivadas" e permitir a seleção', () => {
        const setStatusFilter = vi.fn();
        render(
            <ChatListFilters
                activeTab="todos"
                setActiveTab={vi.fn()}
                statusFilter="open"
                setStatusFilter={setStatusFilter}
                searchQuery=""
                setSearchQuery={vi.fn()}
                availableLabels={[]}
                visibleCount={10}
            />
        );

        const select = screen.getByDisplayValue('Abertas');
        expect(select).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Arquivadas' })).toBeInTheDocument();

        fireEvent.change(select, { target: { value: 'archived' } });
        expect(setStatusFilter).toHaveBeenCalledWith('archived');
    });

    it('ActiveChatHeader deve exibir botão de arquivar e acionar handleToggleArchive', () => {
        const mockToggleArchive = vi.fn();
        const selectedConvo = {
            id: 101,
            phone: '5511999991234',
            contact_name: 'Lead Teste',
            status: 'open'
        };

        render(
            <ActiveChatHeader
                selectedConvo={selectedConvo}
                setSelectedConvo={vi.fn()}
                showRightSidebar={false}
                setShowRightSidebar={vi.fn()}
                engine={{
                    timeLeft24h: '12:00:00',
                    handleToggleStatus: vi.fn(),
                    handleToggleArchive: mockToggleArchive,
                    messages: []
                }}
                handleTogglePin={vi.fn()}
                handleToggleUrgent={vi.fn()}
                handleUnblockContact={vi.fn()}
                setShowFunnelModal={vi.fn()}
                exportConversationToDoc={vi.fn()}
            />
        );

        const archiveBtn = screen.getByTitle('Arquivar conversa');
        expect(archiveBtn).toBeInTheDocument();

        fireEvent.click(archiveBtn);
        expect(mockToggleArchive).toHaveBeenCalled();
    });

    it('ActiveChatHeader deve exibir "Desarquivar conversa" quando o status for archived', () => {
        const selectedConvo = {
            id: 102,
            phone: '5511999995678',
            contact_name: 'Lead Arquivado',
            status: 'archived'
        };

        render(
            <ActiveChatHeader
                selectedConvo={selectedConvo}
                setSelectedConvo={vi.fn()}
                showRightSidebar={false}
                setShowRightSidebar={vi.fn()}
                engine={{
                    timeLeft24h: 'Janela Fechada',
                    handleToggleStatus: vi.fn(),
                    handleToggleArchive: vi.fn(),
                    messages: []
                }}
                handleTogglePin={vi.fn()}
                handleToggleUrgent={vi.fn()}
                handleUnblockContact={vi.fn()}
                setShowFunnelModal={vi.fn()}
                exportConversationToDoc={vi.fn()}
            />
        );

        expect(screen.getByTitle('Desarquivar conversa')).toBeInTheDocument();
    });

    it('ChatListItem deve renderizar badge "Arquivada" e botão de ação rápida', () => {
        const mockArchive = vi.fn();
        const convo = {
            id: 201,
            phone: '5511999998888',
            contact_name: 'Contato Arquivado',
            status: 'archived',
            last_message_content: 'Última mensagem gravada',
            last_message_at: new Date().toISOString()
        };

        render(
            <ChatListItem
                convo={convo}
                isSelected={false}
                isChecked={false}
                onSelect={vi.fn()}
                onToggleCheck={vi.fn()}
                onDelete={vi.fn()}
                onArchive={mockArchive}
                getLabelColor={() => '#3B82F6'}
                formatTime={() => '10:30'}
            />
        );

        expect(screen.getByText('Arquivada')).toBeInTheDocument();
        const unarchiveBtn = screen.getByTitle('Desarquivar conversa');
        expect(unarchiveBtn).toBeInTheDocument();

        fireEvent.click(unarchiveBtn);
        expect(mockArchive).toHaveBeenCalledWith(201, false);
    });

    it('ChatListSidebar deve renderizar botão de arquivamento em lote', () => {
        const mockBulkArchive = vi.fn();
        const engine = {
            conversations: [
                { id: 1, phone: '5511999990001', contact_name: 'Lead 1', status: 'open' },
                { id: 2, phone: '5511999990002', contact_name: 'Lead 2', status: 'open' }
            ],
            selectedConvoIds: [1, 2],
            setSelectedConvoIds: vi.fn(),
            totalConvos: 2,
            limit: 20,
            page: 1,
            setPage: vi.fn(),
            setLimit: vi.fn(),
            handleBulkArchive: mockBulkArchive,
            availableLabels: [],
            getLabelColor: () => '#3B82F6'
        };

        render(
            <ChatListSidebar
                activeTab="todos"
                setActiveTab={vi.fn()}
                statusFilter="open"
                setStatusFilter={vi.fn()}
                searchQuery=""
                setSearchQuery={vi.fn()}
                engine={engine}
                selectedConvo={null}
                setSelectedConvo={vi.fn()}
                selectAllPages={false}
                setSelectAllPages={vi.fn()}
                setIsBulkTagModalOpen={vi.fn()}
                formatTime={() => '10:00'}
            />
        );

        const bulkArchiveBtn = screen.getByTitle('Arquivar conversas selecionadas');
        expect(bulkArchiveBtn).toBeInTheDocument();

        fireEvent.click(bulkArchiveBtn);
        expect(mockBulkArchive).toHaveBeenCalledWith(true, { ids: [1, 2] });
    });
});
