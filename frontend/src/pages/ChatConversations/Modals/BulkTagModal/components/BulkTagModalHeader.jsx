import React from 'react';
import { FiTag } from 'react-icons/fi';

export default function BulkTagModalHeader({ selectedCount = 0 }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg shrink-0">
        <FiTag size={18} />
      </div>
      <div className="min-w-0">
        <h3 className="font-bold text-white text-base leading-tight">Etiquetar Contatos</h3>
        <p className="text-xs text-slate-400 truncate">
          Aplicando em <strong className="text-blue-400">{selectedCount}</strong> contato(s) selecionado(s)
        </p>
      </div>
    </div>
  );
}
