import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import React from 'react';
import SalesFinancial from '../index';
import { fetchWithAuth } from '../../../AuthContext';

vi.mock('../../../AuthContext', () => ({
  fetchWithAuth: vi.fn(),
}));

vi.mock('../../../config', () => ({
  API_URL: 'http://localhost:8000/api',
}));

const mockTransactions = [
  {
    id: 1,
    created_at: '2026-05-28T10:00:00Z',
    buyer_name: 'Comprador Pix',
    product_name: 'Produto A',
    price: 100.0,
    platform: 'hotmart',
    payment_method: 'pix',
    event_type: 'compra_aprovada',
    status: 'Aprovada',
    category: 'approved'
  },
  {
    id: 2,
    created_at: '2026-05-28T11:00:00Z',
    buyer_name: 'Comprador Boleto',
    product_name: 'Produto B',
    price: 150.0,
    platform: 'kiwify',
    payment_method: 'boleto bancario',
    event_type: 'compra_aprovada',
    status: 'Aprovada',
    category: 'approved'
  },
  {
    id: 3,
    created_at: '2026-05-28T12:00:00Z',
    buyer_name: 'Comprador Cartao',
    product_name: 'Produto C',
    price: 200.0,
    platform: 'eduzz',
    payment_method: 'credit_card',
    event_type: 'compra_aprovada',
    status: 'Aprovada',
    category: 'approved'
  },
  {
    id: 4,
    created_at: '2026-05-28T13:00:00Z',
    buyer_name: 'Comprador Outro',
    product_name: 'Produto D',
    price: 50.0,
    platform: 'pagtrust',
    payment_method: 'outros',
    event_type: 'compra_aprovada',
    status: 'Aprovada',
    category: 'approved'
  }
];

const mockData = {
  totals: {
    total_revenue: 500.0,
    total_sales: 4,
    total_refunds: 0,
    total_pending: 0
  },
  rows: [
    { period: '2026-05', sales_count: 4, revenue: 500.0 }
  ],
  period_type: 'monthly',
  top_products: [
    { product_name: 'Produto C', sales_count: 1, total_revenue: 200.0 }
  ],
  all_products: ['Produto A', 'Produto B', 'Produto C', 'Produto D'],
  transactions: mockTransactions
};

const mockActiveClient = { id: 1, name: 'Client Test' };

