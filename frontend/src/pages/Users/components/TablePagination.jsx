import React from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const TablePagination = ({
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    totalItems
}) => {
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
    const safeCurrentPage = Math.min(currentPage, totalPages);
    
    const startIndex = totalItems === 0 ? 0 : (safeCurrentPage - 1) * itemsPerPage + 1;
    const endIndex = Math.min(safeCurrentPage * itemsPerPage, totalItems);

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/40 text-xs">
            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                <span>
                    Mostrando <strong className="text-gray-900 dark:text-white">{startIndex}-{endIndex}</strong> de <strong className="text-gray-900 dark:text-white">{totalItems}</strong>
                </span>

                <div className="flex items-center gap-1.5 ml-2">
                    <span className="text-gray-400">Exibir:</span>
                    <select
                        value={itemsPerPage}
                        onChange={(e) => {
                            setItemsPerPage(Number(e.target.value));
                            setCurrentPage(1);
                        }}
                        className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-2 py-1 font-semibold text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value={5}>5 por página</option>
                        <option value={10}>10 por página</option>
                        <option value={20}>20 por página</option>
                        <option value={50}>50 por página</option>
                    </select>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={safeCurrentPage <= 1}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                    <FiChevronLeft size={14} />
                    <span>Anterior</span>
                </button>

                <span className="px-3 font-semibold text-gray-600 dark:text-gray-400">
                    Página <strong className="text-blue-600 dark:text-blue-400">{safeCurrentPage}</strong> de <strong>{totalPages}</strong>
                </span>

                <button
                    type="button"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={safeCurrentPage >= totalPages}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                    <span>Próxima</span>
                    <FiChevronRight size={14} />
                </button>
            </div>
        </div>
    );
};

export default TablePagination;
