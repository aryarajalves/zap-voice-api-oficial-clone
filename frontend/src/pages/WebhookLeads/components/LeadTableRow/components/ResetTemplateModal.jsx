import React from 'react';
import { createPortal } from 'react-dom';
import { FiTrash2 } from 'react-icons/fi';

export default function ResetTemplateModal({
  isOpen,
  isResetting,
  lead,
  onClose,
  onConfirm
}) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 w-screen h-screen">
      <div
        className="w-full max-w-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200"
        style={{ userSelect: 'none', cursor: 'default' }}
      >
        <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2 mb-3">
          <FiTrash2 className="text-rose-500 w-5 h-5" />
          Remover Trava de 24h de Template?
        </h3>
        <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mb-6 bg-gray-50 dark:bg-gray-900/50 p-3.5 rounded-2xl border border-gray-150 dark:border-gray-700">
          Isso irá remover o registro do último template (<strong>{lead.last_template_name}</strong>) para o contato{' '}
          <strong>{lead.name || lead.phone}</strong>. O contato ficará liberado para receber este mesmo template novamente de imediato.
        </p>
        <div className="flex justify-end gap-2.5">
          <button
            type="button"
            disabled={isResetting}
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isResetting}
            onClick={onConfirm}
            className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
          >
            {isResetting ? 'Removendo...' : 'Confirmar Remoção'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
