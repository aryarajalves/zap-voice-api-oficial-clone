import React, { useState, useRef, useEffect } from 'react';
import { FiSearch, FiChevronDown, FiCheck, FiPlus, FiX } from 'react-icons/fi';

/**
 * Seletor pesquisável de etiquetas/marcadores com dropdown customizado.
 */
export default function SearchableLabelSelect({
    labels = [],
    selectedLabel = '',
    onSelect,
    onCreateNew,
    placeholder = 'Selecione ou busque uma etiqueta...'
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef(null);
    const searchInputRef = useRef(null);

    // Fecha o dropdown ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
            // Foco automático no input de pesquisa ao abrir
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 50);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    // Filtragem das etiquetas conforme o texto digitado
    const filteredLabels = labels.filter((lbl) => {
        if (!searchTerm.trim()) return true;
        return lbl.name.toLowerCase().includes(searchTerm.toLowerCase().trim());
    });

    const activeObj = labels.find((l) => l.name === selectedLabel);

    return (
        <div className="relative w-full" ref={containerRef}>
            {/* Botão Acionador */}
            <button
                type="button"
                id="btn-label-search-trigger"
                onClick={() => setIsOpen((prev) => !prev)}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-white rounded-xl text-sm font-semibold flex items-center justify-between transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-blue-500/50 cursor-pointer shadow-sm text-left"
            >
                <div className="flex items-center gap-2.5 truncate">
                    {activeObj ? (
                        <>
                            <span
                                className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                                style={{ backgroundColor: activeObj.color || '#3B82F6' }}
                            />
                            <span className="truncate">{activeObj.name}</span>
                            <span className="text-[11px] text-gray-400 font-normal shrink-0">
                                ({activeObj.usage_count || 0} {activeObj.usage_count === 1 ? 'conversa' : 'conversas'})
                            </span>
                        </>
                    ) : (
                        <span className="text-gray-400 font-normal truncate">{placeholder}</span>
                    )}
                </div>
                <FiChevronDown
                    className={`text-gray-400 text-base shrink-0 transition-transform duration-200 ml-2 ${
                        isOpen ? 'rotate-180 text-blue-500' : ''
                    }`}
                />
            </button>

            {/* Dropdown Pesquisável */}
            {isOpen && (
                <div
                    id="searchable-label-dropdown"
                    className="absolute left-0 right-0 top-full mt-1.5 z-[1000] bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/15 rounded-xl shadow-2xl overflow-hidden backdrop-blur-md animate-fade-in flex flex-col"
                >
                    {/* Campo de Pesquisa no Topo */}
                    <div className="p-2.5 border-b border-gray-100 dark:border-white/10 bg-gray-50/80 dark:bg-slate-950/60 flex items-center gap-2">
                        <FiSearch className="text-gray-400 text-sm ml-1 shrink-0" />
                        <input
                            ref={searchInputRef}
                            id="input-search-label-filter"
                            type="text"
                            placeholder="Buscar etiqueta..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-transparent text-xs text-gray-800 dark:text-white border-none focus:outline-none placeholder-gray-400 font-medium"
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => setSearchTerm('')}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5 rounded cursor-pointer"
                                title="Limpar busca"
                            >
                                <FiX size={13} />
                            </button>
                        )}
                    </div>

                    {/* Lista com Rolagem */}
                    <div className="max-h-52 overflow-y-auto divide-y divide-gray-100 dark:divide-white/5 custom-scrollbar">
                        {filteredLabels.length === 0 ? (
                            <div className="p-4 text-center text-xs text-gray-400 italic">
                                Nenhuma etiqueta encontrada para "{searchTerm}"
                            </div>
                        ) : (
                            filteredLabels.map((lbl) => {
                                const isSelected = lbl.name === selectedLabel;
                                return (
                                    <button
                                        key={lbl.name}
                                        type="button"
                                        onClick={() => {
                                            onSelect(lbl.name);
                                            setIsOpen(false);
                                            setSearchTerm('');
                                        }}
                                        className={`w-full px-3.5 py-2.5 text-left text-xs transition-colors flex items-center justify-between cursor-pointer ${
                                            isSelected
                                                ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold'
                                                : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100/70 dark:hover:bg-white/5 font-semibold'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5 truncate">
                                            <span
                                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                                style={{ backgroundColor: lbl.color || '#3B82F6' }}
                                            />
                                            <span className="truncate">{lbl.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0 ml-2">
                                            <span className="text-[10px] text-gray-400 font-normal">
                                                {lbl.usage_count || 0}{' '}
                                                {lbl.usage_count === 1 ? 'conversa' : 'conversas'}
                                            </span>
                                            {isSelected && (
                                                <FiCheck className="text-blue-500 text-xs shrink-0" />
                                            )}
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>

                    {/* Rodapé: Criar Nova Etiqueta */}
                    {onCreateNew && (
                        <div className="p-2 border-t border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-slate-950/40">
                            <button
                                type="button"
                                id="btn-create-new-label-option"
                                onClick={() => {
                                    setIsOpen(false);
                                    onCreateNew(searchTerm.trim());
                                }}
                                className="w-full px-3 py-2 rounded-lg text-left text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 flex items-center gap-2 transition-colors cursor-pointer"
                            >
                                <FiPlus className="text-sm shrink-0" />
                                <span className="truncate">
                                    {searchTerm.trim()
                                        ? `Criar nova etiqueta: "${searchTerm.trim()}"`
                                        : '+ Criar nova etiqueta de destino...'}
                                </span>
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
