import React from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

/**
 * Componente de controle de paginação dos funis.
 */
export const FunnelPagination = ({
  itemsPerPage,
  setItemsPerPage,
  currentPage,
  setCurrentPage,
  totalPages
}) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-center px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 gap-4">
      <div className="flex items-center gap-2 text-xs text-gray-500 select-none">
        <span>Exibir</span>
        <select
          value={itemsPerPage}
          onChange={(e) => {
            setItemsPerPage(Number(e.target.value));
            setCurrentPage(1);
          }}
          className="nodrag nopan p-1.5 text-xs border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-semibold border-gray-200 dark:border-gray-700 outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={20}>20</option>
        </select>
        <span>funis por página</span>
      </div>

      <div className="flex items-center gap-3 select-none">
        <button
          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
          className="p-1.5 rounded-lg border bg-white dark:bg-gray-800 disabled:opacity-50 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
        >
          <FiChevronLeft size={16} />
        </button>
        <span className="text-xs font-bold text-gray-600 dark:text-gray-400 px-1">
          Página {currentPage} de {totalPages}
        </span>
        <button
          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded-lg border bg-white dark:bg-gray-800 disabled:opacity-50 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
        >
          <FiChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};
