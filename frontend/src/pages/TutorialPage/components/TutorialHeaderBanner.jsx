import React from 'react';
import { FiCompass } from 'react-icons/fi';

const TutorialHeaderBanner = () => {
  return (
    <div className="bg-gradient-to-r from-gray-900 via-slate-800 to-indigo-950 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden border border-white/5">
      <div className="absolute right-0 bottom-0 translate-x-10 translate-y-10 opacity-10">
        <FiCompass size={220} />
      </div>
      <div className="max-w-2xl relative z-10">
        <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 inline-block">
          Central de Ajuda Técnica
        </span>
        <h2 className="text-3xl font-black tracking-tight mb-2 uppercase">Central de Tutoriais da API</h2>
        <p className="text-gray-300 text-sm leading-relaxed font-medium">
          Selecione um dos guias interativos abaixo para configurar a sua API Oficial do WhatsApp e Instagram passo a passo de forma simples.
        </p>
      </div>
    </div>
  );
};

export default TutorialHeaderBanner;
