import React from 'react';
import { FiMessageSquare, FiUsers } from 'react-icons/fi';

export default function BulkTagCategorySelector({
  targetCategory,
  onSwitchCategory
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-slate-300">
        Onde deseja aplicar a etiqueta?
      </label>
      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950/60 rounded-xl border border-slate-800">
        <button
          type="button"
          id="btn-category-chat"
          onClick={() => onSwitchCategory('chat')}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition cursor-pointer ${
            targetCategory === 'chat'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25 border border-blue-400/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <FiMessageSquare size={13} className="shrink-0" />
          <span className="truncate">Etiqueta do Chat</span>
        </button>

        <button
          type="button"
          id="btn-category-contacts"
          onClick={() => onSwitchCategory('contacts')}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition cursor-pointer ${
            targetCategory === 'contacts'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 border border-indigo-400/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <FiUsers size={13} className="shrink-0" />
          <span className="truncate">Aba de Contatos</span>
        </button>
      </div>
      <p className="text-[11px] text-slate-400 italic">
        {targetCategory === 'chat'
          ? 'As etiquetas selecionadas serão vinculadas às conversas no Chat.'
          : 'As etiquetas selecionadas serão vinculadas ao perfil dos contatos na Aba de Contatos.'}
      </p>
    </div>
  );
}