describe('SalesFinancial Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchWithAuth).mockResolvedValue({
      ok: true,
      json: async () => mockData
    });
  });

  it('renders the component and fetches data on mount', async () => {
    await act(async () => {
      render(<SalesFinancial activeClient={mockActiveClient} />);
    });

    await waitFor(() => {
      expect(fetchWithAuth).toHaveBeenCalled();
      expect(screen.getByText('Total Faturado')).toBeInTheDocument();
      expect(screen.getAllByText(/500,00/).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('calculates and displays payment method statistics correctly', async () => {
    await act(async () => {
      render(<SalesFinancial activeClient={mockActiveClient} />);
    });

    await waitFor(() => {
      // Pix: 1 transaction (25%)
      // Boleto: 1 transaction (25%)
      // Cartão de Crédito: 1 transaction (25%)
      // Outros: 1 transaction (25%)
      expect(screen.getByText('Vendas por Forma de Pagamento')).toBeInTheDocument();
      
      const pixPercent = screen.getAllByText('(25.0%)');
      expect(pixPercent.length).toBeGreaterThanOrEqual(1);

      expect(screen.getByText('Comprador Pix')).toBeInTheDocument();
      expect(screen.getByText('Comprador Boleto')).toBeInTheDocument();
      expect(screen.getByText('Comprador Cartao')).toBeInTheDocument();
      expect(screen.getByText('Comprador Outro')).toBeInTheDocument();
    });
  });

  it('filters transaction list by payment method', async () => {
    await act(async () => {
      render(<SalesFinancial activeClient={mockActiveClient} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Comprador Pix')).toBeInTheDocument();
      expect(screen.getByText('Comprador Boleto')).toBeInTheDocument();
    });

    // Click Pix filter button
    const pixFilterBtn = screen.getByRole('button', { name: /^Pix$/ });
    await act(async () => {
      fireEvent.click(pixFilterBtn);
    });

    // Pix buyer should remain, others should be filtered out
    expect(screen.getByText('Comprador Pix')).toBeInTheDocument();
    expect(screen.queryByText('Comprador Boleto')).not.toBeInTheDocument();
    expect(screen.queryByText('Comprador Cartao')).not.toBeInTheDocument();
    expect(screen.queryByText('Comprador Outro')).not.toBeInTheDocument();
  });

  // --- Testes do novo filtro por Produto ---

  it('renders the product filter dropdown button', async () => {
    await act(async () => {
      render(<SalesFinancial activeClient={mockActiveClient} />);
    });

    await waitFor(() => {
      // O botão do dropdown de produto deve existir com o texto padrão
      expect(screen.getByRole('button', { name: /Todos os Produtos/i })).toBeInTheDocument();
    });
  });

  it('opens the product dropdown and lists all_products from API', async () => {
    await act(async () => {
      render(<SalesFinancial activeClient={mockActiveClient} />);
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Todos os Produtos/i })).toBeInTheDocument();
    });

    // Abre o dropdown
    const dropdownBtn = screen.getByRole('button', { name: /Todos os Produtos/i });
    await act(async () => {
      fireEvent.click(dropdownBtn);
    });

    // Todos os produtos do mock devem aparecer no dropdown
    await waitFor(() => {
      expect(screen.getAllByText('Produto A').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Produto B').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Produto C').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Produto D').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('selecting a product triggers API call with product parameter', async () => {
    await act(async () => {
      render(<SalesFinancial activeClient={mockActiveClient} />);
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Todos os Produtos/i })).toBeInTheDocument();
    });

    vi.clearAllMocks();
    vi.mocked(fetchWithAuth).mockResolvedValue({
      ok: true,
      json: async () => mockData
    });

    // Abre o dropdown
    const dropdownBtn = screen.getByRole('button', { name: /Todos os Produtos/i });
    await act(async () => {
      fireEvent.click(dropdownBtn);
    });

    // Seleciona "Produto A" no dropdown
    await waitFor(() => {
      expect(screen.getAllByText('Produto A').length).toBeGreaterThanOrEqual(1);
    });

    // Busca o botão que contém apenas "Produto A" (no dropdown, não no ranking)
    const allProdABtns = screen.getAllByRole('button').filter(b => b.textContent?.trim() === 'Produto A');
    expect(allProdABtns.length).toBeGreaterThanOrEqual(1);
    await act(async () => {
      fireEvent.click(allProdABtns[0]);
    });

    // Aguarda nova chamada à API com o parâmetro product=Produto+A
    await waitFor(() => {
      expect(fetchWithAuth).toHaveBeenCalled();
      const calledUrl = vi.mocked(fetchWithAuth).mock.calls[0][0];
      expect(calledUrl).toMatch(/product=Produto/);
    });
  });

  it('clearing product selection resets filter to all products', async () => {
    await act(async () => {
      render(<SalesFinancial activeClient={mockActiveClient} />);
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Todos os Produtos/i })).toBeInTheDocument();
    });

    // Abre o dropdown e seleciona Produto B
    const dropdownBtn = screen.getByRole('button', { name: /Todos os Produtos/i });
    await act(async () => { fireEvent.click(dropdownBtn); });

    await waitFor(() => { expect(screen.getAllByText('Produto B').length).toBeGreaterThanOrEqual(1); });

    // Busca o botão exato "Produto B" no dropdown
    const allProdBBtns = screen.getAllByRole('button').filter(b => b.textContent?.trim() === 'Produto B');
    expect(allProdBBtns.length).toBeGreaterThanOrEqual(1);
    await act(async () => { fireEvent.click(allProdBBtns[0]); });

    // Clica em "Limpar seleção"
    await waitFor(() => {
      expect(screen.getByText('Limpar seleção')).toBeInTheDocument();
    });

    const clearBtn = screen.getByText('Limpar seleção');
    await act(async () => { fireEvent.click(clearBtn); });

    // O botão principal do dropdown deve voltar ao estado padrão
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Todos os Produtos/i })).toBeInTheDocument();
    });
  });
});
