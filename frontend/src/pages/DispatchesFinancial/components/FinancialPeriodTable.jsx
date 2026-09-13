import React from 'react';
import { PERIOD_OPTIONS, formatPeriodLabel } from '../constants';

export default function FinancialPeriodTable({
  period,
  periodType,
  pageSize,
  setPageSize,
  currentPage,
  setCurrentPage,
  totalPages,
  visibleRows,
  pageRows
}) {
  const periodLabel = PERIOD_OPTIONS.find((p) => p.value === period)?.label || '';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between gap-4">
        <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
          Detalhamento {periodLabel}
          <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">
            ({visibleRows.length} {visibleRows.length === 1 ? 'período' : 'períodos'})
          </span>
        </h3>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span>Exibir</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
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
                className={`border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${
                  i % 2 === 0 ? '' : 'bg-gray-50/50 dark:bg-gray-800/30'
                }`}
              >
                <td className="px-6 py-3 font-medium text-gray-800 dark:text-gray-200">
                  {formatPeriodLabel(row.period, periodType)}
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

      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between gap-4">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Mostrando {(currentPage - 1) * pageSize + 1}–
            {Math.min(currentPage * pageSize, visibleRows.length)} de {visibleRows.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-2 py-1 rounded text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              «
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
              .reduce((acc, p, idx, arr) => {
                if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                acc.push(p);
                return acc;
              }, [])
              .map((p, idx) =>
                p === '...' ? (
                  <span key={`ellipsis-${idx}`} className="px-2 py-1 text-xs text-gray-400">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      p === currentPage
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Próxima
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-2 py-1 rounded text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              »
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
