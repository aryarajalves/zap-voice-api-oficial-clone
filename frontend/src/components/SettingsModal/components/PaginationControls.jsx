import React from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const PaginationControls = ({ page, limit, total, onPageChange, onLimitChange }) => {
    const totalPages = Math.ceil(total / limit) || 1;
    
    return (
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-4">
                <select 
                    value={limit}
                    onChange={(e) => {
                        onLimitChange(Number(e.target.value));
                        onPageChange(0); // Reset to first page
                    }}
                    className="text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 outline-none text-gray-600 dark:text-gray-400"
                >
                    <option value={20}>20 por página</option>
                    <option value={50}>50 por página</option>
                    <option value={100}>100 por página</option>
                </select>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Total: {total}
                </span>
            </div>

            <div className="flex items-center gap-2">
                <button
                    type="button"
                    disabled={page === 0}
                    onClick={() => onPageChange(page - 1)}
                    className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-gray-700 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                    <FiChevronLeft size={16} />
                </button>
                <span className="text-xs font-bold text-gray-600 dark:text-gray-400 min-w-[60px] text-center">
                    {page + 1} / {totalPages}
                </span>
                <button
                    type="button"
                    disabled={page + 1 >= totalPages}
                    onClick={() => onPageChange(page + 1)}
                    className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-gray-700 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                    <FiChevronRight size={16} />
                </button>
            </div>
        </div>
    );
};

export default PaginationControls;
