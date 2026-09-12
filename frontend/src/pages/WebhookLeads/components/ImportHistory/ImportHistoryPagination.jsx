import React from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

export default function ImportHistoryPagination({
  limit,
  total,
  page,
  setPage
}) {
  if (!total || total === 0) return null;

  const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 20));
  const totalPages = Math.ceil(total / safeLimit) || 1;
  const currentPage = page + 1;
  const startItem = page * safeLimit + 1;
  const endItem = Math.min((page + 1) * safeLimit, total);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 bg-white/5 dark:bg-gray-800/20 border border-gray-150 dark:border-gray-700/60 p-4 rounded-2xl shadow-sm backdrop-blur-md">
      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
        Mostrando {startItem} - {endItem} de {total} listas
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setPage(prev => Math.max(0, prev - 1))}
          disabled={page === 0}
          className="flex items-center gap-1 px-3.5 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer"
        >
          <FiChevronLeft size={14} /> Anterior
        </button>
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 px-2">
          Página <strong className="text-blue-600 dark:text-blue-400">{currentPage}</strong> de {totalPages}
        </span>
        <button
          onClick={() => setPage(prev => ((prev + 1) * safeLimit < total ? prev + 1 : prev))}
          disabled={(page + 1) * safeLimit >= total}
          className="flex items-center gap-1 px-3.5 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer"
        >
          Próxima <FiChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
