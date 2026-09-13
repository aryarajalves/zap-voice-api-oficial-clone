import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import TriggerTableRow from './TriggerTableRow';
import { useTriggerAutoSync } from './hooks/useTriggerAutoSync';
import { renderHook } from '@testing-library/react';

// Mock do Contexto useClient
vi.mock('../../../../context/ClientContext', () => ({
  useClient: () => ({
    activeClient: { id: 1, name: 'TestClient' }
  })
}));

const renderInTable = (ui) => {
  return render(
    <table>
      <tbody>
        {ui}
      </tbody>
    </table>
  );
};

describe('TriggerTableRow - Testes Unitários Completos', () => {
  const baseTrigger = {
    id: 101,
    is_bulk: true,
    template_name: 'TemplateTest',
    template_category: 'MARKETING',
    status: 'completed',
    total_contacts: 50,
    total_sent: 45,
    total_delivered: 40,
    total_failed: 5,
    total_cost: 12.50,
    created_at: '2026-07-30T10:00:00Z',
    scheduled_time: '2026-07-30T10:05:00Z',
    waba_card_last4: '4821',
    delay_seconds: 7,
    concurrency_limit: 3
  };

  const defaultProps = {
    trigger: baseTrigger,
    selectedIds: [],
    handleSelectOne: vi.fn(),
    handleViewContacts: vi.fn(),
    fetchChildren: vi.fn(),
    fetchErrors: vi.fn(),
    handleViewPipeline: vi.fn(),
    handleEditParams: vi.fn(),
    handleStartNow: vi.fn(),
    handleCancel: vi.fn(),
    handleRetry: vi.fn(),
    handleDelete: vi.fn(),
    handleSyncStats: vi.fn(),
    user: { role: 'admin' },
    onManualInteraction: vi.fn(),
    handleTogglePin: vi.fn(),
    folders: [],
    moveTriggerToFolder: vi.fn()
  };

  it('deve renderizar a linha com dados básicos de disparo em massa (bulk)', () => {
    renderInTable(<TriggerTableRow {...defaultProps} />);

    expect(screen.getByText(/TemplateTest/i)).toBeInTheDocument();
    expect(screen.getByText(/📢 Marketing/i)).toBeInTheDocument();
    expect(screen.getByText('Bulk')).toBeInTheDocument();
    expect(screen.getByText('⏱️ 7s')).toBeInTheDocument();
    expect(screen.getByText('👥 3')).toBeInTheDocument();
    expect(screen.getByText('💳 Final 4821')).toBeInTheDocument();
  });

  it('deve chamar handleSelectOne ao clicar no checkbox', () => {
    const handleSelectOne = vi.fn();
    renderInTable(<TriggerTableRow {...defaultProps} handleSelectOne={handleSelectOne} />);

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(handleSelectOne).toHaveBeenCalledWith(101);
  });

  it('deve renderizar disparo do tipo SCALE_TEST com badge e título apropriados', () => {
    const scaleTrigger = {
      ...baseTrigger,
      product_name: 'SCALE_TEST'
    };
    renderInTable(<TriggerTableRow {...defaultProps} trigger={scaleTrigger} />);

    expect(screen.getByText(/⚡ Teste de Escala:/i)).toBeInTheDocument();
    expect(screen.getByText('⚡ Simulação')).toBeInTheDocument();
  });

  it('deve renderizar categorias UTILITY e AUTHENTICATION corretamente', () => {
    const utilTrigger = {
      ...baseTrigger,
      template_category: 'UTILITY'
    };
    const { rerender } = renderInTable(<TriggerTableRow {...defaultProps} trigger={utilTrigger} />);
    expect(screen.getByText(/🛠️ Utilidade/i)).toBeInTheDocument();

    const authTrigger = {
      ...baseTrigger,
      template_category: 'AUTHENTICATION'
    };
    rerender(
      <table>
        <tbody>
          <TriggerTableRow {...defaultProps} trigger={authTrigger} />
        </tbody>
      </table>
    );
    expect(screen.getByText(/🔐 Autenticação/i)).toBeInTheDocument();
  });

  it('deve renderizar funis de interação e bloqueio quando presentes no disparo bulk', () => {
    const funnelTrigger = {
      ...baseTrigger,
      interaction_funnel: { name: 'Funil de Vendas' },
      block_funnel: { name: 'Funil de Desistência' }
    };
    renderInTable(<TriggerTableRow {...defaultProps} trigger={funnelTrigger} />);

    expect(screen.getByText('Funil de Vendas')).toBeInTheDocument();
    expect(screen.getByText('Funil de Desistência')).toBeInTheDocument();
  });

  it('deve renderizar disparo individual / webhook corretamente com nome do contato e custo', () => {
    const singleTrigger = {
      id: 202,
      is_bulk: false,
      event_type: 'ORDER_APPROVED',
      funnel: { name: 'Boas-Vindas Clientes' },
      contact_name: 'João Silva',
      contact_phone: '5511999998888',
      total_delivered: 1,
      total_cost: 0.25,
      status: 'completed',
      created_at: '2026-07-30T10:00:00Z',
      scheduled_time: '2026-07-30T10:00:00Z'
    };
    renderInTable(<TriggerTableRow {...defaultProps} trigger={singleTrigger} />);

    expect(screen.getByText(/ORDER APPROVED:/i)).toBeInTheDocument();
    expect(screen.getByText('Boas-Vindas Clientes')).toBeInTheDocument();
    expect(screen.getByText('João Silva')).toBeInTheDocument();
    expect(screen.getByText('(5511999998888)')).toBeInTheDocument();
    expect(screen.getByText('💰 R$ 0.25')).toBeInTheDocument();
  });

  it('deve renderizar erro traduzido para disparos individuais que falharam', () => {
    const failedTrigger = {
      id: 303,
      is_bulk: false,
      status: 'failed',
      failure_reason: 'Parameter value is not valid',
      created_at: '2026-07-30T10:00:00Z'
    };
    renderInTable(<TriggerTableRow {...defaultProps} trigger={failedTrigger} />);

    expect(screen.getAllByText(/O valor do parâmetro é inválido/i).length).toBeGreaterThan(0);
  });

  it('deve renderizar pasta quando atribuída', () => {
    const folderTrigger = {
      ...baseTrigger,
      folder: { name: 'Campanhas Q3', color: '#10b981' }
    };
    renderInTable(<TriggerTableRow {...defaultProps} trigger={folderTrigger} />);

    expect(screen.getByText(/📁 Campanhas Q3/i)).toBeInTheDocument();
  });

  it('deve acionar fetchChildren ao clicar nos botões de funis filhos', () => {
    const fetchChildren = vi.fn();
    const childrenTrigger = {
      ...baseTrigger,
      interaction_child_count: 2,
      block_child_count: 1
    };
    renderInTable(<TriggerTableRow {...defaultProps} trigger={childrenTrigger} fetchChildren={fetchChildren} />);

    const interactionBtn = screen.getByText('Funis de Interação');
    fireEvent.click(interactionBtn);
    expect(fetchChildren).toHaveBeenCalledWith(expect.anything(), 'interaction');

    const blockBtn = screen.getByText('Funis de Bloqueio');
    fireEvent.click(blockBtn);
    expect(fetchChildren).toHaveBeenCalledWith(expect.anything(), 'block');
  });

  describe('useTriggerAutoSync hook', () => {
    it('chama handleSyncStats imediatamente quando o trigger está ativo e todos os contatos já foram processados', () => {
      const handleSyncStats = vi.fn();
      const trigger = {
        id: 999,
        is_bulk: true,
        status: 'processing',
        total_contacts: 10,
        total_sent: 8,
        total_failed: 2
      };

      renderHook(() => useTriggerAutoSync(trigger, handleSyncStats));
      expect(handleSyncStats).toHaveBeenCalledWith(999, { silent: true });
    });

    it('não executa polling se trigger não for bulk ou estiver finalizado', () => {
      const handleSyncStats = vi.fn();
      const trigger = {
        id: 888,
        is_bulk: false,
        status: 'completed'
      };

      renderHook(() => useTriggerAutoSync(trigger, handleSyncStats));
      expect(handleSyncStats).not.toHaveBeenCalled();
    });
  });
});
