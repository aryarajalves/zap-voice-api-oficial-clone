import React from 'react';

export default function HumanAgentsPagination({
    page,
    setPage,
    totalPages,
    filteredCount,
    total,
    loading
}) {
    return (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-[#1e293b] p-4 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm text-xs font-semibold text-gray-500 dark:text-gray-400">
            <span>
                Mostrando {filteredCount} de {total} contatos
            </span>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1 || loading}
                    className="px-3.5 py-2 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                    Anterior
                </button>
                <span className="px-3.5 py-2 bg-blue-600/10 text-blue-600 rounded-xl">
                    Página {page} de {totalPages}
                </span>
                <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages || loading}
                    className="px-3.5 py-2 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                    Próxima
                </button>
            </div>
        </div>
    );
}
