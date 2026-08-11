import React, { useMemo } from 'react';
import { FiSearch, FiTrash2, FiDownload, FiFilter } from 'react-icons/fi';

export default function Filters({
    searchTerm, setSearchTerm,
    reasonFilter, setReasonFilter,
    contacts,
    selectedCount, onBulkDelete, onExport
}) {
    // Derivar motivos únicos dos contatos carregados
    const reasonOptions = useMemo(() => {
        if (!contacts) return [];
        const set = new Set();
        contacts.forEach(c => { if (c.reason) set.add(c.reason); });
        return Array.from(set).sort();
    }, [contacts]);

    return (
        <div className="p-6 border-b border-white/5 bg-white/5 dark:bg-gray-900/30 flex flex-col gap-4">
            {/* Linha 1: título + ações */}
            <div className="flex justify-between items-center flex-wrap gap-4">
                <h3 className="font-bold text-gray-700 dark:text-white">Filtros e Ações</h3>

                <div className="flex gap-3 items-center flex-wrap">
                    {selectedCount > 0 && (
                        <button
                            onClick={onBulkDelete}
                            className="px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg text-sm font-bold hover:bg-red-500/20 transition-all flex items-center gap-2 animate-in slide-in-from-right-2"
                        >
                            <FiTrash2 /> Excluir {selectedCount} selecionados
                        </button>
                    )}

                    <button
                        onClick={onExport}
                        className="px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-sm font-bold hover:bg-emerald-500/20 transition-all flex items-center gap-2"
                        title="Exportar contatos para CSV"
                    >
                        <FiDownload /> Exportar Lista
                    </button>
                </div>
            </div>

            {/* Linha 2: filtros */}
            <div className="flex gap-3 items-center flex-wrap">
                {/* Filtro por motivo */}
                <div className="relative flex items-center gap-2">
                    <FiFilter className="text-gray-400 text-sm" />
                    <select
                        value={reasonFilter}
                        onChange={e => setReasonFilter(e.target.value)}
                        className="pl-3 pr-8 py-2 border border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none bg-white/5 dark:bg-gray-700/50 text-gray-900 dark:text-white appearance-none cursor-pointer min-w-[200px]"
                    >
                        <option value="">Todos os motivos</option>
                        {reasonOptions.map(r => (
                            <option key={r} value={r}>{r}</option>
                        ))}
                    </select>
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▼</span>
                </div>

                {/* Busca por telefone */}
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

                {/* Badge indicando filtro ativo */}
                {reasonFilter && (
                    <button
                        onClick={() => setReasonFilter('')}
                        className="px-3 py-1.5 bg-red-500/15 text-red-400 border border-red-500/20 rounded-lg text-xs font-bold hover:bg-red-500/25 transition-all flex items-center gap-1"
                        title="Limpar filtro de motivo"
                    >
                        🚫 {reasonFilter} ×
                    </button>
                )}
            </div>
        </div>
    );
}
