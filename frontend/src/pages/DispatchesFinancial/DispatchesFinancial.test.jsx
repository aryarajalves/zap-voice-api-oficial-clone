import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import DispatchesFinancial from './index';
import { formatPeriodLabel } from './constants';
import { useDispatchesFinancial } from './hooks/useDispatchesFinancial';
import { fetchWithAuth } from '../../AuthContext';

vi.mock('../../AuthContext', () => ({
  fetchWithAuth: vi.fn(),
  AuthProvider: ({ children }) => <div>{children}</div>
}));

const mockActiveClient = { id: 7, name: 'Cliente Financeiro' };

const mockSummaryData = {
  period_type: 'monthly',
  totals: {
    total_sent: 1000,
    total_triggers: 10,
    paid_sent: 400,
    paid_triggers: 4,
    free_sent: 600,
    free_triggers: 6,
    total_cost: 150.5,
    estimated_savings: 220.0
  },
  rows: [
    {
      period: '2026-03',
      total_sent: 500,
      paid_sent: 200,
      free_sent: 300,
      total_cost: 75.25,
      estimated_savings: 110.0
    },
    {
      period: '2026-02',
      total_sent: 500,
      paid_sent: 200,
      free_sent: 300,
      total_cost: 75.25,
      estimated_savings: 110.0
    }
  ]
};

const mockMetaData = {
  month: '2026-10',
  rates: { marketing_rate: 0.35, service_rate: 0.035, utility_rate: 0.035, free_quota: 1000 },
  counts: { marketing_count: 50, utility_count: 20, service_count: 1200, total_messages: 1270 },
  quota: { total: 1000, used: 1000, remaining: 0, percent_used: 100.0, billable_service_count: 200 },
  costs: { marketing_cost: 17.5, utility_cost: 0.7, service_cost: 7.0, total_cost: 25.2, savings_quota: 35.0, projected_total: 78.12 }
};

