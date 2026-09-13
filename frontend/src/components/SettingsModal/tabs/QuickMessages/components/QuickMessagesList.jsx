import React from 'react';
import { FiZap, FiEdit2, FiTrash2, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { ITEMS_PER_PAGE } from '../hooks/useQuickMessagesTab';

const QuickMessagesList = ({
    loadingList,
    filteredMessages,
    paginatedMessages,
    page,
    totalPages,
    onEdit,
    onDelete,
    onPageChange
}) => {
    if (loadingList) {
        return (
            <div className="py-12 text-center text-xs text-gray-400">
                Carregando mensagens rápidas...
            </div>
        );
    }

    if (filteredMessages.length === 0) {
        return (
            <div className="py-12 text-center text-gray-400 border border-dashed border-gray-200 dark:border-white/10 rounded-2xl flex flex-col items-center gap-2">
                <FiZap size={32} className="text-gray-300 dark:text-gray-600" />
                <p className="text-xs font-medium">Nenhuma mensagem rápida encontrada.</p>
                <p className="text-[11px] text-gray-500">Clique no botão "Nova Mensagem" acima para cadastrar a primeira.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto custom-scrollbar pr-1">
                {paginatedMessages.map((item) => (
                    <div
                        key={item.id}
                        className="p-4 bg-gray-50/50 dark:bg-white/[0.02] border border-gray-200/80 dark:border-white/5 rounded-2xl hover:border-emerald-500/30 transition-all flex flex-col justify-between gap-3 group"
                    >
                        <div>
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                                <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                                    /{item.shortcut}
                                </span>
                                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                    <button
                                        type="button"
                                        onClick={() => onEdit(item)}
                                        className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors cursor-pointer"
                                        title="Editar mensagem"
                                    >
                                        <FiEdit2 size={14} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onDelete(item)}
                                        className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                                        title="Excluir mensagem"
                                    >
                                        <FiTrash2 size={14} />
                                    </button>
                                </div>
                            </div>
                            <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 mb-1">{item.title}</h4>
                            <p className="text-[11px] text-gray-600 dark:text-gray-400 line-clamp-3 whitespace-pre-wrap leading-relaxed">
                                {item.content}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Paginação da Aba */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-white/5 text-xs text-gray-500 dark:text-gray-400">
                    <span>
                        Exibindo <strong>{(page - 1) * ITEMS_PER_PAGE + 1}</strong> a <strong>{Math.min(page * ITEMS_PER_PAGE, filteredMessages.length)}</strong> de <strong>{filteredMessages.length}</strong> mensagens
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => onPageChange(Math.max(1, page - 1))}
                            disabled={page === 1}
                            className="p-1.5 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer text-gray-700 dark:text-gray-300"
                            title="Página Anterior"
                        >
                            <FiChevronLeft size={14} />
                        </button>
                        <span className="font-mono text-xs font-semibold px-1">
                            {page} / {totalPages}
                        </span>
                        <button
                            type="button"
                            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                            disabled={page === totalPages}
                            className="p-1.5 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer text-gray-700 dark:text-gray-300"
                            title="Próxima Página"
                        >
                            <FiChevronRight size={14} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuickMessagesList;
