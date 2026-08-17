import React from 'react';
import { FiX, FiTrash2, FiRefreshCw } from 'react-icons/fi';
import { BsExclamationCircleFill } from 'react-icons/bs';

export default function ClearChatConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    isClearing,
    contactName
}) {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
        >
            <div
                className="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0f172a]/60">
                    <div className="flex items-center gap-2 font-bold text-red-600 dark:text-red-400 text-sm">
                        <BsExclamationCircleFill size={18} />
                        <span>Limpar Conversa</span>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 transition"
                    >
                        <FiX size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-2">
                    <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed font-sans">
                        Tem certeza de que deseja limpar todas as mensagens da conversa com <strong className="text-gray-900 dark:text-white">{contactName || 'este contato'}</strong>?
                    </p>
                    <p className="text-[11px] text-gray-400 font-medium">
                        Esta ação é irreversível. O histórico de mensagens será apagado permanentemente, mantendo os dados de cadastro do contato, etiquetas e anotações privadas.
                    </p>
                </div>

                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0f172a]/60">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl border border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-300 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-white/5 transition"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        disabled={isClearing}
                        onClick={onConfirm}
                        className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold transition-all flex items-center gap-2 shadow-md hover:shadow-red-500/20 cursor-pointer disabled:cursor-not-allowed"
                    >
                        {isClearing ? <FiRefreshCw className="animate-spin" size={14} /> : <FiTrash2 size={14} />}
                        <span>Sim, Limpar</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
