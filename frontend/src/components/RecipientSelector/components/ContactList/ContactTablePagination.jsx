import React from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const ContactTablePagination = ({
    itemsPerPage,
    handleItemsPerPageChange,
    totalItems,
    startIndex,
    endIndex,
    currentPage,
    totalPages,
    setCurrentPage
}) => {
    return (
        <div className="p-4 px-6 bg-[#0b132b]/80 border-t border-white/5 flex items-center justify-between gap-4 flex-wrap text-xs">
            {/* Seleção de Contatos por Página */}
            <div className="flex items-center gap-2">
                <span className="text-slate-400 font-bold text-[11px]">Exibir:</span>
                <select
                    value={itemsPerPage}
                    onChange={handleItemsPerPageChange}
                    className="bg-slate-800 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-black text-emerald-400 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                    <option value={50}>50 contatos</option>
                    <option value={100}>100 contatos</option>
                    <option value={200}>200 contatos</option>
                    <option value={500}>500 contatos</option>
                </select>
                <span className="text-slate-400 font-bold text-[11px]">por página</span>
            </div>

            {/* Contador de Números Filtrados */}
            <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                Mostrando <span className="text-white font-mono">{totalItems > 0 ? startIndex + 1 : 0}</span> a <span className="text-white font-mono">{Math.min(endIndex, totalItems)}</span> de <span className="text-emerald-400 font-mono">{totalItems}</span> números filtrados
            </div>

            {/* Controles de Navegação de Página */}
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 active:scale-95"
                >
                    <FiChevronLeft size={14} /> Anterior
                </button>

                <span className="text-xs font-black text-slate-300 px-2">
                    Página <strong className="text-emerald-400">{currentPage}</strong> de {totalPages}
                </span>

                <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 active:scale-95"
                >
                    Próxima <FiChevronRight size={14} />
                </button>
            </div>
        </div>
    );
};

export default ContactTablePagination;