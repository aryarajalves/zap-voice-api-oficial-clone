import React from 'react';
import { FiSearch, FiTrash2 } from 'react-icons/fi';

export default function Filters({ searchTerm, setSearchTerm, selectedCount, onBulkDelete }) {
    return (
        <div className="p-6 border-b border-white/5 bg-white/5 dark:bg-gray-900/30 flex justify-between items-center flex-wrap gap-4">
            <h3 className="font-bold text-gray-700 dark:text-white">Filtros e Ações</h3>

            <div className="flex gap-4 items-center">
                {selectedCount > 0 && (
                    <button
                        onClick={onBulkDelete}
                        className="px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg text-sm font-bold hover:bg-red-500/20 transition-all flex items-center gap-2 animate-in slide-in-from-right-2"
                    >
                        <FiTrash2 /> Excluir {selectedCount} selecionados
                    </button>
                )}

                <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar telefone (pode colar lista)..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none w-64 transition-all focus:w-80 bg-white/5 dark:bg-gray-700/50 text-gray-900 dark:text-white"
                    />
                </div>
            </div>
        </div>
    );
}
