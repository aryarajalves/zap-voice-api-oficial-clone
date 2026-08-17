import React from 'react';

export default function ContactsPaginationFooter({
  totalCount,
  currentPage,
  totalPages,
  perPage,
  setPerPage,
  setPage
}) {
  if (totalCount <= 0) return null;

  return (
    <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">Itens por página:</span>
        <select
          id="contacts-per-page"
          value={perPage}
          onChange={(e) => setPerPage(Number(e.target.value))}
          className="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 outline-none font-bold text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
        >
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
          <option value={500}>500</option>
          <option value={1000}>1000</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
          {((currentPage - 1) * perPage) + 1}–{Math.min(currentPage * perPage, totalCount)} de {totalCount}
        </span>
        <button
          id="contacts-prev-page"
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={currentPage <= 1}
          className="px-2 py-1 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs font-bold flex items-center gap-1 cursor-pointer"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
          Ant.
        </button>
        <span className="text-xs font-bold text-gray-700 dark:text-gray-200 min-w-[60px] text-center">
          Pág. {currentPage}/{totalPages}
        </span>
        <button
          id="contacts-next-page"
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={currentPage >= totalPages}
          className="px-2 py-1 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs font-bold flex items-center gap-1 cursor-pointer"
        >
          Próx.
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>
    </div>
  );
}
