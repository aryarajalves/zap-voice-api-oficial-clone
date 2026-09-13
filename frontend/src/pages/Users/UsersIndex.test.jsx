import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Users from './index';
import { fetchWithAuth, useAuth } from '../../AuthContext';

vi.mock('../../AuthContext');
vi.mock('react-hot-toast', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        loading: vi.fn(),
        dismiss: vi.fn()
    }
}));

class MockWebSocket {
    constructor() {
        this.onmessage = null;
        this.onerror = null;
    }
    close() {}
}

const mockCurrentUser = {
    id: 'user-admin',
    name: 'Super Admin',
    email: 'admin@zapvoice.com',
    role: 'super_admin'
};

const mockUsersList = [
    {
        id: 'u1',
        full_name: 'Ana Maria',
        email: 'ana@zapvoice.com',
        role: 'admin',
        is_active: true,
        client_ids: ['c1']
    },
    {
        id: 'u2',
        full_name: 'Carlos Vendedor',
        email: 'carlos@zapvoice.com',
        role: 'vendedor',
        is_active: true,
        client_ids: ['c1']
    }
];

const mockClientsList = [
    { id: 'c1', name: 'Empresa Alpha', whatsapp_number: '5511999990001' }
];

const mockInvitationsList = [
    {
        id: 'inv-1',
        token: 'token-abc-123',
        role: 'vendedor',
        client_ids: ['c1'],
        created_at: '2026-09-13T10:00:00Z',
        expires_at: null,
        is_used: false
    }
];

describe('Users Page (Users/index.jsx)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useAuth.mockReturnValue({ user: mockCurrentUser });
        global.WebSocket = MockWebSocket;

        fetchWithAuth.mockImplementation((url, options = {}) => {
            if (url.includes('/auth/users') && (!options.method || options.method === 'GET')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockUsersList)
                });
            }
            if (url.includes('/clients/') && (!options.method || options.method === 'GET')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockClientsList)
                });
            }
            if (url.includes('/auth/invitations') && (!options.method || options.method === 'GET')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockInvitationsList)
                });
            }
            if (url.includes('/auth/users') && options.method === 'DELETE') {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ success: true })
                });
            }
            if (url.includes('/auth/invitations') && options.method === 'DELETE') {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ success: true })
                });
            }
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve([])
            });
        });
    });

    it('renders header, navigation tabs, user list and filter', async () => {
        render(<Users />);

        expect(screen.getByText('Gestão de Usuários')).toBeInTheDocument();
        expect(screen.getByText('Novo Usuário')).toBeInTheDocument();
        expect(screen.getByText('Usuários Ativos')).toBeInTheDocument();
        expect(screen.getByText('Links de Convite')).toBeInTheDocument();
        expect(screen.getByText('Projetos')).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText('Ana Maria')).toBeInTheDocument();
            expect(screen.getByText('Carlos Vendedor')).toBeInTheDocument();
        });
    });

    it('filters users by search term', async () => {
        render(<Users />);

        await waitFor(() => {
            expect(screen.getByText('Ana Maria')).toBeInTheDocument();
        });

        const searchInput = screen.getByPlaceholderText(/Buscar por nome ou email/i);
        fireEvent.change(searchInput, { target: { value: 'Carlos' } });

        expect(screen.getByText('Carlos Vendedor')).toBeInTheDocument();
        expect(screen.queryByText('Ana Maria')).not.toBeInTheDocument();
    });

    it('switches between tabs (Invitations and Projects)', async () => {
        render(<Users />);

        await waitFor(() => {
            expect(screen.getByText('Ana Maria')).toBeInTheDocument();
        });

        // Switch to Invitations tab
        const inviteTabBtn = screen.getByText('Links de Convite');
        fireEvent.click(inviteTabBtn);

        await waitFor(() => {
            expect(screen.getByText('vendedor')).toBeInTheDocument();
            expect(screen.getByText('Empresa Alpha')).toBeInTheDocument();
        });

        // Switch to Projects tab
        const projectsTabBtn = screen.getByText('Projetos');
        fireEvent.click(projectsTabBtn);

        await waitFor(() => {
            expect(screen.getByText('Projetos Compartilhados')).toBeInTheDocument();
        });
    });

    it('opens create user modal when clicking Novo Usuário', () => {
        render(<Users />);

        const newBtn = screen.getByText('Novo Usuário');
        fireEvent.click(newBtn);

        expect(screen.getByText(/Convidar Novo Usuário/i)).toBeInTheDocument();
    });

    it('opens confirmation modal and deletes user', async () => {
        render(<Users />);

        await waitFor(() => {
            expect(screen.getByText('Carlos Vendedor')).toBeInTheDocument();
        });

        const deleteButtons = screen.getAllByTitle('Excluir Usuário');
        fireEvent.click(deleteButtons[1]);

        await waitFor(() => {
            expect(screen.getByText('Sim, Excluir')).toBeInTheDocument();
        });

        const confirmBtn = screen.getByText('Sim, Excluir');
        fireEvent.click(confirmBtn);

        await waitFor(() => {
            expect(fetchWithAuth).toHaveBeenCalledWith(
                expect.stringContaining('/auth/users/u2'),
                expect.objectContaining({ method: 'DELETE' })
            );
        });
    });

    it('opens confirmation modal and revokes invitation', async () => {
        render(<Users />);

        // Switch to invitations tab
        const inviteTabBtn = screen.getByText('Links de Convite');
        fireEvent.click(inviteTabBtn);

        await waitFor(() => {
            expect(screen.getByText('vendedor')).toBeInTheDocument();
        });

        const revokeBtn = screen.getByTitle('Revogar Convite');
        fireEvent.click(revokeBtn);

        await waitFor(() => {
            expect(screen.getByText('Revogar Link de Convite?')).toBeInTheDocument();
        });

        const confirmBtn = screen.getByText('Sim, Revogar');
        fireEvent.click(confirmBtn);

        await waitFor(() => {
            expect(fetchWithAuth).toHaveBeenCalledWith(
                expect.stringContaining('/auth/invitations/inv-1'),
                expect.objectContaining({ method: 'DELETE' })
            );
        });
    });
});
