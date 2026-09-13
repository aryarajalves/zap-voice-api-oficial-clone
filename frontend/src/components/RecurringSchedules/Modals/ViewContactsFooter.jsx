import React from 'react';

export const ViewContactsFooter = ({
    currentPage,
    setCurrentPage,
    totalPages,
    displayedCount,
    totalFiltered,
    totalGeneral,
    onClose,
    onSave,
    hasChanges,
    isSavingExclusions
}) => {
    return (
        <>
            {/* Footer com Paginação Local */}
            <div className="px-8 py-3 bg-slate-950/40 border-t border-white/5 flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                        disabled={currentPage === 0}
                        className={`px-3 py-1.5 bg-slate-800 text-slate-300 font-bold rounded-lg cursor-pointer ${currentPage === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-700'}`}
                    >
                        Anterior
                    </button>
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        Página {totalPages === 0 ? 0 : currentPage + 1} de {totalPages}
                    </span>
                    <button
                        type="button"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                        disabled={currentPage >= totalPages - 1}
                        className={`px-3 py-1.5 bg-slate-800 text-slate-300 font-bold rounded-lg cursor-pointer ${currentPage >= totalPages - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-700'}`}
                    >
                        Próxima
                    </button>
                </div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Página Atual: <span className="text-white text-sm">{displayedCount}</span> / Total: <span className="text-white text-sm">{totalFiltered}</span>
                </span>
            </div>

            <div className="p-6 bg-slate-850/60 border-t border-white/5 flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Total Geral: <span className="text-white text-sm">{totalGeneral}</span>
                </span>
                <div className="flex items-center gap-3">
                    <button 
                        type="button"
                        onClick={onClose}
                        className="px-6 py-3 bg-slate-800 text-slate-300 rounded-2xl font-black text-xs hover:bg-slate-700 transition-all active:scale-95 cursor-pointer"
                    >
                        FECHAR
                    </button>
                    <button 
                        type="button"
                        onClick={onSave}
                        disabled={!hasChanges || isSavingExclusions}
                        className={`px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs transition-all active:scale-95 shadow-xl shadow-blue-900/40 flex items-center gap-2 cursor-pointer ${(!hasChanges || isSavingExclusions) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isSavingExclusions && <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
                        SALVAR ALTERAÇÕES
                    </button>
                </div>
            </div>
        </>
    );
};
