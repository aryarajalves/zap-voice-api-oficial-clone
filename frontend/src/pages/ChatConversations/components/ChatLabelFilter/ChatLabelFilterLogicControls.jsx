import React from 'react';
import { FiCheck, FiSlash } from 'react-icons/fi';

export default function ChatLabelFilterLogicControls({
    activeMode,
    onSetMode,
    activeOp,
    onSetOp
}) {
    return (
        <div className="p-2 border-b border-gray-100 dark:border-white/5 bg-gray-50/70 dark:bg-black/25 flex flex-col gap-1.5">
            {/* Condição: Possui / Não possui */}
            <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                <span className="font-medium">Condição:</span>
                <div className="inline-flex rounded-md p-0.5 bg-gray-200/80 dark:bg-black/40 border border-gray-200 dark:border-white/10">
                    <button
                        type="button"
                        id="chat-label-mode-has"
                        onClick={() => onSetMode('has')}
                        className={`px-2 py-0.5 text-[11px] rounded font-medium transition cursor-pointer flex items-center gap-1 ${
                            activeMode === 'has'
                                ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-sm'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                    >
                        <FiCheck size={11} className={activeMode === 'has' ? 'opacity-100' : 'opacity-40'} />
                        Possui
                    </button>
                    <button
                        type="button"
                        id="chat-label-mode-has-not"
                        onClick={() => onSetMode('has_not')}
                        className={`px-2 py-0.5 text-[11px] rounded font-medium transition cursor-pointer flex items-center gap-1 ${
                            activeMode === 'has_not'
                                ? 'bg-rose-500 text-white shadow-sm'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                    >
                        <FiSlash size={11} className={activeMode === 'has_not' ? 'opacity-100' : 'opacity-40'} />
                        Não possui
                    </button>
                </div>
            </div>

            {/* Operador Lógico (OU / E) */}
            <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                <span className="font-medium">Operador:</span>
                <div className="inline-flex rounded-md p-0.5 bg-gray-200/80 dark:bg-black/40 border border-gray-200 dark:border-white/10">
                    <button
                        type="button"
                        id="chat-label-op-or"
                        onClick={() => onSetOp('or')}
                        title="Exibe conversas que atendem a pelo menos uma das etiquetas selecionadas"
                        className={`px-2.5 py-0.5 text-[11px] rounded font-semibold transition cursor-pointer ${
                            activeOp === 'or'
                                ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-sm'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                    >
                        OU
                    </button>
                    <button
                        type="button"
                        id="chat-label-op-and"
                        onClick={() => onSetOp('and')}
                        title="Exibe conversas que atendem a todas as etiquetas selecionadas simultaneamente"
                        className={`px-2.5 py-0.5 text-[11px] rounded font-semibold transition cursor-pointer ${
                            activeOp === 'and'
                                ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-sm'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                    >
                        E
                    </button>
                </div>
            </div>
        </div>
    );
}
