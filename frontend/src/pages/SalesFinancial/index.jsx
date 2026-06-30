import React, { useState, useEffect, useCallback, useRef } from 'react';
import { API_URL } from '../../config';
import { fetchWithAuth } from '../../AuthContext';
import TransactionsTable from './components/TransactionsTable';
import PaymentMethodStats from './components/PaymentMethodStats';

const PERIOD_OPTIONS = [
  { value: 'daily', label: 'Por Dia' },
  { value: 'weekly', label: 'Por Semana' },
  { value: 'monthly', label: 'Por Mês' },
  { value: 'yearly', label: 'Por Ano' },
];

const STATUS_FILTER_OPTIONS = [
  { value: 'approved', label: 'Compra Aprovada' },
  { value: 'refunded', label: 'Reembolso' },
];

const PLATFORM_FILTER_OPTIONS = [
  { value: 'all',       label: 'Todas as Plataformas' },
  { value: 'braip',     label: 'Braip' },
  { value: 'cakto',     label: 'Cakto' },
  { value: 'eduzz',     label: 'Eduzz' },
  { value: 'greenn',    label: 'Greenn' },
  { value: 'guru',      label: 'Digital Manager Guru' },
  { value: 'herospark', label: 'HeroSpark' },
  { value: 'hotmart',   label: 'Hotmart' },
  { value: 'hubla',     label: 'Hubla' },
  { value: 'kirvano',   label: 'Kirvano' },
  { value: 'kiwify',    label: 'Kiwify' },
  { value: 'lastlink',  label: 'Lastlink' },
  { value: 'monetizze', label: 'Monetizze' },
  { value: 'pagtrust',  label: 'PagTrust' },
  { value: 'pepper',    label: 'Pepper' },
  { value: 'ticto',     label: 'Ticto' },
];

