import React from 'react';
import { createPortal } from 'react-dom';
import { FiAlertTriangle } from 'react-icons/fi';

export default function DeleteDispatchModal({
  deleteTarget,
  setDeleteTarget,
  deleting,
  handleDeleteDispatch
}) {
  if (!deleteTarget) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
        <div className="flex items-center gap-3 text-red-400">
          <div className="p-3 bg-red-500/10 rounded-xl">
            <FiAlertTriangle size={24} />
          </div>
          <div>
            <h3 className="font-bold text-lg text-white">Excluir Histórico de Disparo</h3>
            <p className="text-xs text-gray-400">Esta ação não poderá ser desfeita.</p>
          </div>
        </div>

        <p className="text-sm text-gray-300">
          Tem certeza que deseja apagar o registro do disparo <strong className="text-white">"{deleteTarget.title}"</strong> (Assunto: <em>{deleteTarget.subject}</em>)?
        </p>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={() => setDeleteTarget(null)}
            disabled={deleting}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-gray-300 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleDeleteDispatch}
            disabled={deleting}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {deleting ? 'Excluindo...' : 'Sim, Excluir'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
