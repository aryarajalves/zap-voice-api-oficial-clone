import React from 'react';
import { FiRefreshCw } from 'react-icons/fi';

const DispatchModalFooter = ({ onRefresh, onClose }) => {
  return (
    <div className="p-4 border-t border-white/5 bg-[#0f172a]/50 flex justify-between items-center px-8 shrink-0">
      <div className="text-xs text-gray-500 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
        Monitoramento em tempo real ativo
      </div>
      <div className="flex items-center gap-6">
        <button
          type="button"
          onClick={onRefresh}
          className="flex items-center gap-2 text-[10px] font-black text-white/40 hover:text-white tracking-widest uppercase transition-colors"
        >
          <FiRefreshCw size={12} /> Atualizar Fila
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-8 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black tracking-widest uppercase border border-white/10 transition-all active:scale-95"
        >
          Fechar Painel
        </button>
      </div>
    </div>
  );
};

export default DispatchModalFooter;
