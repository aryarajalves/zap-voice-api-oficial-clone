import React from 'react';
import { FiClock, FiRefreshCw } from 'react-icons/fi';

export default function EmailHistoryHeader({
  pageSize,
  setPageSize,
  setCurrentPage,
  fetchHistory,
  loading
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <FiClock className="text-blue-500" /> Histórico de Disparos de E-mail
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Auditoria completa dos envios de e-mail marketing realizados.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 font-medium">
          <span>Mostrar por página:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-white px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm"
          >
            <option value={20}>20 disparos</option>
            <option value={50}>50 disparos</option>
            <option value={100}>100 disparos</option>
            <option value={200}>200 disparos</option>
          </select>
        </div>

        <button
          onClick={fetchHistory}
          className="p-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl transition-all shadow-sm"
          title="Atualizar histórico"
        >
          <FiRefreshCw className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
    </div>
  );
}
