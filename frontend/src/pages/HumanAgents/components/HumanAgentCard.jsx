import React from 'react';
import { FiClock, FiCheckCircle, FiMessageSquare, FiTrash2 } from 'react-icons/fi';

export default function HumanAgentCard({
    convo,
    isSelected,
    onToggleSelect,
    onFinishHandover,
    onNavigateToChat,
    onDeleteSingle,
    waitingTimeStr
}) {
    return (
        <div
            className={`bg-white dark:bg-[#1e293b] p-6 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-5 border ${
                isSelected
                    ? 'border-blue-500/80 dark:border-blue-500/60 bg-blue-50/20 dark:bg-blue-900/10 ring-2 ring-blue-500/20 shadow-md'
                    : 'border-gray-100 dark:border-white/5'
            }`}
        >
            <div className="space-y-3">
                <div className="flex justify-between items-start gap-2">
                    <div className="flex items-start gap-3 truncate min-w-0">
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => onToggleSelect(convo.id)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 cursor-pointer shrink-0 mt-1"
                            aria-label={`Selecionar ${convo.contact_name}`}
                        />
                        <div className="truncate min-w-0">
                            <h4 className="text-sm font-bold text-gray-800 dark:text-white truncate">
                                {convo.contact_name || 'Contato sem nome'}
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                {convo.phone}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-500/20 text-yellow-700 dark:text-yellow-400 text-[10px] font-bold px-2 py-1 rounded-lg">
                            <FiClock size={12} />
                            <span>{waitingTimeStr}</span>
                        </div>
                        <button
                            onClick={() => onDeleteSingle(convo)}
                            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Deletar conversa"
                        >
                            <FiTrash2 size={14} />
                        </button>
                    </div>
                </div>

                {convo.last_message_content && (
                    <div className="p-3 bg-gray-50 dark:bg-[#0f172a] rounded-xl text-xs text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-white/5">
                        <p className="line-clamp-2 italic">"{convo.last_message_content}"</p>
                    </div>
                )}
            </div>

            <div className="flex gap-3">
                <button
                    onClick={() => onFinishHandover(convo.id, convo.contact_name)}
                    className="flex-1 py-3 px-4 bg-green-500 hover:bg-green-600 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-green-500/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                    <FiCheckCircle size={14} />
                    <span>Finalizar</span>
                </button>
                <button
                    onClick={() => onNavigateToChat(convo)}
                    className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                    <FiMessageSquare size={14} />
                    <span>Abrir Conversa</span>
                </button>
            </div>
        </div>
    );
}
