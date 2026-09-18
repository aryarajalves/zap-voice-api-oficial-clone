import React from 'react';
import { FiX, FiCheck, FiSlash } from 'react-icons/fi';

export default function ChatLabelFilterChips({
    activeItems = [],
    resolveColor,
    onToggleLabel,
    onToggleItemMode
}) {
    if (!activeItems || activeItems.length === 0) return null;

    return (
        <div className="px-2 pt-1.5 pb-1 border-b border-gray-100 dark:border-white/5 flex flex-wrap gap-1 max-h-24 overflow-y-auto custom-scrollbar">
            {activeItems.map((item) => {
                const isHasNot = item.mode === 'has_not';
                return (
                    <span
                        key={item.name}
                        className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md border transition-all ${
                            isHasNot
                                ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30'
                                : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                        } font-medium`}
                    >
                        {/* Botão de Alternância de Modo na Etiqueta */}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (typeof onToggleItemMode === 'function') {
                                    onToggleItemMode(item.name);
                                }
                            }}
                            className={`px-1 py-0.2 rounded text-[9px] font-bold uppercase transition cursor-pointer flex items-center gap-0.5 ${
                                isHasNot
                                    ? 'bg-rose-500 text-white hover:bg-rose-600'
                                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                            }`}
                            aria-label={`Alternar modo da etiqueta ${item.name}`}
                            title={`Etiqueta configurada como "${isHasNot ? 'NÃO POSSUI' : 'POSSUI'}". Clique para alternar.`}
                        >
                            {isHasNot ? <FiSlash size={8} /> : <FiCheck size={8} />}
                            {isHasNot ? 'NÃO' : 'TEM'}
                        </button>

                        <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: resolveColor(item.name) }}
                        />
                        <span className="truncate max-w-[90px]">{item.name}</span>

                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleLabel(item.name);
                            }}
                            className="hover:text-red-500 ml-0.5 cursor-pointer text-gray-400 hover:text-red-500"
                            title={`Remover marcador ${item.name}`}
                        >
                            <FiX size={10} />
                        </button>
                    </span>
                );
            })}
        </div>
    );
}
