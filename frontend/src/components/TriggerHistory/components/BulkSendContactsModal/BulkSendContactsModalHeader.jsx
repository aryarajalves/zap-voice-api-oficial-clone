import React from 'react';

export default function BulkSendContactsModalHeader({ selectedCount, onClose }) {
  return (
    <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
      <div>
        <h3 className="font-black text-white text-lg tracking-wide uppercase">Disparo em Massa</h3>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
          Disparando para {selectedCount} contatos selecionados
        </p>
      </div>
      <button
        onClick={onClose}
        className="text-slate-400 hover:text-white transition p-2 hover:bg-white/5 rounded-2xl"
        title="Fechar modal"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
