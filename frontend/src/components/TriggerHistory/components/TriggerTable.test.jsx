import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import TriggerTable from './TriggerTable';

// Mock das dependências que não queremos testar diretamente
vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../../AuthContext', () => ({
  useAuth: () => ({ user: { role: 'admin' } }),
  fetchWithAuth: vi.fn()
}));

describe('TriggerTable Component', () => {
  const mockTriggers = [
    {
      id: 1,
      is_bulk: true,
      status: 'completed',
      created_at: new Date().toISOString(),
      total_sent: 10,
      total_failed: 0,
      total_interactions: 5,
      child_count: 0, // Não deve mostrar o botão
      funnel: { name: 'Funil Teste' }
    },
    {
      id: 2,
      is_bulk: true,
      status: 'completed',
      created_at: new Date().toISOString(),
      total_sent: 10,
      total_failed: 0,
      total_interactions: 5,
      child_count: 2, // DEVE mostrar o botão
      funnel: { name: 'Funil com Filhos' }
    }
  ];

  const defaultProps = {
    triggers: mockTriggers,
    selectedIds: [],
    handleSelectOne: vi.fn(),
    handleSelectAll: vi.fn(),
    handleRetry: vi.fn(),
    handleCancel: vi.fn(),
    handleDelete: vi.fn(),
    handleStartNow: vi.fn(),
    handleEditParams: vi.fn(),
    fetchErrors: vi.fn(),
    fetchChildren: vi.fn(),
    handleViewContacts: vi.fn(),
    handleViewPipeline: vi.fn(),
  };

  it('não deve renderizar o botão "Funis Ativados" quando child_count é 0', () => {
    render(<TriggerTable {...defaultProps} />);
    
    // O primeiro trigger (id: 1) tem interactions=5 mas child_count=0
    // O texto "Funis Ativados" não deve aparecer para ele (ou deve aparecer apenas 1 vez, referente ao segundo trigger)
    const buttons = screen.queryAllByText(/Funis Ativados/i);
    expect(buttons).toHaveLength(1); // Apenas o trigger id: 2 deve ter o botão
  });

  it('deve renderizar o botão "Funis Ativados" quando child_count > 0', () => {
    render(<TriggerTable {...defaultProps} />);
    
    const funnelWithChildren = screen.getByText(/Funil com Filhos/i);
    expect(funnelWithChildren).toBeInTheDocument();
    
    const funnelAtivadosButton = screen.getByText(/Funis Ativados/i);
    expect(funnelAtivadosButton).toBeInTheDocument();
  });
});
