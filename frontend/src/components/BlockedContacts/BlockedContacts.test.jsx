import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import BlockedContacts from './index';
import { useClient } from '../../contexts/ClientContext';
import { fetchWithAuth } from '../../AuthContext';

// Mocking dependencies
vi.mock('../../contexts/ClientContext');
vi.mock('../../AuthContext');
vi.mock('react-hot-toast');
vi.mock('xlsx', () => ({
    read: vi.fn(),
    utils: { sheet_to_json: vi.fn() }
}));

const mockClient = { id: 'client-123', name: 'Test Client' };

describe('BlockedContacts Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useClient.mockReturnValue({ activeClient: mockClient });
        fetchWithAuth.mockImplementation((url) => {
            if (url.includes('/blocked/')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve([
                        { id: 1, phone: '5511999999999', name: 'John Doe', reason: 'Manual', created_at: new Date().toISOString() },
                        { id: 2, phone: '5511888888888', name: 'Jane Smith', reason: 'Importação', created_at: new Date().toISOString() }
                    ])
                });
            }
            if (url.includes('/settings/')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ AUTO_BLOCK_KEYWORDS: 'parar,sair' })
                });
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
        });
    });

    it('renders the component and loads blocked contacts', async () => {
        render(<BlockedContacts />);
        
        expect(screen.getByText(/Bloqueio Manual de Números/i)).toBeInTheDocument();
        
        await waitFor(() => {
            expect(screen.getByText('5511999999999')).toBeInTheDocument();
            expect(screen.getByText('5511888888888')).toBeInTheDocument();
        });
    });

    it('filters contacts by search term', async () => {
        render(<BlockedContacts />);
        
        await waitFor(() => screen.getByText('5511999999999'));
        
        const searchInput = screen.getByPlaceholderText(/Buscar telefone/i);
        fireEvent.change(searchInput, { target: { value: 'John' } });
        
        await waitFor(() => {
            expect(screen.getByText('John Doe')).toBeInTheDocument();
            expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
        });
    });

    it('allows toggling between list tabs', async () => {
        fetchWithAuth.mockImplementation((url) => {
            if (url.includes('/resting/')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve([
                        { id: 3, phone: '5511777777777', name: 'Resting Lead', reason: 'Falha', expires_at: new Date(Date.now() + 3600000).toISOString() }
                    ])
                });
            }
            if (url.includes('/blocked/')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve([
                        { id: 1, phone: '5511999999999', name: 'John Doe', reason: 'Manual', created_at: new Date().toISOString() }
                    ])
                });
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
        });

        render(<BlockedContacts />);
        
        await waitFor(() => screen.getByText('5511999999999'));
        
        const restingTabButton = screen.getByText(/Em Repouso/i);
        fireEvent.click(restingTabButton);
        
        await waitFor(() => {
            expect(screen.getByText('5511777777777')).toBeInTheDocument();
        });
    });

    it('shows confirmation modal before unblocking', async () => {
        render(<BlockedContacts />);
        
        await waitFor(() => screen.getByText('5511999999999'));
        
        const deleteButtons = screen.getAllByTitle('Desbloquear');
        fireEvent.click(deleteButtons[0]);
        
        expect(screen.getByText(/Tem certeza que deseja remover o bloqueio/i)).toBeInTheDocument();
    });

    it('allows toggling between Permanent and Rest block types in ManualInput', async () => {
        render(<BlockedContacts />);
        
        // Clica na aba de entrada manual se necessário (por padrão está ativa)
        const textarea = screen.getByPlaceholderText(/Cole os números aqui/i);
        expect(textarea).toBeInTheDocument();
        
        // Verifica se a label padrão é de bloqueio permanente
        expect(screen.getByText('Adicionar Números para Bloqueio')).toBeInTheDocument();
        
        // Alterna para Repouso
        const restingBtn = screen.getByText(/Repouso \(24 horas\)/i);
        fireEvent.click(restingBtn);
        
        // Verifica se a label muda para repouso
        await waitFor(() => {
            expect(screen.getByText('Adicionar Números para Repouso')).toBeInTheDocument();
        });
    });
});
