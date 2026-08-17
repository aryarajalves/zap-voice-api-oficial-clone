import React from 'react';

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

export default function PeriodRevenueTable({
  rows = [],
  periodType,
  pageSizePeriod,
  currentPagePeriod,
  setCurrentPagePeriod
}) {
  const totalPages = Math.ceil(rows.length / pageSizePeriod);
  const pageRows = rows.slice((currentPagePeriod - 1) * pageSizePeriod, currentPagePeriod * pageSizePeriod);
  const safeCurrentPage = Math.min(currentPagePeriod, Math.max(1, totalPages));

  return (
    <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col justify-between">
      <div>
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
            Faturamento por Período
          </h3>
        </div>
        {rows.length > 0 ? (
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
                        {formatPeriodLabel(row.period, periodType)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                        {(row.sales_count || 0).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-6 py-3 text-right text-green-600 dark:text-green-400 font-semibold">
                        R$ {(row.revenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                    className="px-2 py-1 rounded text-xs border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setCurrentPagePeriod(p => Math.min(totalPages, p + 1))}
                    disabled={safeCurrentPage === totalPages}
                    className="px-2 py-1 rounded text-xs border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500">
            Nenhuma venda encontrada para o período.
          </div>
        )}
      </div>
    </div>
  );
}
