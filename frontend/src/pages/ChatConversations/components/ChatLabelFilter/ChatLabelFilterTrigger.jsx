import React from 'react';
import { FiTag, FiChevronDown, FiX } from 'react-icons/fi';

export default function ChatLabelFilterTrigger({
    isOpen,
    onToggleOpen,
    hasFilterActive,
    activeItems = [],
    activeOp,
    resolveColor,
    onClearAll
}) {
    const hasItems = activeItems.filter(i => i.mode === 'has');
    const hasNotItems = activeItems.filter(i => i.mode === 'has_not');

    return (
        <div
            id="chat-label-filter-trigger"
            onClick={onToggleOpen}
            className={`bg-white dark:bg-[#1e293b] text-gray-700 dark:text-gray-300 text-xs w-full py-1.5 px-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between shadow-sm select-none ${
                isOpen
                    ? 'border-blue-500 ring-1 ring-blue-500/20 shadow-blue-500/10'
                    : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'
            }`}
        >
            <div className="flex items-center gap-1.5 truncate flex-1 mr-1">
                {hasFilterActive ? (
                    <div className="flex items-center gap-1.5 truncate">
                        {/* Indicadores de Modo (TEM / NÃO) */}
                        {hasItems.length > 0 && hasNotItems.length === 0 && (
                            <span
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0"
                                title="Filtrando conversas que POSSUEM as etiquetas"
                            >
                                TEM
                            </span>
                        )}
                        {hasNotItems.length > 0 && hasItems.length === 0 && (
                            <span
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 shrink-0"
                                title="Filtrando conversas que NÃO POSSUEM as etiquetas"
                            >
                                NÃO
                            </span>
                        )}
                        {hasItems.length > 0 && hasNotItems.length > 0 && (
                            <div className="flex items-center gap-0.5 shrink-0 text-[10px] font-bold">
                                <span className="px-1 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                    +{hasItems.length}
                                </span>
                                <span className="px-1 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                                    -{hasNotItems.length}
                                </span>
                            </div>
                        )}

                        {/* Resumo de etiquetas */}
                        {activeItems.length === 1 ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
                                <span
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{ backgroundColor: resolveColor(activeItems[0].name) }}
                                />
                                <span className="truncate">{activeItems[0].name}</span>
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 truncate">
                                <span>{activeItems.length} etiquetas</span>
                                <span className="text-[10px] text-gray-400 font-normal">
                                    ({activeOp === 'and' ? 'E' : 'OU'})
                                </span>
                            </span>
                        )}
                    </div>
                ) : (
                    <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 truncate">
                        <FiTag size={12} className="text-gray-400 shrink-0" />
                        <span className="truncate">Todos os marcadores</span>
                    </span>
                )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
                {hasFilterActive && (
                    <button
                        type="button"
                        onClick={onClearAll}
                        className="p-0.5 rounded hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition cursor-pointer"
                        title="Limpar filtros de marcadores"
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
    );
}
