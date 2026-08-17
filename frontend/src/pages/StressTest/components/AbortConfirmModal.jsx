import React from 'react';
import { createPortal } from 'react-dom';
import { FiAlertCircle } from 'react-icons/fi';

export default function AbortConfirmModal({ isOpen, onClose, onConfirm }) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 w-screen h-screen">
      <div className="w-full max-w-sm bg-white dark:bg-[#131722] border border-gray-200 dark:border-white/5 rounded-3xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 text-center">
        <FiAlertCircle className="w-14 h-14 text-rose-500 mx-auto mb-4 animate-pulse" />
        <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2">
          Abortar Teste de Escala?
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-6">
          Você tem certeza que deseja cancelar imediatamente este teste de estresse em execução? Esta ação não pode ser desfeita.
        </p>
        
        <div className="flex items-center gap-3 justify-center">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold transition-all active:scale-95 border-0"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-md hover:shadow-rose-500/20 border-0"
          >
            Sim, Abortar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
