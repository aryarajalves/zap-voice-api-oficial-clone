import React from 'react';
import { FiTag } from 'react-icons/fi';

export default function BulkTagModalHeader({ selectedCount = 0 }) {
  return (
    <div className="border-b border-slate-800 pb-3 flex items-center gap-2.5">
      <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
        <FiTag size={18} />
      </div>
      <div>
        <h3 className="font-bold text-white text-base">Etiquetar Contatos</h3>
        <p className="text-xs text-slate-400">
          Aplicando em <strong className="text-blue-400">{selectedCount}</strong> contato(s) selecionado(s)
        </p>
      </div>
    </div>
  );
}
