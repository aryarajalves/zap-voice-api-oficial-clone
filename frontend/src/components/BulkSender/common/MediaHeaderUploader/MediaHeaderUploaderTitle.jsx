import React from 'react';

export default function MediaHeaderUploaderTitle({ mediaIcon, mediaTypeLabel }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-2xl">{mediaIcon}</span>
      <div>
        <h4 className="text-xs font-black text-amber-400 uppercase tracking-widest">
          {mediaTypeLabel} do Cabeçalho — Obrigatório
        </h4>
        <p className="text-[10px] text-slate-500 font-medium mt-0.5">
          Selecione um arquivo já enviado ou faça um novo upload
        </p>
      </div>
    </div>
  );
}
