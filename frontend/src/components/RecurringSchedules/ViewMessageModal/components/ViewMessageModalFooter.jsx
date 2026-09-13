import React from 'react';
import { FiEdit2, FiSave } from 'react-icons/fi';

export default function ViewMessageModalFooter({
  isEditing,
  setIsEditing,
  onClose,
  handleSaveClick,
  isUpdating
}) {
  return (
    <div className="p-8 bg-slate-800/40 border-t border-white/5 flex items-center justify-between">
      <div>
        {isEditing ? (
          <button 
            onClick={() => setIsEditing(false)}
            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-2xl font-black text-xs transition-all uppercase tracking-widest active:scale-95 cursor-pointer"
          >
            Voltar para visualização
          </button>
        ) : (
          <button 
            onClick={() => setIsEditing(true)}
            className="px-6 py-3 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-2xl border border-purple-500/20 font-black text-xs transition-all uppercase tracking-widest flex items-center gap-2 active:scale-95 shadow-lg shadow-purple-900/5 cursor-pointer"
          >
            <FiEdit2 size={12} />
            Alterar Mensagem
          </button>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button 
          onClick={onClose}
          className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-black text-xs transition-all uppercase tracking-widest active:scale-95 cursor-pointer"
        >
          Fechar
        </button>
        {isEditing && (
          <button 
            onClick={handleSaveClick}
            disabled={isUpdating}
            className="px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-black text-xs transition-all uppercase tracking-widest flex items-center gap-2 active:scale-95 shadow-xl shadow-purple-900/30 cursor-pointer disabled:opacity-50"
          >
            {isUpdating ? (
              <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              <FiSave size={12} />
            )}
            Salvar Alterações
          </button>
        )}
      </div>
    </div>
  );
}
