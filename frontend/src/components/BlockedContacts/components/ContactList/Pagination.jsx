import React from 'react';

export default function Pagination({ 
    currentPage, 
    totalPages, 
    setCurrentPage, 
    itemsPerPage, 
    setItemsPerPage, 
    totalResults,
    currentVisibleCount 
}) {
    return (
        <div className="flex items-center justify-between p-4 border-t border-white/5 bg-white/5 dark:bg-gray-900/50">
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <span>
                    Mostrando <span className="font-bold text-gray-700 dark:text-white">{currentVisibleCount}</span> de <span className="font-bold text-gray-700 dark:text-white">{totalResults}</span> resultados
                </span>

                <select
                    value={itemsPerPage}
                    onChange={(e) => {
                        setItemsPerPage(e.target.value === 'all' ? 'all' : Number(e.target.value));
                        setCurrentPage(1);
                    }}
                    className="bg-white/5 dark:bg-gray-800 border border-white/10 rounded-lg text-xs py-1 px-2 outline-none focus:ring-2 focus:ring-red-500"
                >
                    <option value={50}>50 por página</option>
                    <option value={100}>100 por página</option>
                    <option value={1000}>1000 por página</option>
                    <option value="all">Mostrar Tudo</option>
                </select>
            </div>
            
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-xs font-bold rounded-lg border border-white/10 bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                    Anterior
                </button>
                <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500 font-bold px-2">
                        Página <span className="text-red-500">{currentPage}</span> de {totalPages}
                    </span>
                </div>
                <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-xs font-bold rounded-lg border border-white/10 bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                    Próxima
                </button>
            </div>
        </div>
    );
}
