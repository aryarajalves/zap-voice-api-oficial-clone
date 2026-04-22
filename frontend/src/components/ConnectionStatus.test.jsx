import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import ConnectionStatus from './ConnectionStatus';

// Mocks
vi.mock('../config', () => ({ API_URL: 'http://localhost:8000' }));

vi.mock('../AuthContext', () => ({
  useAuth: () => ({ user: { role: 'admin' } }),
  fetchWithAuth: vi.fn(),
}));

vi.mock('../contexts/ClientContext', () => ({
  useClient: () => ({ activeClient: { id: 1, name: 'TestClient' } }),
}));

vi.mock('react-icons/fi', () => ({
  FiCheckCircle: () => <span data-testid="icon-check" />,
  FiXCircle: () => <span data-testid="icon-x-circle" />,
  FiLoader: ({ className }) => <span data-testid="icon-loader" className={className} />,
  FiServer: () => <span data-testid="icon-server" />,
  FiMessageSquare: () => <span data-testid="icon-msg" />,
  FiDatabase: () => <span data-testid="icon-db" />,
  FiCloud: () => <span data-testid="icon-cloud" />,
}));

describe('ConnectionStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('não renderiza para usuário com role=user', () => {
    const { useAuth } = require('../AuthContext');
    vi.mocked(useAuth).mockReturnValue({ user: { role: 'user' } });

    const { container } = render(<ConnectionStatus />);
    expect(container.firstChild).toBeNull();
  });

  it('não renderiza sem activeClient', () => {
    const { useClient } = require('../contexts/ClientContext');
    vi.mocked(useClient).mockReturnValue({ activeClient: null });

    const { container } = render(<ConnectionStatus />);
    expect(container.firstChild).toBeNull();
  });

  it('renderiza labels dos serviços', async () => {
    const { fetchWithAuth } = require('../AuthContext');
    vi.mocked(fetchWithAuth).mockResolvedValue({
      ok: true,
      json: async () => ({ whatsapp: 'online', chatwoot: 'online', rabbitmq: 'online' }),
    });

    render(<ConnectionStatus />);

    await waitFor(() => {
      expect(screen.getByText(/WhatsApp/i)).toBeInTheDocument();
      expect(screen.getByText(/Chatwoot/i)).toBeInTheDocument();
      expect(screen.getByText(/RabbitMQ/i)).toBeInTheDocument();
    });
  });

  it('exibe ícone de loading inicial', async () => {
    const { fetchWithAuth } = require('../AuthContext');
    // Promessa que nunca resolve para manter estado de loading
    vi.mocked(fetchWithAuth).mockReturnValue(new Promise(() => {}));

    render(<ConnectionStatus />);
    // Loading spinner deve estar presente
    const loaders = screen.getAllByTestId('icon-loader');
    expect(loaders.length).toBeGreaterThan(0);
  });

  it('exibe erro quando fetch falha', async () => {
    const { fetchWithAuth } = require('../AuthContext');
    vi.mocked(fetchWithAuth).mockRejectedValue(new Error('Backend offline'));

    render(<ConnectionStatus />);

    await waitFor(() => {
      expect(screen.getByText(/backend offline/i)).toBeInTheDocument();
    });
  });

  it('botão de refresh chama checkHealth novamente', async () => {
    const { fetchWithAuth } = require('../AuthContext');
    vi.mocked(fetchWithAuth).mockResolvedValue({
      ok: true,
      json: async () => ({ whatsapp: 'online', chatwoot: 'online', rabbitmq: 'online' }),
    });

    render(<ConnectionStatus />);

    await waitFor(() => {
      expect(screen.getByText(/WhatsApp/i)).toBeInTheDocument();
    });

    const refreshBtn = screen.getByTitle(/Atualizar Status/i);
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(vi.mocked(fetchWithAuth)).toHaveBeenCalledTimes(2);
    });
  });
});
