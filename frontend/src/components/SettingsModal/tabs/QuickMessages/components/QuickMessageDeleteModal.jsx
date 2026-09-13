import React from 'react';
import { createPortal } from 'react-dom';
import { FiTrash2 } from 'react-icons/fi';

const QuickMessageDeleteModal = ({
    itemToDelete,
    isDeleting,
    onConfirm,
    onClose
}) => {
    if (!itemToDelete) return null;

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#111827] text-gray-800 dark:text-gray-100 w-full max-w-sm rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 p-5 space-y-4 animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                        <FiTrash2 size={20} />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">Excluir Mensagem Rápida</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Deseja realmente remover o atalho <span className="font-mono font-bold text-rose-400">/{itemToDelete.shortcut}</span>?
                        </p>
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-white/10">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isDeleting}
                        className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-white rounded-xl transition cursor-pointer"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
                    >
                        {isDeleting ? 'Excluindo...' : 'Sim, Excluir'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default QuickMessageDeleteModal;
