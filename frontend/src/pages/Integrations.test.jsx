import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import React from 'react';
import Integrations from './Integrations';
import { fetchWithAuth } from '../AuthContext';

// Timeout global de 2 minutos para lidar com a complexidade do componente
vi.setConfig({ testTimeout: 120000 });

// Mock WebSocket
global.WebSocket = vi.fn(function() {
  return {
    send: vi.fn(),
    close: vi.fn(),
    onmessage: null,
    onopen: null,
    onerror: null,
    onclose: null,
  };
});

// Mock values
const mockIntegrations = [
  {
    id: 1,
    name: 'Test Integration',
    platform: 'hotmart',
    mappings: [
      {
        ui_id: 'mapping-1',
        event_type: 'compra_aprovada',
        delay_minutes: 0,
        delay_seconds: 0,
      },
    ],
  },
];

// Comprehensive mocks
vi.mock('../AuthContext', () => ({
  fetchWithAuth: vi.fn(),
}));

vi.mock('../contexts/ClientContext', () => ({
  useClient: () => ({ activeClient: { id: 1, name: 'Test Client' } }),
}));

vi.mock('../config', () => ({ API_URL: '/api', WS_URL: 'ws://localhost/api/ws' }));
vi.mock('react-hot-toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../components/ConfirmModal', () => ({ default: () => null }));
vi.mock('react-icons/fi', () => ({
  FiZap: () => <span />,
  FiPlus: () => <span />,
  FiEdit2: () => <span data-testid="edit-icon" />,
  FiChevronDown: () => <span />,
  FiTrash2: () => <span />,
  FiPlay: () => <span />,
  FiSettings: () => <span />,
  FiCheckCircle: () => <span />,
  FiMaximize2: () => <span />,
  FiShare2: () => <span />,
  FiXCircle: () => <span />,
  FiRefreshCw: ({ className }) => <span className={className} />,
  FiSearch: () => <span />,
  FiCopy: () => <span />,
  FiX: () => <span />,
  FiCheck: () => <span />,
  FiHistory: () => <span />,
  FiCheckSquare: () => <span />,
}));

describe('Integrations Page Interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Default mock behavior
    vi.mocked(fetchWithAuth).mockImplementation((url) => {
      if (url.includes('dispatches')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ items: [], total: 0 }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => mockIntegrations,
      });
    });
  });

  it('renderiza a página e lista integrações', async () => {
    await act(async () => {
      render(<Integrations />);
    });

    await act(async () => {
      vi.runAllTimers();
    });

    await waitFor(() => expect(screen.getByText('Test Integration')).toBeInTheDocument(), { timeout: 20000 });
  });

  it('seleciona todos os registros do histórico e dispara o reenvio em massa', async () => {
    // Mock do histórico
    const mockHistory = [
      { id: 101, event_type: 'compra_aprovada', status: 'processed', created_at: new Date().toISOString(), payload: {} },
      { id: 102, event_type: 'pix_gerado', status: 'processed', created_at: new Date().toISOString(), payload: {} },
    ];

    vi.mocked(fetchWithAuth).mockImplementation((url) => {
      if (url.includes('history')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockHistory,
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => mockIntegrations,
      });
    });

    await act(async () => {
      render(<Integrations />);
    });

    await act(async () => {
      vi.runAllTimers();
    });

    await waitFor(() => expect(screen.getByText('Test Integration')).toBeInTheDocument(), { timeout: 20000 });

    // Abrir histórico
    const historicoBtn = screen.getByTitle(/Histórico/i);
    fireEvent.click(historicoBtn);

    await waitFor(() => expect(screen.getByText(/Selecionar Todos os Registros/i)).toBeInTheDocument(), { timeout: 20000 });

    // Clicar em Selecionar Todos
    const selectAllBtn = screen.getByText(/Selecionar Todos os Registros/i);
    fireEvent.click(selectAllBtn);

    // Verificar se o botão de reenvio em massa apareceu com a contagem correta
    await waitFor(() => expect(screen.getByText(/Reenviar Selecionados \(2\)/i)).toBeInTheDocument(), { timeout: 20000 });

    // Clicar em Reenviar
    const resendBulkBtn = screen.getByText(/Reenviar Selecionados \(2\)/i);
    fireEvent.click(resendBulkBtn);

    // Verificar se o modal premium apareceu
    await waitFor(() => expect(screen.getByText(/Reenviar Webhooks\?/i)).toBeInTheDocument(), { timeout: 20000 });

    // Confirmar reenvio
    const confirmBtn = screen.getByText(/SIM, REENVIAR/i);
    fireEvent.click(confirmBtn);

    // Verificar se a API foi chamada
    await waitFor(() => {
        const fetchCalls = vi.mocked(fetchWithAuth).mock.calls;
        const bulkResendCall = fetchCalls.find(call => call[0].includes('bulk-resend'));
        expect(bulkResendCall).toBeDefined();
        expect(JSON.parse(bulkResendCall[1].body)).toEqual([101, 102]);
    }, { timeout: 20000 });
  });
});
