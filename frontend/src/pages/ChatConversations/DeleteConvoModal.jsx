import React from 'react';

export default function DeleteConvoModal({
    isOpen,
    isBulk,
    selectedCount,
    onClose,
    onConfirm
}) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 text-gray-800 dark:text-gray-100">
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">
                    {isBulk ? `Deletar ${selectedCount} conversa(s)?` : 'Deletar conversa?'}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                    Esta ação é irreversível. Todas as mensagens da(s) conversa(s) serão apagadas permanentemente.
                </p>
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-white/5 transition"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition"
                    >
                        Deletar
                    </button>
                </div>
            </div>
        </div>
    );
}
