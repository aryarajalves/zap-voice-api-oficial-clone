import React from 'react';
import { createPortal } from 'react-dom';
import { FiZap } from 'react-icons/fi';

const ResendProgressPopup = ({ progress, onClose }) => {
  if (!progress || progress.status === 'completed' || progress.status === 'failed') return null;

  const percentage = Math.round((progress.current / progress.total) * 100) || 0;

  return createPortal(
    <div className="fixed inset-0 z-[20000] flex items-center justify-center bg-[#0b1120]/90 backdrop-blur-xl animate-in fade-in duration-500">
      <div className="bg-[#1e293b] border border-blue-500/30 rounded-[2.5rem] p-10 max-w-sm w-full text-center shadow-[0_0_100px_rgba(37,99,235,0.3)] animate-in zoom-in-95 duration-300">
        <div className="relative mb-8 flex justify-center">
          <div className="w-24 h-24 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin absolute"></div>
          <div className="w-24 h-24 rounded-full flex items-center justify-center text-blue-500 bg-blue-500/10 border border-blue-500/20">
            <FiZap className="animate-pulse" size={32} fill="currentColor" />
          </div>
        </div>
        
        <h3 className="text-2xl font-black text-white mb-2 tracking-tight uppercase">Reenviando...</h3>
        <p className="text-gray-400 text-sm font-medium mb-6">
          Processando reenvio em massa de webhooks selecionados.
        </p>
        
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between text-[11px] font-black text-blue-400 uppercase tracking-widest">
            <span>Progresso</span>
            <span className="bg-blue-500 text-white px-2 py-0.5 rounded-md">{percentage}%</span>
          </div>
          
          <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden shadow-inner">
            <div 
              className="bg-blue-500 h-full transition-all duration-500 ease-out shadow-[0_0_15px_rgba(59,130,246,0.6)]"
              style={{ width: `${percentage}%` }}
            ></div>
          </div>

          <div className="flex justify-between items-center text-[10px] font-bold text-gray-500 uppercase tracking-tight">
            <span>{progress.current} de {progress.total} registros</span>
            <span className="animate-pulse text-blue-500">Em fila</span>
          </div>
        </div>

        <p className="mt-8 text-[9px] text-gray-500 font-bold uppercase italic tracking-widest opacity-60">
          Não feche o painel enquanto o processamento não terminar.
        </p>
      </div>
    </div>,
    document.body
  );
};

export default ResendProgressPopup;
