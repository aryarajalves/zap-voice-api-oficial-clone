import React from 'react';
import { createPortal } from 'react-dom';
import { FiTrash2 } from 'react-icons/fi';

const ContactBulkDeleteModal = ({ isOpen, selectedCount, onClose, onConfirm }) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 w-screen h-screen">
            <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
                <h3 className="text-lg font-black text-white flex items-center gap-2 mb-3">
                    <FiTrash2 className="text-red-500 w-5 h-5" />
                    Remover Contatos Selecionados?
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed mb-6 bg-black/40 p-4 rounded-2xl border border-white/5">
                    Tem certeza que deseja remover <strong className="text-red-400">{selectedCount}</strong> contatos selecionados da lista de disparo? Esta ação irá retirá-los do lote de envio atual.
                </p>
                <div className="flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all active:scale-95"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-red-900/40 active:scale-95 flex items-center gap-2"
                    >
                        <FiTrash2 size={14} />
                        Confirmar Remoção ({selectedCount})
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ContactBulkDeleteModal;