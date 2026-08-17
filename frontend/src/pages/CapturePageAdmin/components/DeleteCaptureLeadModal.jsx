import React from 'react';
import { FiTrash2 } from 'react-icons/fi';

export default function DeleteCaptureLeadModal({
  leadToDelete,
  onClose,
  onConfirm
}) {
  if (!leadToDelete) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0d1520] border border-gray-800 rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl">
        <div className="w-12 h-12 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 text-xl">
          <FiTrash2 />
        </div>
        <h3 className="text-base font-bold text-white mb-2">Excluir Lead</h3>
        <p className="text-xs text-gray-400 mb-6">
          Deseja remover o e-mail <span className="text-white font-mono">{leadToDelete.email}</span>?
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold text-xs rounded-xl transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="w-full py-2.5 bg-red-500 hover:bg-red-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-500/20 transition-all cursor-pointer"
          >
            Sim, Excluir
          </button>
        </div>
      </div>
    </div>
  );
}
