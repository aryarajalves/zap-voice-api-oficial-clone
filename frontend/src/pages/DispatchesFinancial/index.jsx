import React from 'react';
import useDispatchesFinancial from './hooks/useDispatchesFinancial';
import {
  DispatchesFilterBar,
  FinancialSummaryCards,
  FinancialSavingsBar,
  FinancialPeriodTable,
  FinancialEmptyState
} from './components';

export default function DispatchesFinancial({ activeClient }) {
  const {
    period,
    setPeriod,
    source,
    setSource,
    data,
    totals,
    freeRatio,
    loading,
    error,
    pageSize,
    setPageSize,
    currentPage,
    setCurrentPage,
    totalPages,
    visibleRows,
    pageRows
  } = useDispatchesFinancial(activeClient);

  return (
    <div className="space-y-8">
      <DispatchesFilterBar
        period={period}
        setPeriod={setPeriod}
        source={source}
        setSource={setSource}
      />

      {loading && (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <svg className="animate-spin w-6 h-6 mr-3" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8z"
            />
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
          <FinancialSummaryCards totals={totals} freeRatio={freeRatio} />

          <FinancialSavingsBar totals={totals} freeRatio={freeRatio} />

          {data.rows && data.rows.length > 0 ? (
            <FinancialPeriodTable
              period={period}
              periodType={data.period_type}
              pageSize={pageSize}
              setPageSize={setPageSize}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              totalPages={totalPages}
              visibleRows={visibleRows}
              pageRows={pageRows}
            />
          ) : (
            <FinancialEmptyState />
          )}
        </>
      )}
    </div>
  );
}
