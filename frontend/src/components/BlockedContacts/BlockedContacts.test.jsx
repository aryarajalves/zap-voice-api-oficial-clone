import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import BlockedContacts from './index';
import { useClient } from '../../../contexts/ClientContext';
import { fetchWithAuth } from '../../../AuthContext';

// Mocking dependencies
vi.mock('../../../contexts/ClientContext');
vi.mock('../../../AuthContext');
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
        
        expect(screen.getByText(/Gatilhos de Auto-Bloqueio/i)).toBeInTheDocument();
        
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
        
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });

    it('allows adding keywords', async () => {
        render(<BlockedContacts />);
        
        const input = screen.getByPlaceholderText(/Ex: Parar, Sair/i);
        const button = screen.getByText('Adicionar');
        
        fireEvent.change(input, { target: { value: 'cancelar' } });
        fireEvent.click(button);
        
        await waitFor(() => {
            expect(screen.getByText('cancelar')).toBeInTheDocument();
        });
    });

    it('shows confirmation modal before unblocking', async () => {
        render(<BlockedContacts />);
        
        await waitFor(() => screen.getByText('5511999999999'));
        
        const deleteButtons = screen.getAllByTitle('Desbloquear');
        fireEvent.click(deleteButtons[0]);
        
        expect(screen.getByText(/Tem certeza que deseja remover o bloqueio/i)).toBeInTheDocument();
    });
});
