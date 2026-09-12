import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TriggerFunnelModal from './TriggerFunnelModal';
import ChatListSidebar from './components/ChatListSidebar';

// Mock contexts and auth
vi.mock('../../contexts/ClientContext', () => ({
    useClient: () => ({
        activeClient: { id: 1, name: 'Test Client' }
    })
}));

vi.mock('../../AuthContext', () => ({
    fetchWithAuth: vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve([
            { id: 10, name: 'Funil de Vendas VIP', description: 'Funil principal de conversão', is_active: true, is_archived: false }
        ])
    }))
}));

describe('Bulk Funnel in Chat Conversations', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('TriggerFunnelModal exibe textos de lote corretos quando isBulk=true', async () => {
        const onTrigger = vi.fn();
        const onClose = vi.fn();

        render(
            <TriggerFunnelModal
                isOpen={true}
                onClose={onClose}
                onTrigger={onTrigger}
                isTriggering={false}
                selectedCount={3}
                isBulk={true}
            />
        );

        // Header deve conter a contagem de conversas
        expect(screen.getByText('Disparar Funil (3 conversas)')).toBeDefined();

        // Banner informativo deve conter a quantidade de contatos
        expect(screen.getByText('3 contato(s)')).toBeDefined();

        // Botão de disparo deve indicar a quantidade
        expect(screen.getByText('Disparar para 3 contato(s)')).toBeDefined();

        // Aguarda carregar o funil mockado
        await waitFor(() => {
            expect(screen.getByText('Funil de Vendas VIP')).toBeDefined();
        });

        // Seleciona o funil e dispara
        fireEvent.click(screen.getByText('Funil de Vendas VIP'));
        const triggerBtn = screen.getByText('Disparar para 3 contato(s)');
        fireEvent.click(triggerBtn);

        expect(onTrigger).toHaveBeenCalledWith(10);
    });

    it('ChatListSidebar exibe o botão #bulk-funnel-btn quando há conversas selecionadas e abre o modal', () => {
        const mockEngine = {
            selectedConvoIds: [101, 102],
            totalConvos: 2,
            isBulkFunnelModalOpen: false,
            setIsBulkFunnelModalOpen: vi.fn(),
            confirmDeleteConvos: null,
            setConfirmDeleteConvos: vi.fn(),
            handleBulkArchive: vi.fn(),
            conversations: [
                { id: 101, contact_name: 'Lead 1', phone: '5511999991111' },
                { id: 102, contact_name: 'Lead 2', phone: '5511999992222' }
            ],
            isLoadingConvos: false,
            page: 1,
            limit: 20,
            getLabelColor: () => '#3b82f6',
            availableLabels: [],
            chatLabels: [],
            contactLabels: []
        };

        render(
            <ChatListSidebar
                activeTab="todos"
                setActiveTab={vi.fn()}
                statusFilter="open"
                setStatusFilter={vi.fn()}
                searchQuery=""
                setSearchQuery={vi.fn()}
                selectedLabelFilter=""
                setSelectedLabelFilter={vi.fn()}
                activeFilterTab="todos"
                setActiveFilterTab={vi.fn()}
                filterWindowOpen={false}
                setFilterWindowOpen={vi.fn()}
                filterTemplate24h={false}
                setFilterTemplate24h={vi.fn()}
                filterUnread={false}
                setFilterUnread={vi.fn()}
                filterHasNote={false}
                setFilterHasNote={vi.fn()}
                filterUrgent={false}
                setFilterUrgent={vi.fn()}
                filterHasReplied={false}
                setFilterHasReplied={vi.fn()}
                filterHasActiveFunnel={false}
                setFilterHasActiveFunnel={vi.fn()}
                filterBlockStatus="all"
                setFilterBlockStatus={vi.fn()}
                filterStartDate=""
                setFilterStartDate={vi.fn()}
                filterEndDate=""
                setFilterEndDate={vi.fn()}
                orderBy="desc"
                setOrderBy={vi.fn()}
                engine={mockEngine}
                selectedConvo={null}
                setSelectedConvo={vi.fn()}
                selectAllPages={false}
                setSelectAllPages={vi.fn()}
                setIsBulkTagModalOpen={vi.fn()}
                isOpenAiConfigured={false}
                isAnalyzingAi={false}
                handleAnalyzeBulkChatsDoubts={vi.fn()}
                formatTime={() => '12:00'}
            />
        );

        // O botão #bulk-funnel-btn deve estar visível
        const funnelBtn = screen.getByTitle('Disparar funil para conversas selecionadas');
        expect(funnelBtn).toBeDefined();
        expect(screen.getByText('Funil')).toBeDefined();

        // Ao clicar no botão, chama setIsBulkFunnelModalOpen(true)
        fireEvent.click(funnelBtn);
        expect(mockEngine.setIsBulkFunnelModalOpen).toHaveBeenCalledWith(true);
    });
});
