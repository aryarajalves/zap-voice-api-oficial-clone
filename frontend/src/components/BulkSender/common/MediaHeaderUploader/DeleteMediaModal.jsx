import React from 'react';
import { createPortal } from 'react-dom';

export default function DeleteMediaModal({
  mediaToDelete,
  onClose,
  onConfirm
}) {
  if (!mediaToDelete) return null;

  return createPortal(
    <div className="fixed inset-0 top-0 left-0 w-screen h-screen z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div 
        className="w-full max-w-md bg-slate-900 border border-red-500/20 rounded-3xl p-6 shadow-2xl relative space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto text-xl">
            ⚠️
          </div>
          <h3 className="text-md font-black text-white uppercase tracking-wider">
            Confirmar Exclusão de Mídia
          </h3>
          <p className="text-xs text-slate-400 font-medium leading-relaxed">
            Você tem certeza que deseja excluir permanentemente o arquivo <span className="text-red-400 font-bold font-mono">"{mediaToDelete.filename}"</span>?
          </p>
          <p className="text-[10px] text-slate-500">
            Esta ação não pode ser desfeita e removerá a mídia fisicamente do S3/MinIO.
          </p>
        </div>

        {/* Botões do Popup */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-slate-800 text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-700 transition-all border border-slate-700/50 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-red-500/10 cursor-pointer"
          >
            Excluir Permanentemente
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
