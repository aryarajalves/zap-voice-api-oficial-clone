import React, { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../config';
import { fetchWithAuth } from '../AuthContext';

const PERIOD_OPTIONS = [
  { value: 'daily', label: 'Por Dia' },
  { value: 'weekly', label: 'Por Semana' },
  { value: 'monthly', label: 'Por Mês' },
  { value: 'yearly', label: 'Por Ano' },
];

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Todos os Status' },
  { value: 'approved', label: 'Aprovadas / Pagas' },
  { value: 'pending', label: 'Aguardando Pagamento' },
  { value: 'refunded', label: 'Reembolsadas / Devolvidas' },
  { value: 'canceled', label: 'Canceladas / Recusadas' },
];

function StatCard({ title, value, sub, color = 'blue', icon }) {
  const colors = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700',
    amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700',
  };
  return (
    <div className={`rounded-xl border p-5 flex flex-col gap-1 ${colors[color]}`}>
      <div className="flex items-center gap-2 text-sm font-medium opacity-80 mb-1">
        <span>{icon}</span>
        {title}
      </div>
      <div className="text-3xl font-bold">{value}</div>
      {sub && <div className="text-xs opacity-70 mt-1">{sub}</div>}
    </div>
  );
}

function formatPeriodLabel(period, periodType) {
  if (periodType === 'daily') {
    const [year, month, day] = period.split('-');
    return `${day}/${month}/${year}`;
  }
  if (periodType === 'weekly') {
    return `Semana ${period.split('-W')[1]} de ${period.split('-W')[0]}`;
  }
  if (periodType === 'monthly') {
    const [year, month] = period.split('-');
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${months[parseInt(month, 10) - 1]} ${year}`;
  }
  return period;
}

export default function SalesFinancial({ activeClient }) {
  const [period, setPeriod] = useState('monthly');
  const [status, setStatus] = useState('all');
  const [platform, setPlatform] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Pagination states
  const [pageSizePeriod, setPageSizePeriod] = useState(20);
  const [currentPagePeriod, setCurrentPagePeriod] = useState(1);
  const [pageSizeTx, setPageSizeTx] = useState(20);
  const [currentPageTx, setCurrentPageTx] = useState(1);

  const fetchData = useCallback(async () => {
    if (!activeClient) return;
    setLoading(true);
    setError(null);
    try {
      const url = `${API_URL}/financial/sales?period=${period}&status=${status}&platform=${platform}&start_date=${startDate}&end_date=${endDate}`;
      const res = await fetchWithAuth(url, {}, activeClient.id);
      if (!res.ok) throw new Error(`Erro ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [activeClient, period, status, platform, startDate, endDate]);

  useEffect(() => {
    fetchData();
    setCurrentPagePeriod(1);
    setCurrentPageTx(1);
  }, [fetchData]);

  const totals = data?.totals;

  // Status Badge Helper
  const getStatusBadge = (category, statusText) => {
    const styles = {
      approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
      pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
      refunded: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800',
      canceled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
      other: 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-400 border-gray-200 dark:border-gray-700',
    };
    const style = styles[category] || styles.other;
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${style}`}>
        {statusText}
      </span>
    );
  };

  const PLATFORM_FILTER_OPTIONS = [
    { value: 'all', label: 'Todas as Plataformas' },
    { value: 'hotmart', label: 'Hotmart' },
    { value: 'kiwify', label: 'Kiwify' },
    { value: 'eduzz', label: 'Eduzz' },
  ];

  return (
    <div className="space-y-8">
      {/* Filters */}
      <div className="flex flex-col gap-3">
        {/* Period Selector & Date Inputs */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-2 flex-wrap">
            {PERIOD_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => {
                  setPeriod(opt.value);
                  setStartDate('');
                  setEndDate('');
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  period === opt.value
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">De:</span>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Até:</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {(startDate || endDate) && (
              <button
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 hover:bg-red-100 dark:hover:bg-red-950/50 transition-all"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* Platform filter */}
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Plataforma:</span>
          {PLATFORM_FILTER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setPlatform(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                platform === opt.value
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Status:</span>
          {STATUS_FILTER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setStatus(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                status === opt.value
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Brasília (GMT-3)
            </span>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <svg className="animate-spin w-6 h-6 mr-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Carregando dados de faturamento...
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 rounded-xl p-4 text-sm">
          Erro ao carregar vendas: {error}
        </div>
      )}

      {!loading && data && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Faturado"
              value={`R$ ${totals.total_revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              sub="Vendas aprovadas e pagas"
              color="green"
              icon="💰"
            />
            <StatCard
              title="Vendas Aprovadas"
              value={totals.total_sales.toLocaleString('pt-BR')}
              sub="Quantidade de conversões"
              color="blue"
              icon="✅"
            />
            <StatCard
              title="Reembolsos"
              value={totals.total_refunds.toLocaleString('pt-BR')}
              sub="Estornos efetuados"
              color="purple"
              icon="🔄"
            />
            <StatCard
              title="Transações Pendentes"
              value={totals.total_pending.toLocaleString('pt-BR')}
              sub="Aguardando Pix ou Boleto"
              color="amber"
              icon="⏳"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Grouped faturamento table */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col justify-between">
              <div>
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                    Faturamento por Período
                  </h3>
                </div>
                {data.rows.length > 0 ? (() => {
                  const totalPages = Math.ceil(data.rows.length / pageSizePeriod);
                  const pageRows = data.rows.slice((currentPagePeriod - 1) * pageSizePeriod, currentPagePeriod * pageSizePeriod);
                  const safeCurrentPage = Math.min(currentPagePeriod, totalPages);

                  return (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                              <th className="text-left px-6 py-3 font-medium">Período</th>
                              <th className="text-right px-4 py-3 font-medium">Quantidade</th>
                              <th className="text-right px-6 py-3 font-medium">Faturamento (R$)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pageRows.map((row, i) => (
                              <tr
                                key={row.period}
                                className={`border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/50 dark:bg-gray-800/30'}`}
                              >
                                <td className="px-6 py-3 font-medium text-gray-800 dark:text-gray-200">
                                  {formatPeriodLabel(row.period, data.period_type)}
                                </td>
                                <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                                  {row.sales_count.toLocaleString('pt-BR')}
                                </td>
                                <td className="px-6 py-3 text-right text-green-600 dark:text-green-400 font-semibold">
                                  R$ {row.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {totalPages > 1 && (
                        <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between gap-4">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Página {safeCurrentPage} de {totalPages}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setCurrentPagePeriod(p => Math.max(1, p - 1))}
                              disabled={safeCurrentPage === 1}
                              className="px-2 py-1 rounded text-xs border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                              Anterior
                            </button>
                            <button
                              onClick={() => setCurrentPagePeriod(p => Math.min(totalPages, p + 1))}
                              disabled={safeCurrentPage === totalPages}
                              className="px-2 py-1 rounded text-xs border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                              Próxima
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })() : (
                  <div className="text-center py-12 text-gray-400 dark:text-gray-500">
                    Nenhuma venda encontrada para o período.
                  </div>
                )}
              </div>
            </div>

            {/* Ranking of products */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col justify-between">
              <div>
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                    Ranking de Produtos
                  </h3>
                </div>
                {data.top_products.length > 0 ? (
                  <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                    {data.top_products.slice(0, 10).map((product, idx) => (
                      <div key={idx} className="px-6 py-3.5 flex items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-gray-800 dark:text-gray-200 truncate">
                            {idx + 1}. {product.product_name}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            {product.sales_count} venda{product.sales_count !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-green-600 dark:text-green-400 whitespace-nowrap">
                          R$ {product.total_revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400 dark:text-gray-500">
                    Nenhum produto vendido no período.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Detailed Transactions List */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between gap-4">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                Histórico de Transações
                <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">
                  ({data.transactions.length} transaç{data.transactions.length === 1 ? 'ão' : 'ões'} encontrada{data.transactions.length === 1 ? '' : 's'})
                </span>
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <span>Exibir</span>
                <select
                  value={pageSizeTx}
                  onChange={e => { setPageSizeTx(Number(e.target.value)); setCurrentPageTx(1); }}
                  className="px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span>por página</span>
              </div>
            </div>

            {data.transactions.length > 0 ? (() => {
              const totalPages = Math.ceil(data.transactions.length / pageSizeTx);
              const pageRows = data.transactions.slice((currentPageTx - 1) * pageSizeTx, currentPageTx * pageSizeTx);
              const safeCurrentPage = Math.min(currentPageTx, totalPages);

              return (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                          <th className="text-left px-6 py-3 font-medium">Data</th>
                          <th className="text-left px-4 py-3 font-medium">Comprador</th>
                          <th className="text-left px-4 py-3 font-medium">Produto</th>
                          <th className="text-right px-4 py-3 font-medium">Valor</th>
                          <th className="text-left px-4 py-3 font-medium">Plataforma</th>
                          <th className="text-left px-4 py-3 font-medium">Forma Pagto</th>
                          <th className="text-center px-6 py-3 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageRows.map((tx, i) => {
                          const dateObj = new Date(tx.created_at);
                          // Exclude seconds from the display
                          const dateFormatted = dateObj.toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          });
                          return (
                            <tr
                              key={tx.id}
                              className={`border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/50 dark:bg-gray-800/30'}`}
                            >
                              <td className="px-6 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                {dateFormatted}
                              </td>
                              <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                {tx.buyer_name}
                              </td>
                              <td className="px-4 py-3 text-gray-700 dark:text-gray-300 max-w-[200px] truncate">
                                {tx.product_name}
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">
                                R$ {tx.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs uppercase font-bold">
                                  {tx.platform}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                {tx.payment_method}
                              </td>
                              <td className="px-6 py-3 text-center whitespace-nowrap">
                                {getStatusBadge(tx.category, tx.status)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between gap-4">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Mostrando {(safeCurrentPage - 1) * pageSizeTx + 1}–{Math.min(safeCurrentPage * pageSizeTx, data.transactions.length)} de {data.transactions.length}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setCurrentPageTx(1)}
                          disabled={safeCurrentPage === 1}
                          className="px-2 py-1 rounded text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          «
                        </button>
                        <button
                          onClick={() => setCurrentPageTx(p => Math.max(1, p - 1))}
                          disabled={safeCurrentPage === 1}
                          className="px-3 py-1 rounded text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          Anterior
                        </button>

                        <span className="px-3 py-1 text-xs text-gray-500 dark:text-gray-400 font-medium">
                          Página {safeCurrentPage} de {totalPages}
                        </span>

                        <button
                          onClick={() => setCurrentPageTx(p => Math.min(totalPages, p + 1))}
                          disabled={safeCurrentPage === totalPages}
                          className="px-3 py-1 rounded text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          Próxima
                        </button>
                        <button
                          onClick={() => setCurrentPageTx(totalPages)}
                          disabled={safeCurrentPage === totalPages}
                          className="px-2 py-1 rounded text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          »
                        </button>
                      </div>
                    </div>
                  )}
                </>
              );
            })() : (
              <div className="text-center py-16 text-gray-400 dark:text-gray-500">
                Nenhuma transação encontrada para os filtros selecionados.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
