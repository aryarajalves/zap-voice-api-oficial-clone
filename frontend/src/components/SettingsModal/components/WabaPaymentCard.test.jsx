import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import WabaPaymentCard from './WabaPaymentCard';
import { useClient } from '../../../contexts/ClientContext';

// Mock ClientContext
vi.mock('../../../contexts/ClientContext', () => ({
  useClient: vi.fn()
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    custom: vi.fn(),
  },
  default: {
    success: vi.fn(),
    error: vi.fn(),
  }
}));

describe('WabaPaymentCard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useClient.mockReturnValue({
      activeClient: { id: 11, name: 'SST Empresa' }
    });
  });

  it('renderiza o card de saúde de pagamento e busca o status do cliente', async () => {
    const mockStatus = {
      id: 1,
      client_id: 11,
      checked_at: new Date().toISOString(),
      status: 'HEALTHY',
      check_type: 'AUTOMATIC',
      has_error: false,
      details: 'Conta comercial da Meta e pagamentos em situação regular.',
      payment_method_status: 'Linha de Crédito Ativa'
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockStatus
    });

    render(<WabaPaymentCard />);

    expect(screen.getByText('Saúde de Pagamento e Faturamento (Meta WABA)')).toBeInTheDocument();
    expect(screen.getByText('Verificar Agora (Manual)')).toBeInTheDocument();
    expect(screen.getByText('Histórico de Auditoria')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Pagamento Regular')).toBeInTheDocument();
      expect(screen.getByText('Conta comercial da Meta e pagamentos em situação regular.')).toBeInTheDocument();
    });
  });

  it('exibe alerta quando há pendência de pagamento (PAYMENT_ISSUE)', async () => {
    const mockIssue = {
      id: 2,
      client_id: 11,
      checked_at: new Date().toISOString(),
      status: 'PAYMENT_ISSUE',
      check_type: 'MANUAL',
      has_error: true,
      details: 'Alerta Crítico: Mensagens falhando com erro 131042.',
      payment_method_status: 'Cartão Recusado'
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockIssue
    });

    render(<WabaPaymentCard />);

    await waitFor(() => {
      expect(screen.getByText('Pendência de Pagamento')).toBeInTheDocument();
      expect(screen.getByText('Alerta Crítico: Mensagens falhando com erro 131042.')).toBeInTheDocument();
    });
  });

  it('aciona a verificação manual ao clicar no botão "Verificar Agora"', async () => {
    const mockInitial = {
      id: 1,
      client_id: 11,
      status: 'HEALTHY',
      has_error: false,
      details: 'OK'
    };

    const mockAfterCheck = {
      id: 2,
      client_id: 11,
      status: 'HEALTHY',
      check_type: 'MANUAL',
      has_error: false,
      details: 'Verificado manualmente com sucesso!'
    };

    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => mockInitial })
      .mockResolvedValueOnce({ ok: true, json: async () => mockAfterCheck });

    render(<WabaPaymentCard />);

    await waitFor(() => {
      expect(screen.getByText('OK')).toBeInTheDocument();
    });

    const checkBtn = screen.getByText('Verificar Agora (Manual)');
    fireEvent.click(checkBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/waba-payment/check-now'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });
});
