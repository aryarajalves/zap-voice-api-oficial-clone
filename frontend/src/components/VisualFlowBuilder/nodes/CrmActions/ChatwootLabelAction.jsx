import React from 'react';
import { FiX, FiChevronDown, FiSearch } from 'react-icons/fi';

const ChatwootLabelAction = ({
    labels,
    setLabels,
    loadingLabels,
    selectedAddLabels,
    selectedRemoveLabels,
    toggleAddLabel,
    toggleRemoveLabel,
    filteredAddLabels,
    filteredRemoveLabels,
    isAddOpen,
    setIsAddOpen,
    isRemoveOpen,
    setIsRemoveOpen,
    addSearch,
    setAddSearch,
    removeSearch,
    setRemoveSearch,
    addDropdownRef,
    removeDropdownRef
}) => {
    return (
        <div className="space-y-3 pt-1 border-t border-gray-100 dark:border-gray-700/50">
            {/* ADICIONAR ETIQUETAS */}
            <div>
                <label className="text-[9px] font-bold text-emerald-500 uppercase block mb-1">Adicionar Etiquetas</label>
                {selectedAddLabels.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-1.5">
                        {selectedAddLabels.map(l => (
                            <span key={l} className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded text-[9px] font-bold border border-emerald-200 dark:border-emerald-800">
                                {l}
                                <button type="button" onClick={() => toggleAddLabel(l)} className="text-emerald-400 hover:text-red-500"><FiX size={10} /></button>
                            </span>
                        ))}
                    </div>
                )}
                <div className="relative" ref={addDropdownRef}>
                    <div onClick={() => !loadingLabels && setIsAddOpen(!isAddOpen)} className="nodrag nopan w-full text-xs p-2 bg-gray-55 dark:bg-gray-900 border rounded cursor-pointer flex justify-between items-center text-gray-900 dark:text-gray-100 dark:border-gray-700">
                        <span className="truncate">{loadingLabels ? 'Carregando...' : 'Selecione...'}</span>
                        <FiChevronDown />
                    </div>
                    {isAddOpen && (
                        <div className="nodrag nopan absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-gray-900 border rounded shadow-xl max-h-60 overflow-hidden flex flex-col border-gray-200 dark:border-gray-700">
                            <div className="p-2 border-b flex items-center gap-1">
                                <FiSearch className="text-gray-400" />
                                <input
                                    type="text"
                                    className="nodrag w-full text-xs bg-transparent outline-none text-gray-900 dark:text-gray-100"
                                    placeholder="Buscar..."
                                    value={addSearch}
                                    onChange={(e) => setAddSearch(e.target.value)}
                                />
                            </div>
                            <div className="nodrag nopan nowheel overflow-y-auto max-h-40 flex-1 premium-scrollbar">
                                {addSearch.trim() !== '' && !labels.some(l => l.title.toLowerCase() === addSearch.trim().toLowerCase()) && (
                                    <div
                                        className="p-2 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer font-bold border-b border-dashed border-indigo-200 dark:border-indigo-850/40 text-center"
                                        onClick={() => {
                                            const newLabelStr = addSearch.trim();
                                            setLabels(prev => [...prev, { id: prev.length, title: newLabelStr }]);
                                            toggleAddLabel(newLabelStr);
                                            setIsAddOpen(false);
                                            setAddSearch('');
                                        }}
                                    >
                                        ➕ Criar etiqueta "{addSearch.trim()}"
                                    </div>
                                )}
                                {filteredAddLabels.map(l => (
                                    <div
                                        key={l.id}
                                        className="p-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer text-gray-900 dark:text-gray-100"
                                        onClick={() => { toggleAddLabel(l.title); setIsAddOpen(false); setAddSearch(''); }}
                                    >
                                        {l.title}
                                    </div>
                                ))}
                                {filteredAddLabels.length === 0 && addSearch.trim() === '' && (
                                    <div className="p-3 text-center text-xs text-gray-400 italic">Nenhuma etiqueta encontrada</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* REMOVER ETIQUETAS */}
            <div>
                <label className="text-[9px] font-bold text-rose-500 uppercase block mb-1">Remover Etiquetas</label>
                {selectedRemoveLabels.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-1.5">
                        {selectedRemoveLabels.map(l => (
                            <span key={l} className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded text-[9px] font-bold border border-rose-200 dark:border-rose-800">
                                {l}
                                <button type="button" onClick={() => toggleRemoveLabel(l)} className="text-rose-400 hover:text-red-500"><FiX size={10} /></button>
                            </span>
                        ))}
                    </div>
                )}
                <div className="relative" ref={removeDropdownRef}>
                    <div onClick={() => !loadingLabels && setIsRemoveOpen(!isRemoveOpen)} className="nodrag nopan w-full text-xs p-2 bg-gray-55 dark:bg-gray-900 border rounded cursor-pointer flex justify-between items-center text-gray-900 dark:text-gray-100 dark:border-gray-700">
                        <span className="truncate">{loadingLabels ? 'Carregando...' : 'Selecione...'}</span>
                        <FiChevronDown />
                    </div>
                    {isRemoveOpen && (
                        <div className="nodrag nopan absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-gray-900 border rounded shadow-xl max-h-60 overflow-hidden flex flex-col border-gray-200 dark:border-gray-700">
                            <div className="p-2 border-b flex items-center gap-1">
                                <FiSearch className="text-gray-400" />
                                <input
                                    type="text"
                                    className="nodrag w-full text-xs bg-transparent outline-none text-gray-900 dark:text-gray-100"
                                    placeholder="Buscar..."
                                    value={removeSearch}
                                    onChange={(e) => setRemoveSearch(e.target.value)}
                                />
                            </div>
                            <div className="nodrag nopan nowheel overflow-y-auto max-h-40 flex-1 premium-scrollbar">
                                {filteredRemoveLabels.map(l => (
                                    <div
                                        key={l.id}
                                        className="p-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer text-gray-900 dark:text-gray-100"
                                        onClick={() => { toggleRemoveLabel(l.title); setIsRemoveOpen(false); setRemoveSearch(''); }}
                                    >
                                        {l.title}
                                    </div>
                                ))}
                                {filteredRemoveLabels.length === 0 && (
                                    <div className="p-3 text-center text-xs text-gray-400 italic">Nenhuma etiqueta encontrada</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChatwootLabelAction;
