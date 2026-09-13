import React from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

export default function AppointmentsPagination({
  loading,
  total,
  page,
  setPage,
  limit,
  setLimit,
  totalPages,
}) {
  if (loading || total <= 0) return null;

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-6 py-4 border-t border-gray-100 dark:border-white/5 bg-gray-50/30 dark:bg-white/[0.01]">
      <div className="flex flex-wrap items-center gap-4 sm:gap-6">
        <span className="text-xs text-gray-400">
          Página <span className="font-bold text-gray-700 dark:text-gray-300">{page + 1}</span> de <span className="font-bold text-gray-700 dark:text-gray-300">{totalPages || 1}</span> (Total: {total})
        </span>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Exibir</span>
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(0);
            }}
            className="p-1 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-[#1e293b] text-gray-700 dark:text-gray-300 text-xs font-semibold focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="200">200</option>
          </select>
          <span className="text-xs text-gray-400">contatos</span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          disabled={page === 0}
          onClick={() => setPage(p => Math.max(0, p - 1))}
          className="p-2 border border-gray-300 dark:border-white/10 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 text-gray-500 disabled:opacity-40 transition-all cursor-pointer"
        >
          <FiChevronLeft />
        </button>
        <button
          disabled={page >= totalPages - 1 || totalPages <= 1}
          onClick={() => setPage(p => p + 1)}
          className="p-2 border border-gray-300 dark:border-white/10 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 text-gray-500 disabled:opacity-40 transition-all cursor-pointer"
        >
          <FiChevronRight />
        </button>
      </div>
    </div>
  );
}
