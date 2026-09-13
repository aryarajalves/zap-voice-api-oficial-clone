import React from 'react';
import { FiTrash2 } from 'react-icons/fi';

const ContactBulkActionBar = ({
    selectedPhonesCount,
    totalItems,
    onSelectAllFiltered,
    onClearSelection,
    onOpenBulkDeleteModal
}) => {
    if (selectedPhonesCount === 0) return null;

    return (
        <div className="bg-gradient-to-r from-red-950/80 via-slate-900 to-slate-900 border-b border-red-500/30 p-3 px-6 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-3">
                <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-xs px-3 py-1 rounded-xl font-black">
                    {selectedPhonesCount} selecionado{selectedPhonesCount > 1 ? 's' : ''}
                </span>
                <button
                    type="button"
                    onClick={onSelectAllFiltered}
                    className="text-[10px] font-black text-slate-400 hover:text-white uppercase tracking-wider underline transition-colors cursor-pointer"
                >
                    {selectedPhonesCount === totalItems ? 'Desmarcar Todos' : `Selecionar Todos os ${totalItems} Contatos`}
                </button>
            </div>

            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={onClearSelection}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                    Limpar Seleção
                </button>
                <button
                    type="button"
                    onClick={onOpenBulkDeleteModal}
                    className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-red-900/30 active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                    <FiTrash2 size={14} />
                    Deletar Selecionados ({selectedPhonesCount})
                </button>
            </div>
        </div>
    );
};

export default ContactBulkActionBar;
