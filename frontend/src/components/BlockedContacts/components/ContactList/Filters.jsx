import React, { useMemo, useState, useRef, useEffect } from 'react';
import { FiSearch, FiTrash2, FiDownload, FiFilter, FiChevronDown, FiCheck, FiUnlock, FiCheckCircle } from 'react-icons/fi';

export default function Filters({
    searchTerm, setSearchTerm,
    reasonFilter, setReasonFilter,
    contacts,
    selectedCount, onBulkDelete, onExport,
    listTab
}) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Fechar ao clicar fora
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
                            className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all flex items-center gap-2 animate-in slide-in-from-right-2 cursor-pointer shadow-md ${
                                listTab === 'resting'
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                            }`}
                            title={listTab === 'resting' ? "Remover do repouso os contatos selecionados" : "Desbloquear os contatos selecionados"}
                        >
                            {listTab === 'resting' ? <FiCheckCircle size={16} /> : <FiUnlock size={16} />}
                            <span>{listTab === 'resting' ? `Remover ${selectedCount} do repouso` : `Desbloquear ${selectedCount} selecionados`}</span>
                        </button>
                    )}

                    <button
                        onClick={onExport}
                        className="px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-sm font-bold hover:bg-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer"
                        title="Exportar contatos para CSV"
                    >
                        <FiDownload /> Exportar Lista
                    </button>
                </div>
            </div>

            {/* Linha 2: filtros */}
            <div className="flex gap-3 items-center flex-wrap">
                {/* Custom Dropdown de Motivo de Bloqueio */}
                <div className="relative flex items-center gap-2" ref={dropdownRef}>
                    <FiFilter className="text-gray-400 text-sm" />
                    
                    <button
                        type="button"
                        onClick={() => setIsOpen(!isOpen)}
                        className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-800/90 hover:bg-gray-800 border border-gray-700 rounded-xl text-sm font-medium text-white shadow-sm min-w-[240px] max-w-[400px] transition-all cursor-pointer"
                    >
                        <span className="truncate">
                            {reasonFilter || "Todos os motivos"}
                        </span>
                        <FiChevronDown className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Popover Menu Customizado com ótimo contraste e rolagem */}
                    {isOpen && (
                        <div className="absolute top-full left-6 mt-1.5 w-auto min-w-[280px] max-w-[450px] bg-gray-900 border border-gray-700/80 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                            <div className="max-h-64 overflow-y-auto py-1 divide-y divide-gray-800">
                                <button
                                    type="button"
                                    onClick={() => { setReasonFilter(''); setIsOpen(false); }}
                                    className={`w-full text-left px-4 py-2.5 text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                                        !reasonFilter 
                                            ? 'bg-red-500/20 text-red-400 font-bold' 
                                            : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                                    }`}
                                >
                                    <span>Todos os motivos</span>
                                    {!reasonFilter && <FiCheck className="text-red-400 text-sm" />}
                                </button>

                                {reasonOptions.map(r => (
                                    <button
                                        key={r}
                                        type="button"
                                        onClick={() => { setReasonFilter(r); setIsOpen(false); }}
                                        className={`w-full text-left px-4 py-2.5 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                                            reasonFilter === r 
                                                ? 'bg-red-500/20 text-red-400 font-bold' 
                                                : 'text-gray-200 hover:bg-gray-800 hover:text-white'
                                        }`}
                                    >
                                        <span className="break-words pr-2">{r}</span>
                                        {reasonFilter === r && <FiCheck className="text-red-400 text-sm flex-shrink-0" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
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
                        className="px-3 py-1.5 bg-red-500/15 text-red-400 border border-red-500/20 rounded-lg text-xs font-bold hover:bg-red-500/25 transition-all flex items-center gap-1 cursor-pointer"
                        title="Limpar filtro de motivo"
                    >
                        🚫 {reasonFilter} ×
                    </button>
                )}
            </div>
        </div>
    );
}
