import React from 'react';
import { FiEdit2, FiTrash2, FiRepeat } from 'react-icons/fi';

const LabelCard = ({ label, onEdit, onDelete, onTransfer }) => {
    return (
        <div className="flex items-center justify-between p-3.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-white/5 rounded-xl hover:shadow-md transition-all group">
            <div className="flex items-center gap-2.5 min-w-0">
                <span
                    className="w-3.5 h-3.5 rounded-full shrink-0"
                    style={{ backgroundColor: label.color }}
                />
                <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-200 break-words pr-2 leading-tight">
                        {label.name} <span className="text-xs font-normal text-gray-400 dark:text-gray-500">({label.usage_count === 1 ? '1 conversa' : `${label.usage_count || 0} conversas`})</span>
                    </span>
                    {label.is_legacy && (
                        <span className="text-[9px] font-bold text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded-md mt-0.5 w-max">
                            Nas Conversas
                        </span>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-0.5">
                <button
                    type="button"
                    onClick={() => onTransfer && onTransfer(label)}
                    className="p-1.5 text-gray-400 hover:text-emerald-500 hover:bg-emerald-500/10 dark:hover:bg-emerald-500/20 rounded-lg transition-colors"
                    title="Transferir contatos para outra etiqueta"
                >
                    <FiRepeat size={14} />
                </button>
                <button
                    type="button"
                    onClick={() => onEdit(label)}
                    className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-500/10 dark:hover:bg-blue-500/20 rounded-lg transition-colors"
                    title="Editar Marcador"
                >
                    <FiEdit2 size={14} />
                </button>
                <button
                    type="button"
                    onClick={() => onDelete(label)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 dark:hover:bg-red-500/20 rounded-lg transition-colors"
                    title="Excluir Marcador"
                >
                    <FiTrash2 size={14} />
                </button>
            </div>
        </div>
    );
};

export default LabelCard;
