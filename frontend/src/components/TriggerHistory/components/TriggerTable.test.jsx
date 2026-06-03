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
      is_bulk: false,
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

  it('deve renderizar o badge "Recorrente" quando is_recurring é true', () => {
    const recurringTrigger = {
      id: 3,
      is_bulk: true,
      is_recurring: true,
      status: 'completed',
      created_at: new Date().toISOString(),
      total_sent: 10,
      total_failed: 0,
      total_interactions: 0,
      child_count: 0,
      funnel: { name: 'Funil Alfa' }
    };
    
    render(<TriggerTable {...defaultProps} triggers={[recurringTrigger]} />);
    
    const recurringBadge = screen.getByText(/Recorrente/i);
    expect(recurringBadge).toBeInTheDocument();
    expect(recurringBadge).toHaveClass('text-emerald-700');
  });

  it('deve renderizar o status "Abortado" e o failure_reason quando o status é aborted', () => {
    const abortedTrigger = {
      id: 4,
      is_bulk: true,
      status: 'aborted',
      failure_reason: 'Disparo abortado por atraso',
      created_at: new Date().toISOString(),
      total_sent: 0,
      total_failed: 0,
      total_interactions: 0,
      child_count: 0,
      funnel: { name: 'Funil Beta' }
    };
    
    render(<TriggerTable {...defaultProps} triggers={[abortedTrigger]} />);
    
    const abortedBadge = screen.getByText("Abortado");
    expect(abortedBadge).toBeInTheDocument();
    expect(screen.getByText(/Disparo abortado por atraso/i)).toBeInTheDocument();
  });

  it('deve calcular e exibir a economia com disparos gratuitos corretos', () => {
    const savingsTrigger = {
      id: 5,
      is_bulk: true,
      status: 'completed',
      created_at: new Date().toISOString(),
      total_sent: 10,
      total_failed: 0,
      total_delivered: 10,
      total_paid_templates: 8,
      total_cost: 2.80,
      child_count: 0,
      funnel: { name: 'Funil Economia' }
    };
    
    render(<TriggerTable {...defaultProps} triggers={[savingsTrigger]} />);
    
    const economyText = screen.getByText(/economia de R\$ 0.70/i);
    expect(economyText).toBeInTheDocument();
  });

  it('não deve renderizar estatísticas de economia ou disparos grátis quando funnel_id está definido', () => {
    const funnelTrigger = {
      id: 5,
      is_bulk: true,
      funnel_id: 123,
      status: 'completed',
      created_at: new Date().toISOString(),
      total_sent: 10,
      total_failed: 0,
      total_delivered: 10,
      total_paid_templates: 8,
      total_cost: 2.80,
      child_count: 0,
      funnel: { name: 'Funil Economia' }
    };
    
    const { queryByText } = render(<TriggerTable {...defaultProps} triggers={[funnelTrigger]} />);
    
    const economyText = queryByText(/economia de R\$/i);
    expect(economyText).not.toBeInTheDocument();
    const freeText = queryByText(/disparos grátis/i);
    expect(freeText).not.toBeInTheDocument();
  });

  it('deve renderizar o botão "Ver Fluxo Visual" e chamar handleViewPipeline ao ser clicado', () => {
    const triggerWithFunnel = {
      id: 6,
      is_bulk: true,
      status: 'completed',
      created_at: new Date().toISOString(),
      funnel_id: 10,
      funnel: { name: 'Funil Visual' },
      execution_history: [{ node_id: 'node-1', status: 'completed' }]  // pelo menos 1 interação
    };
    
    const handleViewPipelineMock = vi.fn();
    
    const { getByTitle } = render(
      <TriggerTable 
        {...defaultProps} 
        triggers={[triggerWithFunnel]} 
        handleViewPipeline={handleViewPipelineMock}
      />
    );
    
    const visualFlowButton = getByTitle('Ver Fluxo de Automação Visual');
    expect(visualFlowButton).toBeInTheDocument();
    
    visualFlowButton.click();
    expect(handleViewPipelineMock).toHaveBeenCalledWith(6);
  });

  it('deve ocultar o botão "Ver Fluxo Visual" quando execution_history está vazio ou sem node_id (sem interações reais de funil)', () => {
    // Caso 1: histórico vazio
    const triggerSemHistorico = {
      id: 8,
      is_bulk: false,
      status: 'sent',
      created_at: new Date().toISOString(),
      funnel_id: 10,
      funnel: { name: 'Funil Sem Histórico' },
      execution_history: []
    };

    const { queryByTitle, rerender } = render(
      <TriggerTable 
        {...defaultProps} 
        triggers={[triggerSemHistorico]} 
      />
    );
    expect(queryByTitle('Ver Fluxo de Automação Visual')).not.toBeInTheDocument();

    // Caso 2: template enviado (tem histórico) mas ninguém clicou no botão ainda (sem node_id)
    const templateEnviadoSemClique = {
      id: 9,
      is_bulk: true,
      status: 'sent',
      created_at: new Date().toISOString(),
      funnel_id: null,
      button_actions: { 'Sim': { funnel_id: 99 } },
      execution_history: [
        { node_id: null, status: 'completed', details: 'Template enviado' },
        { node_id: undefined, status: 'completed', details: 'Contato notificado' }
      ]
    };

    rerender(
      <TriggerTable 
        {...defaultProps} 
        triggers={[templateEnviadoSemClique]} 
      />
    );
    expect(queryByTitle('Ver Fluxo de Automação Visual')).not.toBeInTheDocument();
  });

  it('deve renderizar o botão "Ver Fluxo Visual" para template com button_actions e funnel_id nulo', () => {
    const triggerWithButtonActions = {
      id: 7,
      is_bulk: true,
      status: 'completed',
      created_at: new Date().toISOString(),
      funnel_id: null,
      button_actions: { 'Btn': { 'funnel_id': 321 } },
      execution_history: [{ node_id: 'node-1', status: 'completed' }]  // pelo menos 1 interação
    };
    
    const { getByTitle } = render(
      <TriggerTable 
        {...defaultProps} 
        triggers={[triggerWithButtonActions]} 
      />
    );
    
    const visualFlowButton = getByTitle('Ver Fluxo de Automação Visual');
    expect(visualFlowButton).toBeInTheDocument();
  });

  it('deve renderizar a lista de botões e suas ações vinculadas', () => {
    const triggerWithButtons = {
      id: 10,
      is_bulk: true,
      status: 'completed',
      created_at: new Date().toISOString(),
      button_actions: {
        'Quero Desconto': { type: 'interaction', funnel_id: 11, funnel_name: 'Funil Cupom 10%' },
        'Sair': { type: 'block', funnel_id: 22, funnel_name: 'Funil Descadastrar' },
        'Sem Funil': { type: 'interaction', funnel_id: null }
      }
    };

    render(
      <TriggerTable 
        {...defaultProps} 
        triggers={[triggerWithButtons]} 
      />
    );

    // Deve exibir o título da seção
    expect(screen.getByText(/Botões e Ações:/i)).toBeInTheDocument();

    // Deve exibir os botões com seus respectivos textos e funis
    expect(screen.getByText('Quero Desconto')).toBeInTheDocument();
    expect(screen.getByText('🔥 Interação: Funil Cupom 10%')).toBeInTheDocument();

    expect(screen.getByText('Sair')).toBeInTheDocument();
    expect(screen.getByText('🚫 Bloqueio: Funil Descadastrar')).toBeInTheDocument();

    expect(screen.getByText('Sem Funil')).toBeInTheDocument();
    expect(screen.getByText('Sem ação vinculada')).toBeInTheDocument();
  });
});