describe('DispatchesFinancial Module & Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchWithAuth.mockImplementation(async (url) => {
      if (url.includes('/financial/meta-costs')) {
        return {
          ok: true,
          status: 200,
          json: async () => mockMetaData
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => mockSummaryData
      };
    });
  });

  describe('formatPeriodLabel helper', () => {
    it('formata datas diárias para DD/MM/YYYY', () => {
      expect(formatPeriodLabel('2026-09-13', 'daily')).toBe('13/09/2026');
    });

    it('formata semanas para Semana W de YYYY', () => {
      expect(formatPeriodLabel('2026-W37', 'weekly')).toBe('Semana 37 de 2026');
    });

    it('formata meses para Abreviação e Ano', () => {
      expect(formatPeriodLabel('2026-03', 'monthly')).toBe('Mar 2026');
    });

    it('retorna string original para tipos não mapeados ou nulos', () => {
      expect(formatPeriodLabel('2026', 'yearly')).toBe('2026');
      expect(formatPeriodLabel('', 'daily')).toBe('');
    });
  });

  describe('useDispatchesFinancial Hook', () => {
    it('inicializa estados padrão e calcula proporção gratuita', async () => {
      let result;
      await act(async () => {
        const rendered = renderHook(() => useDispatchesFinancial(mockActiveClient));
        result = rendered.result;
      });

      expect(result.current.period).toBe('monthly');
      expect(result.current.source).toBe('all');
      expect(result.current.totals).toEqual(mockSummaryData.totals);
      expect(result.current.freeRatio).toBe(60); // 600 / 1000 = 60%
      expect(result.current.visibleRows).toHaveLength(2);
      expect(result.current.totalPages).toBe(1);
    });

    it('altera período e origem resetando a página', async () => {
      let result;
      await act(async () => {
        const rendered = renderHook(() => useDispatchesFinancial(mockActiveClient));
        result = rendered.result;
      });

      await act(async () => {
        result.current.setPeriod('daily');
        result.current.setSource('bulk');
      });

      expect(result.current.period).toBe('daily');
      expect(result.current.source).toBe('bulk');
      expect(result.current.currentPage).toBe(1);
    });

    it('captura erro de resposta da API com status diferente de ok', async () => {
      fetchWithAuth.mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      let result;
      await act(async () => {
        const rendered = renderHook(() => useDispatchesFinancial(mockActiveClient));
        result = rendered.result;
      });

      expect(result.current.error).toBe('Erro 500');
    });
  });

  describe('DispatchesFinancial Component Rendering', () => {
    it('renderiza os cards com as métricas formatadas e barra de economia', async () => {
      await act(async () => {
        render(<DispatchesFinancial activeClient={mockActiveClient} />);
      });

      expect(screen.getByText('Total Disparado')).toBeInTheDocument();
      expect(screen.getByText('1.000')).toBeInTheDocument();
      expect(screen.getByText('Templates Pagos')).toBeInTheDocument();
      expect(screen.getByText('400')).toBeInTheDocument();
      expect(screen.getByText('Mensagens Gratuitas')).toBeInTheDocument();
      expect(screen.getByText('600')).toBeInTheDocument();
      expect(screen.getByText('R$ 150,50')).toBeInTheDocument();
      expect(screen.getByText('R$ 220,00')).toBeInTheDocument();
      expect(screen.getByText('60% gratuito')).toBeInTheDocument();
      expect(screen.getByText('Brasília (GMT-3)')).toBeInTheDocument();

      // Validação do Card da Nova Política de Cobrança da Meta
      expect(screen.getByText(/Nova Política de Cobrança Meta/i)).toBeInTheDocument();
      expect(screen.getByText(/1.000 grátis\/mês/i)).toBeInTheDocument();
      expect(screen.getByText(/Projeção Fechamento/i)).toBeInTheDocument();
    });

    it('renderiza tabela de períodos com valores formatados', async () => {
      await act(async () => {
        render(<DispatchesFinancial activeClient={mockActiveClient} />);
      });

      expect(screen.getByText('Mar 2026')).toBeInTheDocument();
      expect(screen.getByText('Fev 2026')).toBeInTheDocument();
      expect(screen.getByText('Detalhamento Por Mês')).toBeInTheDocument();
    });

    it('exibe estado vazio quando não há registros retornados', async () => {
      fetchWithAuth.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          period_type: 'monthly',
          totals: {
            total_sent: 0,
            total_triggers: 0,
            paid_sent: 0,
            paid_triggers: 0,
            free_sent: 0,
            free_triggers: 0,
            total_cost: 0,
            estimated_savings: 0
          },
          rows: []
        })
      });

      await act(async () => {
        render(<DispatchesFinancial activeClient={mockActiveClient} />);
      });

      expect(screen.getByText('Nenhum disparo concluído encontrado.')).toBeInTheDocument();
    });

    it('permite alternar período e dispara nova busca', async () => {
      await act(async () => {
        render(<DispatchesFinancial activeClient={mockActiveClient} />);
      });

      const dayButton = screen.getByText('Por Dia');
      await act(async () => {
        fireEvent.click(dayButton);
      });

      expect(fetchWithAuth).toHaveBeenCalledWith(
        expect.stringContaining('period=daily'),
        expect.anything(),
        mockActiveClient.id
      );
    });

    it('permite selecionar um mês específico e disparar nova busca com month param', async () => {
      await act(async () => {
        render(<DispatchesFinancial activeClient={mockActiveClient} />);
      });

      const monthInput = screen.getByLabelText(/Mês Específico:/i);
      expect(monthInput).toBeInTheDocument();

      await act(async () => {
        fireEvent.change(monthInput, { target: { value: '2026-10' } });
      });

      expect(fetchWithAuth).toHaveBeenCalledWith(
        expect.stringContaining('month=2026-10'),
        expect.anything(),
        mockActiveClient.id
      );

      // Botão de Limpar aparece e limpa o filtro ao clicar
      const clearBtn = screen.getByText('Limpar');
      expect(clearBtn).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(clearBtn);
      });

      expect(monthInput.value).toBe('');
    });
  });
});