const PAYMENT_METHOD_OPTIONS = [
  { value: 'all', label: 'Todas' },
  { value: 'pix', label: 'Pix' },
  { value: 'credit_card', label: 'Cartão de Crédito' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'other', label: 'Outros' },
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
  const [statuses, setStatuses] = useState([]);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef(null);
  useEffect(() => {
    if (!statusDropdownOpen) return;
    const handler = (e) => { if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target)) setStatusDropdownOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [statusDropdownOpen]);

  const [platforms, setPlatforms] = useState([]);
  const [platformDropdownOpen, setPlatformDropdownOpen] = useState(false);
  const platformDropdownRef = useRef(null);
  useEffect(() => {
    if (!platformDropdownOpen) return;
    const handler = (e) => { if (platformDropdownRef.current && !platformDropdownRef.current.contains(e.target)) setPlatformDropdownOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [platformDropdownOpen]);
  const [paymentMethod, setPaymentMethod] = useState('all');
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
      const platformParam = platforms.length > 0 ? platforms.join(',') : 'all';
      const statusParam = statuses.length > 0 ? statuses.join(',') : 'all';
      const url = `${API_URL}/financial/sales?period=${period}&status=${statusParam}&platform=${platformParam}&start_date=${startDate}&end_date=${endDate}`;
      const res = await fetchWithAuth(url, {}, activeClient.id);
      if (!res.ok) throw new Error(`Erro ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [activeClient, period, statuses, platforms, startDate, endDate]);

  useEffect(() => {
    fetchData();
    setCurrentPagePeriod(1);
    setCurrentPageTx(1);
  }, [fetchData]);

  const totals = data?.totals;

  const normalizeMethod = (method) => {
    if (!method) return 'Outros';
    const m = method.toLowerCase().trim();
    if (m.includes('pix')) return 'Pix';
    if (m.includes('boleto') || m.includes('billet')) return 'Boleto';
    if (m.includes('cart') || m.includes('credit') || m.includes('débito') || m.includes('debit')) return 'Cartão de Crédito';
    return 'Outros';
  };

  // Filter transactions locally by payment method
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

        {/* Platform filter - multi-select dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium shrink-0">Plataforma:</span>
          <div className="relative" ref={platformDropdownRef}>
            <button
              onClick={() => setPlatformDropdownOpen(o => !o)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all min-w-[180px] justify-between"
            >
              <span>
                {platforms.length === 0
                  ? 'Todas as Plataformas'
                  : platforms.length === 1
                    ? PLATFORM_FILTER_OPTIONS.find(o => o.value === platforms[0])?.label
                    : `${platforms.length} plataformas`}
              </span>
              <svg className={`w-3 h-3 transition-transform ${platformDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {platformDropdownOpen && (
              <div className="absolute z-50 top-full mt-1 left-0 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden">
                <div className="p-1 max-h-64 overflow-y-auto overflow-x-hidden">
                  {PLATFORM_FILTER_OPTIONS.filter(o => o.value !== 'all').map(opt => {
                    const checked = platforms.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setPlatforms(prev =>
                            prev.includes(opt.value)
                              ? prev.filter(p => p !== opt.value)
                              : [...prev, opt.value]
                          );
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all text-left"
                      >
                        <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${checked ? 'bg-blue-500 border-blue-500' : 'border-gray-300 dark:border-gray-600'}`}>
                          {checked && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                        </span>
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                {platforms.length > 0 && (
                  <div className="border-t border-gray-100 dark:border-gray-700 p-1">
                    <button
                      onClick={() => { setPlatforms([]); setPlatformDropdownOpen(false); }}
                      className="w-full px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all text-left"
                    >
                      Limpar seleção
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          {platforms.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {platforms.map(p => (
                <span key={p} className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-md text-[10px] font-semibold">
                  {PLATFORM_FILTER_OPTIONS.find(o => o.value === p)?.label}
                  <button onClick={() => setPlatforms(prev => prev.filter(x => x !== p))} className="hover:text-blue-200">×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Status filter - multi-select dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium shrink-0">Status:</span>
          <div className="relative" ref={statusDropdownRef}>
            <button
              onClick={() => setStatusDropdownOpen(o => !o)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all min-w-[160px] justify-between"
            >
              <span>
                {statuses.length === 0
                  ? 'Todos os Status'
                  : statuses.length === 1
                    ? STATUS_FILTER_OPTIONS.find(o => o.value === statuses[0])?.label
                    : `${statuses.length} status`}
              </span>
              <svg className={`w-3 h-3 transition-transform ${statusDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {statusDropdownOpen && (
              <div className="absolute z-50 top-full mt-1 left-0 w-52 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl">
                <div className="p-1">
                  {STATUS_FILTER_OPTIONS.map(opt => {
                    const checked = statuses.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setStatuses(prev => prev.includes(opt.value) ? prev.filter(s => s !== opt.value) : [...prev, opt.value])}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all text-left"
                      >
                        <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${checked ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 dark:border-gray-600'}`}>
                          {checked && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                        </span>
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                {statuses.length > 0 && (
                  <div className="border-t border-gray-100 dark:border-gray-700 p-1">
                    <button
                      onClick={() => { setStatuses([]); setStatusDropdownOpen(false); }}
                      className="w-full px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all text-left"
                    >
                      Limpar seleção
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          {statuses.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {statuses.map(s => (
                <span key={s} className="flex items-center gap-1 px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-md text-[10px] font-semibold">
                  {STATUS_FILTER_OPTIONS.find(o => o.value === s)?.label}
                  <button onClick={() => setStatuses(prev => prev.filter(x => x !== s))} className="hover:text-indigo-200">×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Payment Method filter */}
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Forma de Pagto:</span>
          {PAYMENT_METHOD_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => {
                setPaymentMethod(opt.value);
                setCurrentPageTx(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                paymentMethod === opt.value
                  ? 'bg-emerald-600 text-white shadow-sm'
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

            {/* Stats Sidebar */}
            <div className="space-y-6">
              {/* Payment Method Stats */}
              <PaymentMethodStats transactions={data.transactions || []} />

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
          </div>

          {/* Detailed Transactions List */}
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
