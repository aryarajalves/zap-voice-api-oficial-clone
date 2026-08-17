import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import FinancialSummaryCards from '../components/FinancialSummaryCards';
import PeriodRevenueTable from '../components/PeriodRevenueTable';
import ProductRankingCard from '../components/ProductRankingCard';

describe('SalesFinancial Modular Components', () => {
  describe('FinancialSummaryCards', () => {
    it('renderiza os totais formatados', () => {
      const mockTotals = {
        total_revenue: 15450.50,
        total_sales: 120,
        total_refunds: 3
      };

      render(<FinancialSummaryCards totals={mockTotals} />);

      expect(screen.getByText('Total Faturado')).toBeDefined();
      expect(screen.getByText('R$ 15.450,50')).toBeDefined();
      expect(screen.getByText('Vendas Aprovadas')).toBeDefined();
      expect(screen.getByText('120')).toBeDefined();
      expect(screen.getByText('Reembolsos')).toBeDefined();
      expect(screen.getByText('3')).toBeDefined();
    });
  });

  describe('ProductRankingCard', () => {
    it('renderiza a lista de ranking de produtos', () => {
      const topProducts = [
        { product_name: 'Curso de Automação', sales_count: 50, total_revenue: 9900 },
        { product_name: 'Mentoria VIP', sales_count: 5, total_revenue: 5000 }
      ];

      render(<ProductRankingCard topProducts={topProducts} />);

      expect(screen.getByText('Ranking de Produtos')).toBeDefined();
      expect(screen.getByText('1. Curso de Automação')).toBeDefined();
      expect(screen.getByText('50 vendas')).toBeDefined();
      expect(screen.getByText('R$ 9.900,00')).toBeDefined();
      expect(screen.getByText('2. Mentoria VIP')).toBeDefined();
      expect(screen.getByText('5 vendas')).toBeDefined();
    });

    it('exibe mensagem quando a lista está vazia', () => {
      render(<ProductRankingCard topProducts={[]} />);
      expect(screen.getByText('Nenhum produto vendido no período.')).toBeDefined();
    });
  });

  describe('PeriodRevenueTable', () => {
    it('renderiza as linhas de faturamento e permite navegação de páginas', () => {
      const rows = [
        { period: '2026-05', sales_count: 10, revenue: 1990 },
        { period: '2026-06', sales_count: 20, revenue: 3980 }
      ];
      const setCurrentPagePeriod = vi.fn();

      render(
        <PeriodRevenueTable
          rows={rows}
          periodType="monthly"
          pageSizePeriod={1}
          currentPagePeriod={1}
          setCurrentPagePeriod={setCurrentPagePeriod}
        />
      );

      expect(screen.getByText('Faturamento por Período')).toBeDefined();
      expect(screen.getByText('Mai 2026')).toBeDefined();
      expect(screen.getByText('R$ 1.990,00')).toBeDefined();
      expect(screen.getByText('Página 1 de 2')).toBeDefined();

      fireEvent.click(screen.getByText('Próxima'));
      expect(setCurrentPagePeriod).toHaveBeenCalled();
    });
  });
});
