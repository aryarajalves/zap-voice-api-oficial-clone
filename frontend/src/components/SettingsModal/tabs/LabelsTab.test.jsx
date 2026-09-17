import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import LabelsTab from './LabelsTab';

// Mock config
vi.mock('../../../config', () => ({
    API_URL: 'http://localhost:8000/api'
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn()
    }
}));

describe('LabelsTab Unit Tests', () => {
    const mockUser = { id: 1, email: 'admin@zapvoice.com', client_id: 1 };
    const mockActiveClient = { id: 1, name: 'Cliente Teste' };

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.setItem('token', 'fake-jwt-token');
    });

    it('renders label list with accurate conversation usage counts', async () => {
        const mockLabels = [
            { id: 1, name: 'compra-aprovada', color: '#EF4444', is_legacy: false, usage_count: 15 },
            { id: 2, name: 'suporte', color: '#3B82F6', is_legacy: false, usage_count: 1 },
            { id: 3, name: 'sem-uso', color: '#10B981', is_legacy: false, usage_count: 0 },
            { id: 0, name: 'legado-antigo', color: '#64748B', is_legacy: true, usage_count: 3 }
        ];

        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => mockLabels
        });

        render(<LabelsTab user={mockUser} activeClient={mockActiveClient} />);

        // Aguardar carregamento da lista
        await waitFor(() => {
            expect(screen.getByText('Marcadores Cadastrados')).toBeInTheDocument();
        });

        // Validar plural (15 conversas)
        expect(screen.getByText(/compra-aprovada/)).toBeInTheDocument();
        expect(screen.getByText(/\(15 conversas\)/)).toBeInTheDocument();

        // Validar singular (1 conversa)
        expect(screen.getByText(/suporte/)).toBeInTheDocument();
        expect(screen.getByText(/\(1 conversa\)/)).toBeInTheDocument();

        // Validar contagem zero (0 conversas)
        expect(screen.getByText(/sem-uso/)).toBeInTheDocument();
        expect(screen.getByText(/\(0 conversas\)/)).toBeInTheDocument();

        // Validar etiqueta legada e contagem (3 conversas)
        expect(screen.getByText(/legado-antigo/)).toBeInTheDocument();
        expect(screen.getByText(/\(3 conversas\)/)).toBeInTheDocument();
        expect(screen.getByText('Nas Conversas')).toBeInTheDocument();
    });

    it('paginates labels correctly with a maximum of 20 items per page', async () => {
        // Gerar 25 etiquetas de teste
        const mockLabels = Array.from({ length: 25 }, (_, i) => ({
            id: i + 1,
            name: `Etiqueta-${String(i + 1).padStart(2, '0')}`,
            color: '#3B82F6',
            is_legacy: false,
            usage_count: i
        }));

        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => mockLabels
        });

        render(<LabelsTab user={mockUser} activeClient={mockActiveClient} />);

        await waitFor(() => {
            expect(screen.getByText('Marcadores Cadastrados')).toBeInTheDocument();
        });

        // Total de 25 marcadores no badge
        expect(screen.getByText('25 marcadores')).toBeInTheDocument();

        // Na página 1, deve exibir Etiqueta-01 até Etiqueta-20
        expect(screen.getByText(/Etiqueta-01/)).toBeInTheDocument();
        expect(screen.getByText(/Etiqueta-20/)).toBeInTheDocument();

        // Etiqueta-21 e Etiqueta-25 NÃO devem estar na primeira página
        expect(screen.queryByText(/Etiqueta-21/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Etiqueta-25/)).not.toBeInTheDocument();

        // Indicador de paginação da página 1
        expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
        expect(screen.getByText((content, node) => {
            const hasText = (n) => n.textContent === 'Mostrando 1 a 20 de 25 marcadores';
            const nodeHasText = hasText(node);
            const childrenDontHaveText = Array.from(node?.children || []).every(
                (child) => !hasText(child)
            );
            return nodeHasText && childrenDontHaveText;
        })).toBeInTheDocument();

        // Clicar na página 2
        const page2Button = screen.getByRole('button', { name: '2' });
        fireEvent.click(page2Button);

        // Agora na página 2, deve exibir Etiqueta-21 até Etiqueta-25
        expect(screen.getByText(/Etiqueta-21/)).toBeInTheDocument();
        expect(screen.getByText(/Etiqueta-25/)).toBeInTheDocument();

        // Etiqueta-01 não deve mais estar na tela
        expect(screen.queryByText(/Etiqueta-01/)).not.toBeInTheDocument();

        // Clicar no botão 'Anterior' deve retornar para a página 1
        const anteriorBtn = screen.getByTitle('Página Anterior');
        fireEvent.click(anteriorBtn);

        expect(screen.getByText(/Etiqueta-01/)).toBeInTheDocument();
        expect(screen.queryByText(/Etiqueta-21/)).not.toBeInTheDocument();
    });

    it('opens confirmation modal and can cancel deletion', async () => {
        const mockLabels = [
            { id: 1, name: 'etiqueta-para-excluir', color: '#EF4444', is_legacy: false, usage_count: 2 }
        ];

        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => mockLabels
        });

        render(<LabelsTab user={mockUser} activeClient={mockActiveClient} />);

        await waitFor(() => {
            expect(screen.getByText(/etiqueta-para-excluir/)).toBeInTheDocument();
        });

        const deleteButton = screen.getByTitle('Excluir Marcador');
        fireEvent.click(deleteButton);

        // Modal de confirmação deve abrir com o texto
        expect(screen.getByText('Excluir Marcador')).toBeInTheDocument();
        expect(screen.getByText(/Tem certeza que deseja excluir o marcador/)).toBeInTheDocument();

        // Clicar em Cancelar
        const cancelBtn = screen.getByText('Cancelar');
        fireEvent.click(cancelBtn);

        // Modal deve fechar
        await waitFor(() => {
            expect(screen.queryByText(/Tem certeza que deseja excluir o marcador/)).not.toBeInTheDocument();
        });
    });

    it('opens transfer modal and triggers transfer API successfully', async () => {
        const mockLabels = [
            { id: 1, name: 'origem_tag', color: '#EF4444', is_legacy: false, usage_count: 5 },
            { id: 2, name: 'destino_tag', color: '#3B82F6', is_legacy: false, usage_count: 0 }
        ];

        global.fetch = vi.fn().mockImplementation((url, options) => {
            if (url.includes('/chat/labels/transfer')) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({
                        status: 'ok',
                        message: 'Contatos transferidos com sucesso!',
                        updated_conversations: 5
                    })
                });
            }
            return Promise.resolve({
                ok: true,
                json: async () => mockLabels
            });
        });

        render(<LabelsTab user={mockUser} activeClient={mockActiveClient} />);

        await waitFor(() => {
            expect(screen.getByText(/origem_tag/)).toBeInTheDocument();
        });

        // Clica no botão de transferir contatos no card
        const transferButtons = screen.getAllByTitle('Transferir contatos para outra etiqueta');
        fireEvent.click(transferButtons[0]);

        // Modal de transferência deve abrir
        expect(screen.getByText('Transferir Contatos de Marcador')).toBeInTheDocument();
        expect(screen.getByText('5 conversas')).toBeInTheDocument();

        // Confirma a transferência
        const submitTransferBtn = document.getElementById('btn-confirm-transfer');
        fireEvent.click(submitTransferBtn);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:8000/api/chat/labels/transfer',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({
                        source_label: 'origem_tag',
                        target_label: 'destino_tag',
                        action: 'move'
                    })
                })
            );
        });
    });

    it('filters registered labels list in real time using search input', async () => {
        const mockLabels = [
            { id: 1, name: 'compra-aprovada', color: '#EF4444', usage_count: 5 },
            { id: 2, name: 'lead-frio', color: '#3B82F6', usage_count: 2 },
            { id: 3, name: 'lead-quente', color: '#10B981', usage_count: 8 }
        ];

        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => mockLabels
        });

        render(<LabelsTab user={mockUser} activeClient={mockActiveClient} />);

        await waitFor(() => {
            expect(screen.getByText(/compra-aprovada/)).toBeInTheDocument();
        });

        const searchInput = screen.getByPlaceholderText('Filtrar marcadores...');
        expect(searchInput).toBeInTheDocument();

        // Digita "lead" na busca
        fireEvent.change(searchInput, { target: { value: 'lead' } });

        // Apenas 'lead-frio' e 'lead-quente' devem aparecer
        expect(screen.getByText(/lead-frio/)).toBeInTheDocument();
        expect(screen.getByText(/lead-quente/)).toBeInTheDocument();
        expect(screen.queryByText(/compra-aprovada/)).not.toBeInTheDocument();

        // Limpa a busca
        const clearBtn = screen.getByTitle('Limpar filtro');
        fireEvent.click(clearBtn);

        // Todos os 3 marcadores voltam
        expect(screen.getByText(/compra-aprovada/)).toBeInTheDocument();
    });

    it('searches and filters options inside SearchableLabelSelect in transfer modal', async () => {
        const mockLabels = [
            { id: 1, name: 'origem_tag', color: '#3B82F6', usage_count: 3 },
            { id: 2, name: 'whatsapp_leads', color: '#10B981', usage_count: 5 },
            { id: 3, name: 'financeiro_pendente', color: '#F59E0B', usage_count: 2 },
            { id: 4, name: 'whatsapp_suporte', color: '#8B5CF6', usage_count: 1 }
        ];

        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => mockLabels
        });

        render(<LabelsTab user={mockUser} activeClient={mockActiveClient} />);

        await waitFor(() => {
            expect(screen.getByText(/origem_tag/)).toBeInTheDocument();
        });

        // Abre o modal de transferência
        const transferButtons = screen.getAllByTitle('Transferir contatos para outra etiqueta');
        fireEvent.click(transferButtons[0]);

        expect(screen.getByText('Transferir Contatos de Marcador')).toBeInTheDocument();

        // Abre o dropdown pesquisável
        const trigger = document.getElementById('btn-label-search-trigger');
        expect(trigger).toBeInTheDocument();
        fireEvent.click(trigger);

        // Input de pesquisa do dropdown deve estar presente
        const dropdownSearch = document.getElementById('input-search-label-filter');
        expect(dropdownSearch).toBeInTheDocument();

        // Digita "suporte" para filtrar
        fireEvent.change(dropdownSearch, { target: { value: 'suporte' } });

        // Dropdown deve conter 'whatsapp_suporte' e não 'financeiro_pendente'
        const dropdown = document.getElementById('searchable-label-dropdown');
        expect(dropdown).toBeInTheDocument();
        expect(dropdown).toHaveTextContent('whatsapp_suporte');
        expect(dropdown).not.toHaveTextContent('financeiro_pendente');

        // Clica na opção 'whatsapp_suporte' dentro do dropdown
        const matchingElements = screen.getAllByText('whatsapp_suporte');
        fireEvent.click(matchingElements[matchingElements.length - 1]);

        // Valida que o trigger agora exibe 'whatsapp_suporte'
        expect(trigger).toHaveTextContent('whatsapp_suporte');
    });
});

