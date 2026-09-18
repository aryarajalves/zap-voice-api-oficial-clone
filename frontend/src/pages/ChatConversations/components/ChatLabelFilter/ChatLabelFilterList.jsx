import React from 'react';
import { FiSearch, FiX, FiTag, FiCheck, FiSlash } from 'react-icons/fi';

export default function ChatLabelFilterList({
    searchInputRef,
    searchTerm,
    onSearchChange,
    onClearSearch,
    onKeyDown,
    hasFilterActive,
    filteredLabels = [],
    activeLabels = [],
    activeItems = [],
    resolveColor,
    onClearAll,
    onToggleLabel,
    onToggleItemMode,
    onClose
}) {
    return (
        <>
            {/* Campo de Pesquisa */}
            <div className="p-2 border-b border-gray-100 dark:border-white/5">
                <div className="relative">
                    <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                    <input
                        ref={searchInputRef}
                        id="chat-label-search-input"
                        type="text"
                        placeholder="Pesquisar etiqueta..."
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        onKeyDown={onKeyDown}
                        className="w-full pl-7 pr-7 py-1.5 bg-white dark:bg-gray-900/70 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                    {searchTerm && (
                        <button
                            type="button"
                            onClick={onClearSearch}
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
                {/* Opção Limpar Todos */}
                <button
                    type="button"
                    onClick={onClearAll}
                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer ${
                        !hasFilterActive
                            ? 'bg-blue-50/80 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold'
                            : 'text-gray-600 dark:text-gray-400'
                    }`}
                >
                    <span className="flex items-center gap-2 min-w-0">
                        <FiTag size={12} className="text-gray-400 shrink-0" />
                        <span className="truncate">Todos os marcadores (sem filtro)</span>
                    </span>
                    {!hasFilterActive && <FiCheck size={12} className="text-blue-500 shrink-0" />}
                </button>

                {/* Etiquetas Filtradas */}
                {filteredLabels.map((label) => {
                    const activeItem = activeItems.find(i => i.name === label);
                    const isSelected = !!activeItem;
                    const isHasNot = activeItem?.mode === 'has_not';
                    const labelColor = resolveColor(label);

                    return (
                        <div
                            key={label}
                            role="button"
                            tabIndex={0}
                            onClick={() => onToggleLabel(label)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onToggleLabel(label); }}
                            className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer select-none ${
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

                            <div className="flex items-center gap-1.5 shrink-0">
                                {/* Botão de Alternância de Modo da Etiqueta Selecionada */}
                                {isSelected && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (typeof onToggleItemMode === 'function') {
                                                onToggleItemMode(label);
                                            }
                                        }}
                                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer flex items-center gap-0.5 ${
                                            isHasNot
                                                ? 'bg-rose-500 text-white hover:bg-rose-600'
                                                : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                        }`}
                                        title={`Esta etiqueta está configurada como "${isHasNot ? 'NÃO POSSUI' : 'POSSUI'}". Clique para alternar.`}
                                    >
                                        {isHasNot ? <FiSlash size={9} /> : <FiCheck size={9} />}
                                        {isHasNot ? 'Não possui' : 'Possui'}
                                    </button>
                                )}

                                {/* Indicador de Checkbox Visual */}
                                <span
                                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                        isSelected
                                            ? 'bg-blue-600 border-blue-600 text-white'
                                            : 'border-gray-300 dark:border-white/20 bg-transparent'
                                    }`}
                                >
                                    {isSelected && <FiCheck size={11} className="stroke-[3]" />}
                                </span>
                            </div>
                        </div>
                    );
                })}

                {/* Estado Vazio de Busca */}
                {filteredLabels.length === 0 && (
                    <div className="px-3 py-4 text-center text-xs text-gray-400 dark:text-gray-500">
                        Nenhum marcador encontrado{searchTerm ? ` para "${searchTerm}"` : ''}
                    </div>
                )}
            </div>

            {/* Rodapé Informativo / Ação de Fechar */}
            <div className="px-3 py-1.5 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-black/20 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                <span>{activeLabels.length} selecionada(s)</span>
                <button
                    type="button"
                    onClick={onClose}
                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium cursor-pointer"
                >
                    Concluir
                </button>
            </div>
        </>
    );
}
