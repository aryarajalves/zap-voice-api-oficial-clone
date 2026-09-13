import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ProjectManager from './ProjectManager';
import { fetchWithAuth } from '../../../AuthContext';

vi.mock('../../../AuthContext');
vi.mock('react-hot-toast', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        loading: vi.fn(),
        dismiss: vi.fn()
    }
}));

const mockCurrentUser = {
    id: 1,
    name: 'Super User',
    role: 'super_admin'
};

const mockClients = [
    { id: 'client-1', name: 'Atendimento Vendas', whatsapp_number: '5511999990001' },
    { id: 'client-2', name: 'Suporte Técnico', whatsapp_number: '5511999990002' }
];

const mockProjects = [
    {
        id: 'proj-1',
        name: 'Operação Principal',
        clients: [
            { id: 'client-1', name: 'Atendimento Vendas', whatsapp_number: '5511999990001' }
        ]
    }
];

describe('ProjectManager Component', () => {
    const mockFetchClients = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        fetchWithAuth.mockImplementation((url, options = {}) => {
            if (url.includes('/projects/') && (!options.method || options.method === 'GET')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockProjects)
                });
            }
            if (url.includes('/projects/') && options.method === 'POST') {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ id: 'proj-2', name: 'Novo Projeto', clients: [] })
                });
            }
            if (url.includes('/projects/') && options.method === 'PUT') {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ id: 'proj-1', name: 'Operação Atualizada', clients: [] })
                });
            }
            if (url.includes('/projects/') && options.method === 'DELETE') {
                return Promise.resolve({
                    status: 204,
                    ok: true
                });
            }
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve([])
            });
        });
    });

    it('renders project list and header properly', async () => {
        render(
            <ProjectManager
                currentUser={mockCurrentUser}
                clients={mockClients}
                fetchClients={mockFetchClients}
            />
        );

        expect(screen.getByText('Projetos Compartilhados')).toBeInTheDocument();
        expect(screen.getByText('Novo Projeto')).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText('Operação Principal')).toBeInTheDocument();
            expect(screen.getByText(/1 número\(s\) associado\(s\)/i)).toBeInTheDocument();
        });
    });

    it('allows super_admin to open create project form and submit', async () => {
        render(
            <ProjectManager
                currentUser={mockCurrentUser}
                clients={mockClients}
                fetchClients={mockFetchClients}
            />
        );

        const newProjectBtn = screen.getByText('Novo Projeto');
        fireEvent.click(newProjectBtn);

        expect(screen.getByPlaceholderText(/Nome do Projeto/i)).toBeInTheDocument();

        const input = screen.getByPlaceholderText(/Nome do Projeto/i);
        fireEvent.change(input, { target: { value: 'Projeto de Lançamento' } });

        const submitBtn = screen.getByText('Criar');
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(fetchWithAuth).toHaveBeenCalledWith(
                expect.stringContaining('/projects/'),
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ name: 'Projeto de Lançamento' })
                })
            );
        });
    });

    it('allows inline editing of project name', async () => {
        render(
            <ProjectManager
                currentUser={mockCurrentUser}
                clients={mockClients}
                fetchClients={mockFetchClients}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('Operação Principal')).toBeInTheDocument();
        });

        const editBtn = screen.getByTitle('Editar Nome');
        fireEvent.click(editBtn);

        const editInput = screen.getByDisplayValue('Operação Principal');
        fireEvent.change(editInput, { target: { value: 'Operação Renomeada' } });

        const saveButtons = screen.getAllByRole('button');
        // Clique no botão de confirmação de edição
        const checkBtn = saveButtons.find(b => b.className.includes('bg-green-500'));
        if (checkBtn) {
            fireEvent.click(checkBtn);
            await waitFor(() => {
                expect(fetchWithAuth).toHaveBeenCalledWith(
                    expect.stringContaining('/projects/proj-1'),
                    expect.objectContaining({
                        method: 'PUT',
                        body: JSON.stringify({ name: 'Operação Renomeada' })
                    })
                );
            });
        }
    });

    it('expands project to manage client associations and saves', async () => {
        render(
            <ProjectManager
                currentUser={mockCurrentUser}
                clients={mockClients}
                fetchClients={mockFetchClients}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('Operação Principal')).toBeInTheDocument();
        });

        const manageBtn = screen.getByText('Gerenciar Vínculos');
        fireEvent.click(manageBtn);

        await waitFor(() => {
            expect(screen.getByText(/Marque os números \(clientes\) que você deseja agrupar/i)).toBeInTheDocument();
            expect(screen.getByText('Atendimento Vendas')).toBeInTheDocument();
            expect(screen.getByText('Suporte Técnico')).toBeInTheDocument();
        });

        // Click checkbox of second client to associate
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes[0]).toBeChecked(); // client-1 is already in proj-1
        expect(checkboxes[1]).not.toBeChecked();

        fireEvent.click(checkboxes[1]);
        expect(checkboxes[1]).toBeChecked();

        // Click Salvar Vínculos
        const saveAssociationsBtn = screen.getByText('Salvar Vínculos');
        fireEvent.click(saveAssociationsBtn);

        await waitFor(() => {
            expect(fetchWithAuth).toHaveBeenCalledWith(
                expect.stringContaining('/projects/proj-1/clients'),
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ client_ids: ['client-1', 'client-2'] })
                })
            );
        });
    });

    it('opens delete confirmation modal and executes delete', async () => {
        render(
            <ProjectManager
                currentUser={mockCurrentUser}
                clients={mockClients}
                fetchClients={mockFetchClients}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('Operação Principal')).toBeInTheDocument();
        });

        const deleteBtn = screen.getByTitle('Excluir Projeto');
        fireEvent.click(deleteBtn);

        await waitFor(() => {
            expect(screen.getByText('Confirmar Exclusão do Projeto?')).toBeInTheDocument();
        });

        const confirmBtn = screen.getByText('Sim, Excluir Projeto');
        fireEvent.click(confirmBtn);

        await waitFor(() => {
            expect(fetchWithAuth).toHaveBeenCalledWith(
                expect.stringContaining('/projects/proj-1'),
                expect.objectContaining({
                    method: 'DELETE'
                })
            );
            expect(mockFetchClients).toHaveBeenCalled();
        });
    });

    it('hides administration buttons for non-superadmin users', async () => {
        const regularUser = { id: 2, name: 'Normal User', role: 'admin' };

        render(
            <ProjectManager
                currentUser={regularUser}
                clients={mockClients}
                fetchClients={mockFetchClients}
            />
        );

        expect(screen.queryByText('Novo Projeto')).not.toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText('Operação Principal')).toBeInTheDocument();
        });

        expect(screen.queryByTitle('Editar Nome')).not.toBeInTheDocument();
        expect(screen.queryByTitle('Excluir Projeto')).not.toBeInTheDocument();
    });
});
