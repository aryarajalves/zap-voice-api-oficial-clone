import React, { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../config';
import { fetchWithAuth } from '../AuthContext';
import { useClient } from '../contexts/ClientContext';

const PERIOD_OPTIONS = [
  { value: 'daily', label: 'Por Dia' },
  { value: 'weekly', label: 'Por Semana' },
  { value: 'monthly', label: 'Por Mês' },
  { value: 'yearly', label: 'Por Ano' },
];

const SOURCE_OPTIONS = [
  { value: 'all', label: 'Todos', icon: '📊' },
  { value: 'bulk', label: 'Disparo em Massa', icon: '📤' },
  { value: 'webhook', label: 'Integração Webhook', icon: '🔗' },
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

export default function Financial() {
  const { activeClient } = useClient();
  const [period, setPeriod] = useState('monthly');
  const [source, setSource] = useState('all');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchData = useCallback(async () => {
    if (!activeClient) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(
        `${API_URL}/financial/summary?period=${period}&source=${source}`,
        {},
        activeClient.id
      );
      if (!res.ok) throw new Error(`Erro ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [activeClient, period, source]);

  useEffect(() => {
    fetchData();
    setCurrentPage(1);
  }, [fetchData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize]);

  const t = data?.totals;

  const freeRatio = t && t.total_sent > 0
    ? Math.round((t.free_sent / t.total_sent) * 100)
    : 0;

  return (
    <div className="space-y-8">
      {/* Period selector */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-2 flex-wrap">
          {PERIOD_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
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

        {/* Source filter */}
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Origem:</span>
          {SOURCE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => { setSource(opt.value); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                source === opt.value
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <span>{opt.icon}</span>
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
          Carregando dados financeiros...
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 rounded-xl p-4 text-sm">
          Erro ao carregar dados: {error}
        </div>
      )}

      {!loading && data && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <StatCard
              title="Total Disparado"
              value={t.total_sent.toLocaleString('pt-BR')}
              sub={`${t.total_triggers} disparo${t.total_triggers !== 1 ? 's' : ''}`}
              color="blue"
              icon="📤"
            />
            <StatCard
              title="Templates Pagos"
              value={t.paid_sent.toLocaleString('pt-BR')}
              sub={`${t.paid_triggers} disparo${t.paid_triggers !== 1 ? 's' : ''}`}
              color="red"
              icon="💳"
            />
            <StatCard
              title="Mensagens Gratuitas"
              value={t.free_sent.toLocaleString('pt-BR')}
              sub={`${freeRatio}% do total · ${t.free_triggers} disparo${t.free_triggers !== 1 ? 's' : ''}`}
              color="green"
              icon="🎁"
            />
            <StatCard
              title="Custo Total"
              value={`R$ ${t.total_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              sub="Templates pagos na Meta"
              color="amber"
              icon="💰"
            />
            <StatCard
              title="Economia Estimada"
              value={`R$ ${t.estimated_savings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              sub="Enviando como msg de sessão"
              color="purple"
              icon="📈"
            />
          </div>

          {/* Savings bar */}
          {t.total_sent > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex justify-between text-sm mb-2 font-medium text-gray-700 dark:text-gray-300">
                <span>Distribuição: Pago vs Gratuito</span>
                <span>{freeRatio}% gratuito</span>
              </div>
              <div className="h-3 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden flex">
                <div
                  className="bg-red-400 dark:bg-red-500 h-full transition-all"
                  style={{ width: `${100 - freeRatio}%` }}
                />
                <div
                  className="bg-green-400 dark:bg-green-500 h-full transition-all"
                  style={{ width: `${freeRatio}%` }}
                />
              </div>
              <div className="flex gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Template pago ({100 - freeRatio}%)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> Sessão gratuita ({freeRatio}%)</span>
              </div>
            </div>
          )}

          {/* Period table */}
          {data.rows.length > 0 ? (() => {
            const visibleRows = data.rows.filter(r => r.total_sent > 0);
            const totalPages = Math.ceil(visibleRows.length / pageSize);
            const pageRows = visibleRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
            const safeCurrentPage = Math.min(currentPage, totalPages);

            return (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Table header bar */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between gap-4">
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                    Detalhamento {PERIOD_OPTIONS.find(p => p.value === period)?.label}
                    <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">
                      ({visibleRows.length} {visibleRows.length === 1 ? 'período' : 'períodos'})
                    </span>
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <span>Exibir</span>
                    <select
                      value={pageSize}
                      onChange={e => setPageSize(Number(e.target.value))}
                      className="px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <span>por página</span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                        <th className="text-left px-6 py-3 font-medium">Período</th>
                        <th className="text-right px-4 py-3 font-medium">Total Enviado</th>
                        <th className="text-right px-4 py-3 font-medium">Pagos</th>
                        <th className="text-right px-4 py-3 font-medium">Gratuitos</th>
                        <th className="text-right px-4 py-3 font-medium">Custo (R$)</th>
                        <th className="text-right px-6 py-3 font-medium">Economia (R$)</th>
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
                            {row.total_sent.toLocaleString('pt-BR')}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-red-600 dark:text-red-400 font-medium">
                              {row.paid_sent.toLocaleString('pt-BR')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-green-600 dark:text-green-400 font-medium">
                              {row.free_sent.toLocaleString('pt-BR')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-amber-600 dark:text-amber-400 font-medium">
                            {row.total_cost > 0
                              ? `R$ ${row.total_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                              : '—'}
                          </td>
                          <td className="px-6 py-3 text-right text-purple-600 dark:text-purple-400 font-medium">
                            {row.estimated_savings > 0
                              ? `R$ ${row.estimated_savings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination footer */}
                {totalPages > 1 && (
                  <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between gap-4">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Mostrando {(safeCurrentPage - 1) * pageSize + 1}–{Math.min(safeCurrentPage * pageSize, visibleRows.length)} de {visibleRows.length}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCurrentPage(1)}
                        disabled={safeCurrentPage === 1}
                        className="px-2 py-1 rounded text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        «
                      </button>
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={safeCurrentPage === 1}
                        className="px-3 py-1 rounded text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        Anterior
                      </button>

                      {/* Page numbers */}
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(p => p === 1 || p === totalPages || Math.abs(p - safeCurrentPage) <= 2)
                        .reduce((acc, p, idx, arr) => {
                          if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                          acc.push(p);
                          return acc;
                        }, [])
                        .map((p, idx) =>
                          p === '...' ? (
                            <span key={`ellipsis-${idx}`} className="px-2 py-1 text-xs text-gray-400">…</span>
                          ) : (
                            <button
                              key={p}
                              onClick={() => setCurrentPage(p)}
                              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                p === safeCurrentPage
                                  ? 'bg-blue-600 text-white'
                                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                              }`}
                            >
                              {p}
                            </button>
                          )
                        )}

                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={safeCurrentPage === totalPages}
                        className="px-3 py-1 rounded text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        Próxima
                      </button>
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={safeCurrentPage === totalPages}
                        className="px-2 py-1 rounded text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        »
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })() : (
            <div className="text-center py-16 text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="text-4xl mb-3">📊</div>
              <p className="font-medium">Nenhum disparo concluído encontrado.</p>
              <p className="text-sm mt-1">Os dados aparecem após os disparos serem concluídos.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
