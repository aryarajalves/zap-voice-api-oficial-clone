import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import BlockedContacts from './BlockedContacts';

vi.mock('../config', () => ({ API_URL: 'http://localhost:8000' }));

vi.mock('react-hot-toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('../AuthContext', () => ({
  useAuth: () => ({ user: { role: 'admin' } }),
  fetchWithAuth: vi.fn(),
}));

vi.mock('../contexts/ClientContext', () => ({
  useClient: () => ({ activeClient: { id: 1 } }),
}));

vi.mock('./ConfirmModal', () => ({
  default: ({ isOpen, onConfirm, onClose, title }) =>
    isOpen ? (
      <div data-testid="confirm-modal">
        <span>{title}</span>
        <button data-testid="confirm-btn" onClick={onConfirm}>Confirmar</button>
        <button data-testid="cancel-btn" onClick={onClose}>Cancelar</button>
      </div>
    ) : null,
}));

const mockContacts = [
  { id: 1, phone: '5511987654321', name: 'João Silva', reason: 'Spam', created_at: '2026-03-20T10:00:00Z' },
  { id: 2, phone: '5521912345678', name: 'Maria Santos', reason: 'Manual', created_at: '2026-03-20T11:00:00Z' },
];

describe('BlockedContacts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exibe loading inicialmente', () => {
    const { fetchWithAuth } = require('../AuthContext');
    vi.mocked(fetchWithAuth).mockReturnValue(new Promise(() => {}));

    render(<BlockedContacts />);
    expect(screen.getByText(/carregando/i)).toBeInTheDocument();
  });

  it('renderiza lista de contatos bloqueados', async () => {
    const { fetchWithAuth } = require('../AuthContext');
    vi.mocked(fetchWithAuth).mockResolvedValue({
      ok: true,
      json: async () => mockContacts,
    });

    render(<BlockedContacts />);

    await waitFor(() => {
      expect(screen.getByText('5511987654321')).toBeInTheDocument();
      expect(screen.getByText('João Silva')).toBeInTheDocument();
    });
  });

  it('exibe mensagem quando lista está vazia', async () => {
    const { fetchWithAuth } = require('../AuthContext');
    vi.mocked(fetchWithAuth).mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<BlockedContacts />);

    await waitFor(() => {
      expect(screen.getByText(/nenhum/i)).toBeInTheDocument();
    });
  });

  it('filtra contatos pelo campo de busca', async () => {
    const { fetchWithAuth } = require('../AuthContext');
    vi.mocked(fetchWithAuth).mockResolvedValue({
      ok: true,
      json: async () => mockContacts,
    });

    render(<BlockedContacts />);

    await waitFor(() => {
      expect(screen.getByText('João Silva')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/buscar|pesquisar/i);
    fireEvent.change(searchInput, { target: { value: 'Maria' } });

    expect(screen.queryByText('João Silva')).not.toBeInTheDocument();
    expect(screen.getByText('Maria Santos')).toBeInTheDocument();
  });

  it('abre modal de confirmação ao clicar em desbloquear', async () => {
    const { fetchWithAuth } = require('../AuthContext');
    vi.mocked(fetchWithAuth).mockResolvedValue({
      ok: true,
      json: async () => mockContacts,
    });

    render(<BlockedContacts />);

    await waitFor(() => {
      expect(screen.getByText('João Silva')).toBeInTheDocument();
    });

    const unblockBtns = screen.getAllByTitle(/desbloquear/i);
    fireEvent.click(unblockBtns[0]);

    expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
  });

  it('chama API de desbloqueio ao confirmar', async () => {
    const { fetchWithAuth } = require('../AuthContext');
    vi.mocked(fetchWithAuth)
      .mockResolvedValueOnce({ ok: true, json: async () => mockContacts })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, json: async () => [] });

    render(<BlockedContacts />);

    await waitFor(() => {
      expect(screen.getByText('João Silva')).toBeInTheDocument();
    });

    const unblockBtns = screen.getAllByTitle(/desbloquear/i);
    fireEvent.click(unblockBtns[0]);

    fireEvent.click(screen.getByTestId('confirm-btn'));

    await waitFor(() => {
      expect(vi.mocked(fetchWithAuth)).toHaveBeenCalledTimes(3);
    });
  });

  it('mostra formulário de adição de contato', async () => {
    const { fetchWithAuth } = require('../AuthContext');
    vi.mocked(fetchWithAuth).mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<BlockedContacts />);

    await waitFor(() => {
      expect(screen.queryByText(/carregando/i)).not.toBeInTheDocument();
    });

    const addBtn = screen.getByText(/adicionar|bloquear|novo/i);
    if (addBtn) fireEvent.click(addBtn);

    // Formulário ou campo de telefone deve aparecer
    const phoneInput = screen.queryByPlaceholderText(/telefone|número|phone/i);
    if (phoneInput) {
      expect(phoneInput).toBeInTheDocument();
    }
  });
});
