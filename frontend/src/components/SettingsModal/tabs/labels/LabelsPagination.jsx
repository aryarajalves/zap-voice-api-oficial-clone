import React from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const LabelsPagination = ({
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    onPageChange
}) => {
    if (totalItems === 0) return null;

    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-100 dark:border-white/5">
            <div className="text-xs text-gray-500 dark:text-gray-400">
                {totalPages > 1 ? (
                    <>
                        Mostrando <span className="font-semibold text-gray-700 dark:text-gray-200">{startItem}</span> a{' '}
                        <span className="font-semibold text-gray-700 dark:text-gray-200">{endItem}</span> de{' '}
                        <span className="font-semibold text-gray-700 dark:text-gray-200">{totalItems}</span> marcadores
                    </>
                ) : (
                    <>
                        Total de <span className="font-semibold text-gray-700 dark:text-gray-200">{totalItems}</span>{' '}
                        {totalItems === 1 ? 'marcador' : 'marcadores'}
                    </>
                )}
            </div>

            {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1"
                        title="Página Anterior"
                    >
                        <FiChevronLeft size={14} />
                        <span className="hidden sm:inline">Anterior</span>
                    </button>

                    <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                            <button
                                key={pageNum}
                                type="button"
                                onClick={() => onPageChange(pageNum)}
                                className={`w-8 h-8 text-xs font-bold rounded-lg transition-all ${
                                    currentPage === pageNum
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 border border-transparent'
                                }`}
                            >
                                {pageNum}
                            </button>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1"
                        title="Próxima Página"
                    >
                        <span className="hidden sm:inline">Próxima</span>
                        <FiChevronRight size={14} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default LabelsPagination;
