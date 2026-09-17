import React from 'react';
import ReactDOM from 'react-dom';
import { FiTrash2 } from 'react-icons/fi';

const DeleteLabelModal = ({ labelToDelete, onClose, onConfirm, deletingId }) => {
    if (!labelToDelete) return null;

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#1e293b] w-full max-w-md p-6 rounded-3xl shadow-2xl border border-gray-100 dark:border-white/5 animate-in zoom-in-95 duration-200 text-center">
                <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center text-red-500 mx-auto mb-4">
                    <FiTrash2 size={24} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Excluir Marcador</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    Tem certeza que deseja excluir o marcador <strong className="text-gray-700 dark:text-gray-200">"{labelToDelete.name}"</strong>?
                    Esta ação é definitiva e removerá a etiqueta de qualquer busca ou filtro.
                </p>
                <div className="flex gap-3 justify-center">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-sm rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        disabled={deletingId !== null}
                        onClick={onConfirm}
                        className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                    >
                        {deletingId !== null ? (
                            <>
                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Excluindo...
                            </>
                        ) : (
                            "Excluir"
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default DeleteLabelModal;
