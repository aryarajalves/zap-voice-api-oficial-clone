import React from 'react';
import { FiTrash2, FiCheckCircle, FiX, FiCheckSquare } from 'react-icons/fi';

export default function HumanAgentsBulkBar({
    totalFiltered,
    total,
    selectedCount,
    allSelected,
    isAllPagesSelected = false,
    onToggleSelectAll,
    onSelectAllPages,
    onDeleteSelected,
    onFinishSelected,
    onClearSelection,
    isProcessing = false
}) {
    if (totalFiltered === 0) return null;

    const showAllPagesOption = allSelected && total > totalFiltered;

    return (
        <div className="flex flex-col gap-3 bg-white dark:bg-[#1e293b] p-4 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm transition-all">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-gray-700 dark:text-gray-300 select-none">
                        <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={onToggleSelectAll}
                            disabled={isProcessing}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 cursor-pointer disabled:opacity-50"
                        />
                        <span>
                            Selecionar todos na página ({totalFiltered})
                        </span>
                    </label>

                    {selectedCount > 0 && (
                        <span className="px-2.5 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-xl text-[11px] font-black">
                            {selectedCount} selecionado{selectedCount > 1 ? 's' : ''}
                            {isAllPagesSelected ? ' (todas as páginas)' : ''}
                        </span>
                    )}
                </div>

                {selectedCount > 0 && (
                    <div className="flex flex-wrap items-center gap-2.5 animate-in fade-in slide-in-from-right-2 duration-200">
                        <button
                            onClick={onFinishSelected}
                            disabled={isProcessing}
                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/15 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            title="Finalizar atendimento dos contatos selecionados"
                        >
                            <FiCheckCircle size={14} />
                            <span>Finalizar ({selectedCount})</span>
                        </button>

                        <button
                            onClick={onDeleteSelected}
                            disabled={isProcessing}
                            className="px-3.5 py-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-red-600/15 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            title="Deletar contatos selecionados permanentemente"
                        >
                            <FiTrash2 size={14} />
                            <span>Deletar ({selectedCount})</span>
                        </button>

                        <button
                            onClick={onClearSelection}
                            disabled={isProcessing}
                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
                            title="Desmarcar todos"
                        >
                            <FiX size={16} />
                        </button>
                    </div>
                )}
            </div>

            {/* Banner de seleção de todas as páginas */}
            {showAllPagesOption && (
                <div className="w-full pt-2.5 border-t border-gray-100 dark:border-white/5 flex items-center justify-center text-xs animate-in fade-in duration-200">
                    {!isAllPagesSelected ? (
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                            <span>
                                Todos os <strong>{totalFiltered}</strong> contatos desta página estão selecionados.
                            </span>
                            <button
                                type="button"
                                onClick={onSelectAllPages}
                                disabled={isProcessing}
                                className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer flex items-center gap-1"
                            >
                                <FiCheckSquare size={13} />
                                Selecionar todos os {total} contatos da fila (todas as páginas)
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold">
                            <span>
                                ✓ Todos os <strong>{total}</strong> contatos de todas as páginas estão selecionados.
                            </span>
                            <button
                                type="button"
                                onClick={onClearSelection}
                                disabled={isProcessing}
                                className="underline font-bold hover:text-blue-800 dark:hover:text-blue-300 cursor-pointer ml-1"
                            >
                                Desmarcar seleção
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
