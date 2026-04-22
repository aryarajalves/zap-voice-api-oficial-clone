import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import TriggerHistory from './TriggerHistory';
import { fetchWithAuth } from '../AuthContext';

vi.mock('../config', () => ({ API_URL: 'http://localhost:8000', WS_URL: 'ws://localhost:8000' }));

vi.mock('react-hot-toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('../AuthContext', () => ({
  useAuth: () => ({ user: { role: 'super_admin' } }),
  fetchWithAuth: vi.fn(),
}));

vi.mock('../contexts/ClientContext', () => ({
  useClient: () => ({ activeClient: { id: 1 } }),
}));

vi.mock('./ConfirmModal', () => ({
  default: ({ isOpen, onConfirm, onClose, title }) =>
    isOpen ? (
      <div data-testid="confirm-modal">
        <button data-testid="confirm-btn" onClick={onConfirm}>Confirmar</button>
        <button data-testid="cancel-btn" onClick={onClose}>Cancelar</button>
      </div>
    ) : null,
}));

vi.mock('../hooks/useScrollLock', () => ({ default: vi.fn() }));

const mockTriggers = [
  {
    id: 1,
    is_bulk: true,
    template_name: 'hello_world',
    status: 'completed',
    total_sent: 10,
    total_failed: 1,
    created_at: '2026-03-20T10:00:00Z',
    scheduled_time: '2026-03-20T10:00:00Z',
    updated_at: '2026-03-20T10:05:00Z',
    contacts_list: [{ phone: '111' }, { phone: '222' }],
  },
  {
    id: 2,
    is_bulk: false,
    funnel: { name: 'Funil de Boas Vindas' },
    status: 'processing',
    total_sent: 0,
    total_failed: 0,
    created_at: '2026-03-20T11:00:00Z',
    scheduled_time: '2026-03-20T11:30:00Z',
    contacts_list: [],
  },
  {
    id: 3,
    is_bulk: false,
    funnel: { name: 'Funil de Abandono' },
    status: 'cancelled',
    failure_reason: 'Cancelado por evento compra_aprovada',
    created_at: '2026-03-20T12:00:00Z',
    scheduled_time: '2026-03-20T12:05:00Z',
    contacts_list: [],
  },
];

describe('TriggerHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exibe loading inicialmente', () => {
    vi.mocked(fetchWithAuth).mockReturnValue(new Promise(() => {}));

    render(<TriggerHistory />);
    expect(screen.getByText(/carregando/i)).toBeInTheDocument();
  });

  it('renderiza lista de disparos após carregar', async () => {
    vi.mocked(fetchWithAuth).mockResolvedValue({
      ok: true,
      json: async () => ({ items: mockTriggers, total: 2 }),
    });

    render(<TriggerHistory />);

    await waitFor(() => {
      expect(screen.getByText(/hello_world/i)).toBeInTheDocument();
      expect(screen.getByText(/Funil de Boas Vindas/i)).toBeInTheDocument();
    });
  });

  it('exibe mensagem quando não há disparos', async () => {
    vi.mocked(fetchWithAuth).mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], total: 0 }),
    });

    render(<TriggerHistory />);

    await waitFor(() => {
      expect(screen.getByText(/nenhum/i)).toBeInTheDocument();
    });
  });

  it('exibe erro quando fetch falha', async () => {
    vi.mocked(fetchWithAuth).mockRejectedValue(new Error('Network error'));

    render(<TriggerHistory />);

    await waitFor(() => {
      expect(screen.queryByText(/carregando/i)).not.toBeInTheDocument();
    });
  });

  it('filtra por nome ao digitar no campo de busca', async () => {
    vi.mocked(fetchWithAuth).mockResolvedValue({
      ok: true,
      json: async () => ({ items: mockTriggers, total: 2 }),
    });

    render(<TriggerHistory />);

    await waitFor(() => {
      expect(screen.getByText(/hello_world/i)).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/buscar/i);
    fireEvent.change(searchInput, { target: { value: 'hello_world' } });

    expect(screen.getByText(/hello_world/i)).toBeInTheDocument();
  });

  it('exibe os rótulos de Chegada e Disparo', async () => {
    vi.mocked(fetchWithAuth).mockResolvedValue({
      ok: true,
      json: async () => ({ items: mockTriggers, total: 2 }),
    });
    render(<TriggerHistory />);
    await waitFor(() => {
      expect(screen.getAllByText(/Chegada:/i)[0]).toBeInTheDocument();
      expect(screen.getAllByText(/Disparo:/i)[0]).toBeInTheDocument();
    });
  });

  it('exibe o rótulo de status correto (Enviado, Enviando, etc.)', async () => {
    vi.mocked(fetchWithAuth).mockResolvedValue({
      ok: true,
      json: async () => ({ items: mockTriggers, total: 3 }),
    });

    render(<TriggerHistory />);

    await waitFor(() => {
      expect(screen.getByText('Enviado')).toBeInTheDocument();
      expect(screen.getByText('Enviando...')).toBeInTheDocument();
      expect(screen.getByText('Cancelado')).toBeInTheDocument();
    });
  });
});
