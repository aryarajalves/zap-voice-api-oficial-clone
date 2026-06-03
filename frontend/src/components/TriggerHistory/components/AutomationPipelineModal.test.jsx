import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { toast } from 'react-hot-toast';
import AutomationPipelineModal from './AutomationPipelineModal';
import { fetchWithAuth } from '../../../AuthContext';

vi.mock('../../../config', () => ({
  API_URL: 'http://localhost:8000/api',
  WS_URL: 'ws://localhost:8000',
}));

vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../../AuthContext', () => ({
  fetchWithAuth: vi.fn(),
}));

vi.mock('../../../contexts/ClientContext', () => ({
  useClient: () => ({ activeClient: { id: 1 } }),
}));

// Mock do PipelineFlowViewer que renderiza um botão para disparar a abertura do modal de contatos na fila
vi.mock('./PipelineFlowViewer', () => ({
  default: ({ onNodeStatClick }) => (
    <button 
      data-testid="trigger-stat-click" 
      onClick={() => onNodeStatClick('node-delay', 'waiting')}
    >
      Ver Contatos na Fila
    </button>
  ),
}));

const mockTrigger = {
  id: 10,
  contact_name: 'Lead Teste',
  contact_phone: '5511999999999',
  status: 'processing',
  is_bulk: true,
  chatwoot_account_id: 1,
  conversation_id: 123,
  execution_history: [
    {
      node_id: 'node-delay',
      status: 'waiting',
      timestamp: '2026-05-30T18:17:34.000Z',
      extra: {
        contact_name: 'Aryaraj',
        contact_phone: '5585996123586',
        target_time: '2026-05-30T18:18:04.000Z',
        trigger_id: 101
      }
    }
  ],
  funnel: {
    steps: {
      nodes: [
        { id: 'node-delay', type: 'delayNode', data: { label: 'Aguardar' } }
      ],
      edges: []
    }
  }
};

describe('AutomationPipelineModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve exibir o botão Parar Funil para contatos na fila e chamar endpoint de cancelamento ao confirmar', async () => {
    vi.mocked(fetchWithAuth).mockImplementation(async (url) => {
      if (url.includes('/cancel')) {
        return { ok: true, json: async () => ({}) };
      }
      return { ok: false };
    });

    render(
      <AutomationPipelineModal 
        trigger={mockTrigger} 
        onClose={vi.fn()} 
        onStop={vi.fn()} 
        onDelete={vi.fn()} 
        hideTabs={true} 
      />
    );

    // 1. Clicar no botão mockado para abrir a lista de contatos na fila
    const openBtn = screen.getByTestId('trigger-stat-click');
    fireEvent.click(openBtn);

    // 2. Verificar se a lista abriu e o contato 'Aryaraj' está listado
    expect(screen.getByText('Aryaraj')).toBeInTheDocument();
    expect(screen.getByText('5585996123586')).toBeInTheDocument();

    // 3. O botão 'Parar Funil' deve estar visível
    const stopBtn = screen.getByTitle('Parar funil para este contato');
    expect(stopBtn).toBeInTheDocument();

    // 4. Clicar no botão 'Parar Funil'
    fireEvent.click(stopBtn);

    // 5. O popup de confirmação deve aparecer
    expect(screen.getByText('Parar Funil?')).toBeInTheDocument();
    expect(screen.getByText(/Tem certeza de que deseja parar a execução do funil para o contato/i)).toBeInTheDocument();

    // 6. Clicar em 'Confirmar'
    const confirmBtn = screen.getByRole('button', { name: /Confirmar/i });
    fireEvent.click(confirmBtn);

    // 7. Verificar se chamou o endpoint de cancelamento do child trigger correto (ID 101)
    await waitFor(() => {
      expect(fetchWithAuth).toHaveBeenCalledWith(
        'http://localhost:8000/api/triggers/101/cancel',
        expect.objectContaining({ method: 'POST' }),
        1
      );
    });

    // 8. O toast de sucesso deve ter sido exibido
    expect(toast.success).toHaveBeenCalledWith('Funil parado para o contato Aryaraj');
  });
});
