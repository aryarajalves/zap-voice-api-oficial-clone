import React from 'react';
import { createPortal } from 'react-dom';
import { FiAlertTriangle, FiTrash2 } from 'react-icons/fi';

export default function EmailDeleteConfirmModal({
  isOpen,
  onClose,
  template,
  onConfirm,
  loading
}) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99990] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full border border-gray-100 dark:border-white/10 shadow-2xl space-y-4 text-center">
        <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto text-xl border border-red-500/20">
          <FiAlertTriangle />
        </div>

        <div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-white">
            Excluir Template de E-mail
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Tem certeza que deseja remover o template <strong className="text-gray-700 dark:text-gray-200">"{template?.name}"</strong>? Esta ação não poderá ser desfeita.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-semibold transition-all"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-red-500/20 flex items-center gap-2"
          >
            {loading ? (
              <span>Excluindo...</span>
            ) : (
              <>
                <FiTrash2 /> Confirmar Exclusão
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
