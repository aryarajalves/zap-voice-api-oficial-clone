import React from 'react';

export default function FinancialSavingsBar({ totals, freeRatio }) {
  if (!totals || totals.total_sent <= 0) return null;

  return (
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
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Template pago ({100 - freeRatio}%)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> Sessão gratuita ({freeRatio}%)
        </span>
      </div>
    </div>
  );
}
