import React from 'react';
import { FiZap, FiCheckCircle, FiEye, FiTrendingUp, FiDollarSign } from 'react-icons/fi';

const DispatchStatsBar = ({ dispatchStats }) => {
  if (!dispatchStats) return null;

  return (
    <div className="px-8 py-3 grid grid-cols-2 md:grid-cols-5 gap-3 shrink-0 bg-[#0f172a]/30 border-b border-white/5">
      {/* Card 1: Total Dispatches */}
      <div className="bg-[#1e293b]/40 backdrop-blur-md border border-white/5 hover:border-indigo-500/30 rounded-xl py-2 px-3 flex items-center gap-2.5 transition-all duration-300 hover:-translate-y-0.5 group">
        <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-400 group-hover:bg-indigo-500/20 transition-all duration-300">
          <FiZap size={14} />
        </div>
        <div>
          <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Total de Disparos</p>
          <p className="text-sm font-black text-white mt-0.5">
            {Number(dispatchStats.total_dispatches || 0).toLocaleString('pt-BR')}
          </p>
        </div>
      </div>

      {/* Card 2: Delivered */}
      <div className="bg-[#1e293b]/40 backdrop-blur-md border border-white/5 hover:border-emerald-500/30 rounded-xl py-2 px-3 flex items-center gap-2.5 transition-all duration-300 hover:-translate-y-0.5 group">
        <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-400 group-hover:bg-emerald-500/20 transition-all duration-300">
          <FiCheckCircle size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Entregues</p>
          <div className="flex items-baseline gap-1.5">
            <p className="text-sm font-black text-white mt-0.5">
              {Number(dispatchStats.delivered || 0).toLocaleString('pt-BR')}
            </p>
            <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-1 py-0.2 rounded">
              {dispatchStats.delivered_pct}%
            </span>
          </div>
        </div>
      </div>

      {/* Card 3: Read */}
      <div className="bg-[#1e293b]/40 backdrop-blur-md border border-white/5 hover:border-sky-500/30 rounded-xl py-2 px-3 flex items-center gap-2.5 transition-all duration-300 hover:-translate-y-0.5 group">
        <div className="p-1.5 bg-sky-500/10 rounded-lg text-sky-400 group-hover:bg-sky-500/20 transition-all duration-300">
          <FiEye size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Abertura</p>
          <div className="flex items-baseline gap-1.5">
            <p className="text-sm font-black text-white mt-0.5">
              {Number(dispatchStats.read || 0).toLocaleString('pt-BR')}
            </p>
            <span className="text-[9px] font-black text-sky-400 bg-sky-500/10 px-1 py-0.2 rounded">
              {dispatchStats.read_pct}%
            </span>
          </div>
        </div>
      </div>

      {/* Card 4: Interactions */}
      <div className="bg-[#1e293b]/40 backdrop-blur-md border border-white/5 hover:border-amber-500/30 rounded-xl py-2 px-3 flex items-center gap-2.5 transition-all duration-300 hover:-translate-y-0.5 group">
        <div className="p-1.5 bg-amber-500/10 rounded-lg text-amber-400 group-hover:bg-amber-500/20 transition-all duration-300">
          <FiTrendingUp size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Interações</p>
          <div className="flex items-baseline gap-1.5">
            <p className="text-sm font-black text-white mt-0.5">
              {Number(dispatchStats.interactions || 0).toLocaleString('pt-BR')}
            </p>
            <span className="text-[9px] font-black text-amber-400 bg-amber-500/10 px-1 py-0.2 rounded">
              {dispatchStats.interactions_pct}%
            </span>
          </div>
        </div>
      </div>

      {/* Card 5: Cost */}
      <div className="bg-[#1e293b]/40 backdrop-blur-md border border-white/5 hover:border-rose-500/30 rounded-xl py-2 px-3 flex items-center gap-2.5 transition-all duration-300 hover:-translate-y-0.5 group">
        <div className="p-1.5 bg-rose-500/10 rounded-lg text-rose-400 group-hover:bg-rose-500/20 transition-all duration-300">
          <FiDollarSign size={14} />
        </div>
        <div>
          <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Investimento</p>
          <p className="text-sm font-black text-white mt-0.5">
            R$ {Number(dispatchStats.total_cost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>
    </div>
  );
};

export default DispatchStatsBar;
