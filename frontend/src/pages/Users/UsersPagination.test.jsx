import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TablePagination from './components/TablePagination';
import UserTable from './components/UserTable';
import InvitationTable from './components/InvitationTable';

describe('TablePagination Component', () => {
    it('deve renderizar o total de itens e a página atual', () => {
        render(
            <TablePagination
                currentPage={1}
                setCurrentPage={() => {}}
                itemsPerPage={5}
                setItemsPerPage={() => {}}
                totalItems={12}
            />
        );

        expect(screen.getByText('1-5')).toBeInTheDocument();
        expect(screen.getByText('12')).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('deve desabilitar o botão Anterior na primeira página', () => {
        render(
            <TablePagination
                currentPage={1}
                setCurrentPage={() => {}}
                itemsPerPage={5}
                setItemsPerPage={() => {}}
                totalItems={10}
            />
        );

        const btnAnterior = screen.getByText('Anterior').closest('button');
        expect(btnAnterior).toBeDisabled();
    });

    it('deve permitir alterar a quantidade de itens por página', () => {
        const setItemsPerPage = vi.fn();
        const setCurrentPage = vi.fn();

        render(
            <TablePagination
                currentPage={2}
                setCurrentPage={setCurrentPage}
                itemsPerPage={5}
                setItemsPerPage={setItemsPerPage}
                totalItems={25}
            />
        );

        const select = screen.getByRole('combobox');
        fireEvent.change(select, { target: { value: '10' } });

        expect(setItemsPerPage).toHaveBeenCalledWith(10);
        expect(setCurrentPage).toHaveBeenCalledWith(1);
    });
});

describe('UserTable com Paginação', () => {
    const dummyUsers = [
        { id: 1, full_name: 'User 1', email: 'u1@test.com', role: 'admin', is_active: true },
        { id: 2, full_name: 'User 2', email: 'u2@test.com', role: 'vendedor', is_active: true },
        { id: 3, full_name: 'User 3', email: 'u3@test.com', role: 'vendedor', is_active: true },
        { id: 4, full_name: 'User 4', email: 'u4@test.com', role: 'vendedor', is_active: true },
        { id: 5, full_name: 'User 5', email: 'u5@test.com', role: 'vendedor', is_active: true },
        { id: 6, full_name: 'User 6', email: 'u6@test.com', role: 'vendedor', is_active: true },
    ];

    it('deve exibir apenas 5 usuários quando itemsPerPage = 5', () => {
        render(
            <UserTable
                users={dummyUsers}
                handleOpenEditModal={() => {}}
                confirmDeleteUser={() => {}}
                currentPage={1}
                setCurrentPage={() => {}}
                itemsPerPage={5}
                setItemsPerPage={() => {}}
            />
        );

        expect(screen.getByText('User 1')).toBeInTheDocument();
        expect(screen.getByText('User 5')).toBeInTheDocument();
        expect(screen.queryByText('User 6')).not.toBeInTheDocument();
    });
});

describe('InvitationTable com Paginação', () => {
    const dummyInvites = [
        { id: 'inv1', role: 'admin', client_ids: [], created_at: '2026-01-01T00:00:00Z', expires_at: null, is_used: false },
        { id: 'inv2', role: 'vendedor', client_ids: [], created_at: '2026-01-01T00:00:00Z', expires_at: null, is_used: false },
        { id: 'inv3', role: 'vendedor', client_ids: [], created_at: '2026-01-01T00:00:00Z', expires_at: null, is_used: false },
        { id: 'inv4', role: 'vendedor', client_ids: [], created_at: '2026-01-01T00:00:00Z', expires_at: null, is_used: false },
        { id: 'inv5', role: 'vendedor', client_ids: [], created_at: '2026-01-01T00:00:00Z', expires_at: null, is_used: false },
        { id: 'inv6', role: 'vendedor', client_ids: [], created_at: '2026-01-01T00:00:00Z', expires_at: null, is_used: false },
    ];

    it('deve limitar a exibição de convites conforme a página', () => {
        render(
            <InvitationTable
                invitations={dummyInvites}
                clients={[]}
                confirmDeleteInvitation={() => {}}
                currentPage={2}
                setCurrentPage={() => {}}
                itemsPerPage={5}
                setItemsPerPage={() => {}}
            />
        );

        expect(screen.getByText(/Mostrando/)).toBeInTheDocument();
        expect(screen.getByText('6-6')).toBeInTheDocument();
    });
});
