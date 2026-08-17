import React from 'react';
import { FiClock, FiUsers, FiRefreshCw } from 'react-icons/fi';

export default function ImportHistoryHeader({
  limit,
  setLimit,
  setPage,
  onNavigateToLeads,
  fetchHistory,
  loading
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/20">
            <FiClock className="text-white" />
          </div>
          Histórico de Importação de Contatos
        </h1>
        <p className="text-gray-550 dark:text-gray-400 mt-2">
          Acompanhe o progresso e gerencie os nomes das listas carregadas em segundo plano.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Mostrar:</span>
          <select
            value={limit}
            onChange={(e) => {
              const val = e.target.value;
              setLimit(val === 'all' ? 'all' : parseInt(val, 10));
              setPage(0);
            }}
            className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer shadow-sm text-gray-700 dark:text-gray-200"
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={500}>500</option>
            <option value="all">Tudo</option>
          </select>
        </div>

        {onNavigateToLeads && (
          <button
            onClick={onNavigateToLeads}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-all shadow-sm shadow-blue-500/20 cursor-pointer"
          >
            <FiUsers size={15} />
            Ver Contatos
          </button>
        )}

        <button
          onClick={() => fetchHistory(true)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm cursor-pointer"
        >
          <FiRefreshCw className={loading ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>
    </div>
  );
}
