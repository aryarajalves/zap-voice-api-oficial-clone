import React, { useState, useRef, useEffect } from 'react';
import { FiTag, FiSearch, FiChevronDown, FiX, FiCheck } from 'react-icons/fi';

export default function ChatLabelFilterDropdown({
    selectedLabelFilter,
    setSelectedLabelFilter,
    availableLabels = [],
    availableLabelsDetails = [],
    getLabelColor
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef(null);
    const searchInputRef = useRef(null);

    // Resolve cor da etiqueta
    const resolveColor = (label) => {
        if (typeof getLabelColor === 'function') {
            return getLabelColor(label);
        }
        if (Array.isArray(availableLabelsDetails)) {
            const found = availableLabelsDetails.find(
                (l) => l.name?.toLowerCase() === label?.toLowerCase()
            );
            if (found && found.color) return found.color;
        }
        return '#3b82f6';
    };

    // Fecha o dropdown ao clicar fora
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Foca no input de busca ao abrir o dropdown
    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                searchInputRef.current?.focus();
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // Normaliza e filtra as etiquetas disponíveis
    const uniqueLabels = Array.from(new Set((availableLabels || []).filter(Boolean)));
    const filteredLabels = uniqueLabels.filter((label) =>
        label.toLowerCase().includes(searchTerm.trim().toLowerCase())
    );

    const handleSelect = (label) => {
        setSelectedLabelFilter(label);
        setIsOpen(false);
        setSearchTerm('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            setIsOpen(false);
            setSearchTerm('');
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filteredLabels.length > 0) {
                handleSelect(filteredLabels[0]);
            } else if (!searchTerm.trim()) {
                handleSelect(null);
            }
        }
    };

    return (
        <div className="relative w-full" ref={containerRef}>
            {/* Gatilho / Botão do Seletor */}
            <div
                id="chat-label-filter-trigger"
                onClick={() => setIsOpen((prev) => !prev)}
                className={`bg-white dark:bg-[#1e293b] text-gray-700 dark:text-gray-300 text-xs w-full py-1.5 px-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between shadow-sm select-none ${
                    isOpen
                        ? 'border-blue-500 ring-1 ring-blue-500/20 shadow-blue-500/10'
                        : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'
                }`}
            >
                <div className="flex items-center gap-2 truncate flex-1 mr-1">
                    {selectedLabelFilter ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 truncate">
                            <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: resolveColor(selectedLabelFilter) }}
                            />
                            <span className="truncate">{selectedLabelFilter}</span>
                        </span>
                    ) : (
                        <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 truncate">
                            <FiTag size={12} className="text-gray-400 shrink-0" />
                            <span className="truncate">Todos os marcadores</span>
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    {selectedLabelFilter && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleSelect(null);
                            }}
                            className="p-0.5 rounded hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition cursor-pointer"
                            title="Limpar filtro de marcador"
                        >
                            <FiX size={12} />
                        </button>
                    )}
                    <FiChevronDown
                        size={13}
                        className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-500' : ''}`}
                    />
                </div>
            </div>

            {/* Painel Dropdown com Busca e Lista */}
            {isOpen && (
                <div
                    id="chat-label-filter-dropdown-menu"
                    className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden py-1 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
                >
                    {/* Campo de Pesquisa */}
                    <div className="p-2 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-black/20">
                        <div className="relative">
                            <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                            <input
                                ref={searchInputRef}
                                id="chat-label-search-input"
                                type="text"
                                placeholder="Pesquisar etiqueta..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="w-full pl-7 pr-7 py-1.5 bg-white dark:bg-gray-900/70 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                            />
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                                    title="Limpar pesquisa"
                                >
                                    <FiX size={12} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Lista com Rolagem */}
                    <div className="max-h-52 overflow-y-auto overflow-x-hidden py-1 custom-scrollbar">
                        {/* Opção Todos */}
                        <button
                            type="button"
                            onClick={() => handleSelect(null)}
                            className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer ${
                                !selectedLabelFilter
                                    ? 'bg-blue-50/80 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold'
                                    : 'text-gray-600 dark:text-gray-300'
                            }`}
                        >
                            <span className="flex items-center gap-2 min-w-0">
                                <FiTag size={12} className="text-gray-400 shrink-0" />
                                <span className="truncate">Todos os marcadores</span>
                            </span>
                            {!selectedLabelFilter && <FiCheck size={12} className="text-blue-500 shrink-0" />}
                        </button>

                        {/* Etiquetas Filtradas */}
                        {filteredLabels.map((label) => {
                            const isSelected = selectedLabelFilter === label;
                            const labelColor = resolveColor(label);

                            return (
                                <button
                                    key={label}
                                    type="button"
                                    onClick={() => handleSelect(label)}
                                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer ${
                                        isSelected
                                            ? 'bg-blue-50/80 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold'
                                            : 'text-gray-700 dark:text-gray-300'
                                    }`}
                                >
                                    <span className="flex items-center gap-2 truncate flex-1 mr-2 min-w-0">
                                        <span
                                            className="w-2 h-2 rounded-full shrink-0"
                                            style={{ backgroundColor: labelColor }}
                                        />
                                        <span className="truncate">{label}</span>
                                    </span>
                                    {isSelected && <FiCheck size={12} className="text-blue-500 shrink-0" />}
                                </button>
                            );
                        })}

                        {/* Estado Vazio de Busca */}
                        {filteredLabels.length === 0 && (
                            <div className="px-3 py-4 text-center text-xs text-gray-400 dark:text-gray-500">
                                Nenhum marcador encontrado{searchTerm ? ` para "${searchTerm}"` : ''}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
