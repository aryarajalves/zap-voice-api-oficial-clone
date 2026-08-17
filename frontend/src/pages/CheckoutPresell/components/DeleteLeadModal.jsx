import React from 'react';
import { createPortal } from 'react-dom';
import { FiTrash2, FiRefreshCw } from 'react-icons/fi';

export default function DeleteLeadModal({
  isOpen,
  leadName,
  deleting,
  onClose,
  onConfirm
}) {
  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-[#0f172a] border border-gray-800 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl text-white animate-in zoom-in-95 duration-150">
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-red-500 flex items-center gap-2">
            <FiTrash2 /> Confirmar Deleção
          </h3>
          <p className="text-sm text-gray-300 leading-relaxed">
            Tem certeza que deseja remover o lead <strong className="text-white">{leadName}</strong>? Essa ação não poderá ser desfeita.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-800">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-semibold text-sm transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-red-600/30 transition-all flex items-center gap-2 cursor-pointer"
          >
            {deleting ? <FiRefreshCw className="animate-spin" /> : <FiTrash2 />}
            {deleting ? 'Removendo...' : 'Excluir Lead'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
