import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import HumanAgents from './HumanAgents';
import { fetchWithAuth } from '../AuthContext';

vi.mock('../AuthContext', () => ({
    fetchWithAuth: vi.fn(),
}));

const mockClient = { id: 11 };

vi.mock('../contexts/ClientContext', () => ({
    useClient: () => ({ activeClient: mockClient }),
}));

vi.mock('../config', () => ({
    API_URL: 'http://localhost:8000/api',
}));

describe('HumanAgents - Seleção Manual, Seleção Total e Exclusão em Lote', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const mockConversations = [
        {
            id: 101,
            contact_name: 'Fernanda Dias',
            phone: '5511980000204',
            human_handover_at: new Date().toISOString(),
            last_message_content: 'Nosso suporte funciona de segunda a sábado',
        },
        {
            id: 102,
            contact_name: 'Olivia Pereira',
            phone: '5511980002118',
            human_handover_at: new Date().toISOString(),
            last_message_content: 'Confirmamos o seu pagamento aqui no sistema',
        },
    ];

    it('renderiza a lista de contatos com checkboxes de seleção e barra de seleção todos', async () => {
        fetchWithAuth.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ data: mockConversations, total: 2 }),
        });

        render(<HumanAgents onNavigateToChat={vi.fn()} />);

        await waitFor(() => {
            expect(screen.getByText('Fernanda Dias')).toBeInTheDocument();
            expect(screen.getByText('Olivia Pereira')).toBeInTheDocument();
        });

        expect(screen.getByLabelText(/Selecionar todos na página \(2\)/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Selecionar Fernanda Dias/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Selecionar Olivia Pereira/i)).toBeInTheDocument();
    });

    it('permite selecionar um contato manualmente e exibe a barra de ações com o botão deletar', async () => {
        fetchWithAuth.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ data: mockConversations, total: 2 }),
        });

        render(<HumanAgents onNavigateToChat={vi.fn()} />);

        await waitFor(() => {
            expect(screen.getByText('Fernanda Dias')).toBeInTheDocument();
        });

        // Marca o checkbox de Fernanda Dias
        const checkboxFernanda = screen.getByLabelText(/Selecionar Fernanda Dias/i);
        expect(checkboxFernanda.checked).toBe(false);

        fireEvent.click(checkboxFernanda);
        expect(checkboxFernanda.checked).toBe(true);

        // Barra de ação deve mostrar 1 selecionado e botão de Deletar (1)
        expect(screen.getByText('1 selecionado')).toBeInTheDocument();
        expect(screen.getByText('Deletar (1)')).toBeInTheDocument();
        expect(screen.getByText('Finalizar (1)')).toBeInTheDocument();
    });

    it('permite selecionar todos os contatos de uma só vez', async () => {
        fetchWithAuth.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ data: mockConversations, total: 2 }),
        });

        render(<HumanAgents onNavigateToChat={vi.fn()} />);

        await waitFor(() => {
            expect(screen.getByText('Fernanda Dias')).toBeInTheDocument();
        });

        const selectAllCheckbox = screen.getByLabelText(/Selecionar todos na página \(2\)/i);
        fireEvent.click(selectAllCheckbox);

        // Todos devem estar marcados
        const checkboxFernanda = screen.getByLabelText(/Selecionar Fernanda Dias/i);
        const checkboxOlivia = screen.getByLabelText(/Selecionar Olivia Pereira/i);
        expect(checkboxFernanda.checked).toBe(true);
        expect(checkboxOlivia.checked).toBe(true);

        expect(screen.getByText('2 selecionados')).toBeInTheDocument();
        expect(screen.getByText('Deletar (2)')).toBeInTheDocument();
    });

    it('ao clicar em deletar selecionados, abre o modal de confirmação e executa o DELETE', async () => {
        fetchWithAuth.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ data: mockConversations, total: 2 }),
        });

        render(<HumanAgents onNavigateToChat={vi.fn()} />);

        await waitFor(() => {
            expect(screen.getByText('Fernanda Dias')).toBeInTheDocument();
        });

        // Seleciona todos
        const selectAllCheckbox = screen.getByLabelText(/Selecionar todos na página \(2\)/i);
        fireEvent.click(selectAllCheckbox);

        // Aguarda o botão Deletar (2) estar presente no DOM
        const btnDelete = await screen.findByRole('button', { name: /Deletar \(2\)/i });
        fireEvent.click(btnDelete);

        // Verifica modal de confirmação
        await waitFor(() => {
            expect(screen.getByRole('heading', { name: /Deletar 2 Conversas/i })).toBeInTheDocument();
        });

        // Mock para o endpoint DELETE /chat/conversations
        fetchWithAuth.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ status: 'ok', deleted_count: 2 }),
        });
        // Mock para o reload subsequente
        fetchWithAuth.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ data: [], total: 0 }),
        });

        // Clica no botão de confirmação do modal
        const btnConfirm = screen.getByRole('button', { name: /Deletar Permanentemente/i });
        fireEvent.click(btnConfirm);

        await waitFor(() => {
            expect(fetchWithAuth).toHaveBeenCalledWith(
                'http://localhost:8000/api/chat/conversations',
                expect.objectContaining({
                    method: 'DELETE',
                    body: JSON.stringify({ ids: [101, 102] }),
                }),
                11
            );
        });
    });

    it('exibe opção para selecionar todas as páginas quando total > totalFiltered e seleciona todos ao clicar', async () => {
        // Mock inicial: página 1 traz 2 itens, mas total geral é 5
        fetchWithAuth.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ data: mockConversations, total: 5 }),
        });

        render(<HumanAgents onNavigateToChat={vi.fn()} />);

        await waitFor(() => {
            expect(screen.getByText('Fernanda Dias')).toBeInTheDocument();
        });

        // Clica no checkbox da página
        const selectAllCheckbox = screen.getByLabelText(/Selecionar todos na página \(2\)/i);
        fireEvent.click(selectAllCheckbox);

        // Deve exibir o banner de todas as páginas
        await waitFor(() => {
            expect(screen.getByText(/contatos desta página estão selecionados/i)).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Selecionar todos os 5 contatos da fila \(todas as páginas\)/i })).toBeInTheDocument();
        });

        // Mock para chamada que busca todos os contatos da fila: ?page=1&limit=5
        const allFiveConversations = [
            ...mockConversations,
            { id: 103, contact_name: 'Carlos Lima', phone: '5511980000003' },
            { id: 104, contact_name: 'Bruna Costa', phone: '5511980000004' },
            { id: 105, contact_name: 'Eduardo Rocha', phone: '5511980000005' },
        ];

        fetchWithAuth.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ data: allFiveConversations, total: 5 }),
        });

        const btnSelectAllPages = screen.getByText(/Selecionar todos os 5 contatos da fila \(todas as páginas\)/i);
        fireEvent.click(btnSelectAllPages);

        // Aguarda carregar todos e atualizar os contadores
        await waitFor(() => {
            expect(fetchWithAuth).toHaveBeenCalledWith(
                'http://localhost:8000/api/chat/human-conversations?page=1&limit=5',
                {},
                11
            );
        });

        await waitFor(() => {
            expect(screen.getByText(/5 selecionados \(todas as páginas\)/i)).toBeInTheDocument();
            expect(screen.getByText(/Deletar \(5\)/i)).toBeInTheDocument();
            expect(screen.getByText(/Finalizar \(5\)/i)).toBeInTheDocument();
        });

        // Agora testa a finalização em lote de todos os 5
        const btnFinish = screen.getByText(/Finalizar \(5\)/i);
        fireEvent.click(btnFinish);

        // Modal de confirmação
        await waitFor(() => {
            expect(screen.getByRole('heading', { name: /Finalizar 5 Atendimentos/i })).toBeInTheDocument();
        });

        // Mock do endpoint de bulk finish
        fetchWithAuth.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ status: 'ok', finished_count: 5 }),
        });
        // Mock do reload
        fetchWithAuth.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ data: [], total: 0 }),
        });

        const btnConfirmFinish = screen.getByRole('button', { name: /Finalizar Todos/i });
        fireEvent.click(btnConfirmFinish);

        await waitFor(() => {
            expect(fetchWithAuth).toHaveBeenCalledWith(
                'http://localhost:8000/api/chat/conversations/bulk-finish-human-handover',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ ids: [101, 102, 103, 104, 105] }),
                }),
                11
            );
        });
    });
});

