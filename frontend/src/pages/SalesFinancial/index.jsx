import React, { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../../config';
import { fetchWithAuth } from '../../AuthContext';

// Subcomponentes Modulares
import FinancialFilterBar from './components/FinancialFilterBar';
import FinancialSummaryCards from './components/FinancialSummaryCards';
import PeriodRevenueTable from './components/PeriodRevenueTable';
import ProductRankingCard from './components/ProductRankingCard';
import PaymentMethodStats from './components/PaymentMethodStats';
import TransactionsTable from './components/TransactionsTable';

export default function SalesFinancial({ activeClient }) {
  const [period, setPeriod] = useState('monthly');
  const [statuses, setStatuses] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectedLabels, setSelectedLabels] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Estados de paginação
  const [pageSizePeriod, setPageSizePeriod] = useState(20);
  const [currentPagePeriod, setCurrentPagePeriod] = useState(1);
  const [pageSizeTx, setPageSizeTx] = useState(20);
  const [currentPageTx, setCurrentPageTx] = useState(1);

  const fetchData = useCallback(async () => {
    if (!activeClient) return;
    setLoading(true);
    setError(null);
    try {
      const platformParam = platforms.length > 0 ? platforms.join(',') : 'all';
      const statusParam = statuses.length > 0 ? statuses.join(',') : 'all';
      const productParam = selectedProducts.length > 0 ? selectedProducts.join(',') : 'all';
      const labelParam = selectedLabels.length > 0 ? selectedLabels.join(',') : 'all';
      const url = `${API_URL}/financial/sales?period=${period}&status=${statusParam}&platform=${platformParam}&product=${encodeURIComponent(productParam)}&label=${encodeURIComponent(labelParam)}&start_date=${startDate}&end_date=${endDate}`;
      const res = await fetchWithAuth(url, {}, activeClient.id);
      if (!res.ok) throw new Error(`Erro ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [activeClient, period, statuses, platforms, selectedProducts, selectedLabels, startDate, endDate]);

  useEffect(() => {
    fetchData();
    setCurrentPagePeriod(1);
    setCurrentPageTx(1);
  }, [fetchData]);

  const normalizeMethod = (method) => {
    if (!method) return 'Outros';
    const m = method.toLowerCase().trim();
    if (m.includes('pix')) return 'Pix';
    if (m.includes('boleto') || m.includes('billet')) return 'Boleto';
    if (m.includes('cart') || m.includes('credit') || m.includes('débito') || m.includes('debit')) return 'Cartão de Crédito';
    return 'Outros';
  };

  // Filtragem local de transações por forma de pagamento
  const filteredTransactions = data?.transactions ? data.transactions.filter(tx => {
    if (paymentMethod === 'all') return true;
    const norm = normalizeMethod(tx.payment_method);
    if (paymentMethod === 'pix') return norm === 'Pix';
    if (paymentMethod === 'boleto') return norm === 'Boleto';
    if (paymentMethod === 'credit_card') return norm === 'Cartão de Crédito';
    if (paymentMethod === 'other') return norm === 'Outros';
    return true;
  }) : [];

  return (
    <div className="space-y-8">
      {/* Barra de Filtros */}
      <FinancialFilterBar
        period={period}
        setPeriod={setPeriod}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        selectedLabels={selectedLabels}
        setSelectedLabels={setSelectedLabels}
        allLabels={data?.all_labels || []}
        platforms={platforms}
        setPlatforms={setPlatforms}
        statuses={statuses}
        setStatuses={setStatuses}
        selectedProducts={selectedProducts}
        setSelectedProducts={setSelectedProducts}
        allProducts={data?.all_products || []}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        onResetTxPage={() => setCurrentPageTx(1)}
      />

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <svg className="animate-spin w-6 h-6 mr-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Carregando dados de faturamento...
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 rounded-xl p-4 text-sm">
          Erro ao carregar vendas: {error}
        </div>
      )}

      {/* Main Dashboard Content */}
      {!loading && data && (
        <>
          {/* Cards de Resumo */}
          <FinancialSummaryCards totals={data.totals} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Tabela de Faturamento por Período */}
            <PeriodRevenueTable
              rows={data.rows || []}
              periodType={data.period_type}
              pageSizePeriod={pageSizePeriod}
              currentPagePeriod={currentPagePeriod}
              setCurrentPagePeriod={setCurrentPagePeriod}
            />

            {/* Sidebar de Métricas: Formas de Pagamento e Ranking */}
            <div className="space-y-6">
              <PaymentMethodStats transactions={data.transactions || []} />
              <ProductRankingCard topProducts={data.top_products || []} />
            </div>
          </div>

          {/* Tabela Detalhada de Transações */}
          <TransactionsTable
            transactions={filteredTransactions}
            pageSizeTx={pageSizeTx}
            setPageSizeTx={setPageSizeTx}
            currentPageTx={currentPageTx}
            setCurrentPageTx={setCurrentPageTx}
          />
        </>
      )}
    </div>
  );
}
