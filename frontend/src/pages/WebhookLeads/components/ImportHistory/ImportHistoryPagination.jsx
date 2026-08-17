import React from 'react';

export default function ImportHistoryPagination({
  limit,
  total,
  page,
  setPage
}) {
  if (limit === 'all' || total <= limit) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 bg-white/5 dark:bg-gray-800/20 border border-gray-150 dark:border-gray-700/60 p-4 rounded-2xl shadow-sm backdrop-blur-md">
      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
        Mostrando {page * limit + 1} - {Math.min((page + 1) * limit, total)} de {total} listas
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setPage(prev => Math.max(0, prev - 1))}
          disabled={page === 0}
          className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-all shadow-sm cursor-pointer"
        >
          Anterior
        </button>
        <button
          onClick={() => setPage(prev => ((prev + 1) * limit < total ? prev + 1 : prev))}
          disabled={(page + 1) * limit >= total}
          className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-all shadow-sm cursor-pointer"
        >
          Próxima
        </button>
      </div>
    </div>
  );
}
