import React from 'react';
import { createPortal } from 'react-dom';
import { FiRefreshCw } from 'react-icons/fi';

const SyncAllProgressPopup = ({ isSyncingAll }) => {
  if (!isSyncingAll) return null;

  return createPortal(
    <div className="fixed inset-0 z-[20000] flex items-center justify-center bg-[#0b1120]/80 backdrop-blur-md animate-in fade-in duration-500">
      <div className="bg-[#1e293b] border border-blue-500/30 rounded-[2.5rem] p-10 max-w-sm w-full text-center shadow-[0_0_100px_rgba(37,99,235,0.2)] animate-in zoom-in-95 duration-300">
        <div className="relative mb-8">
          <div className="w-24 h-24 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin mx-auto"></div>
          <FiRefreshCw className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500 animate-pulse" size={32} />
        </div>
        
        <h3 className="text-2xl font-black text-white mb-2 tracking-tight uppercase">Sincronizando...</h3>
        <p className="text-gray-400 text-sm font-medium mb-6">
          Estamos reprocessando todos os registros com as novas regras de automação.
        </p>
        
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between text-[10px] font-black text-blue-400 uppercase tracking-widest">
            <span>Status da Operação</span>
            <span className="animate-pulse">Em Progresso</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
            <div className="bg-blue-500 h-full w-2/3 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
          </div>
          <span className="text-[9px] text-gray-500 font-bold uppercase italic">
            Não feche ou recarregue a página (F5) para evitar falhas.
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SyncAllProgressPopup;
