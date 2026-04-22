import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import React from 'react';
import Integrations from './Integrations';
import { fetchWithAuth } from '../AuthContext';

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

vi.mock('../config', () => ({ API_URL: '/api' }));
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
}));

describe('Integrations Page Interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
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

  it('alterna visibilidade dos detalhes ao clicar nos elementos de toggle', async () => {
    await act(async () => {
      render(<Integrations />);
    });

    await waitFor(() => expect(screen.getByText('Test Integration')).toBeInTheDocument());
    
    const editBtn = screen.getByTestId('edit-icon').closest('button');
    fireEvent.click(editBtn);

    await waitFor(() => expect(screen.getByTestId('mapping-header-mapping-1')).toBeInTheDocument());
    
    expect(screen.getByDisplayValue(/Compra Aprovada/i)).toBeInTheDocument();

    const header = screen.getByTestId('mapping-header-mapping-1');
    fireEvent.click(header);
    
    await waitFor(() => expect(screen.queryByDisplayValue(/Compra Aprovada/i)).not.toBeInTheDocument());

    fireEvent.click(header);
    await waitFor(() => expect(screen.getByDisplayValue(/Compra Aprovada/i)).toBeInTheDocument());

    const label = screen.getByTestId('trigger-label');
    fireEvent.click(label);
    
    await waitFor(() => expect(screen.queryByDisplayValue(/Compra Aprovada/i)).not.toBeInTheDocument());
  });

  it('reseta os filtros do histórico de disparos ao clicar no botão de reset', async () => {
    await act(async () => {
      render(<Integrations />);
    });

    await waitFor(() => expect(screen.getByText('Test Integration')).toBeInTheDocument());
    const disparosBtn = screen.getByText(/Disparos/i);
    fireEvent.click(disparosBtn);

    await waitFor(() => expect(screen.getByText(/Histórico de Disparos:/i)).toBeInTheDocument());
    
    const resetBtn = screen.getByTitle('Limpar Filtros e Resetar');
    fireEvent.click(resetBtn);

    await waitFor(() => {
        const fetchCalls = vi.mocked(fetchWithAuth).mock.calls;
        const dispatchCalls = fetchCalls.filter(call => call[0].includes('dispatches'));
        expect(dispatchCalls.length).toBeGreaterThanOrEqual(1);
        
        const lastCall = dispatchCalls[dispatchCalls.length - 1][0];
        expect(lastCall).not.toContain('search=');
        expect(lastCall).not.toContain('event_type=');
    });
  });
});
