import React from 'react';
import { FiZap, FiUsers, FiSend, FiActivity, FiGitMerge, FiShare2 } from 'react-icons/fi';

export default function IntegrationsHeaderBanner({
  onNavigateToLeads,
  onNavigateToBulk,
  onNavigateToDispatchHistory,
  onNavigateToFunnels,
  onOpenMappingGuide,
  onOpenNewModal
}) {
  return (
    <div className="bg-[#1e293b]/80 backdrop-blur-xl rounded-3xl p-6 border border-white/5 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-5">
        <div className="w-12 h-12 bg-yellow-500/10 rounded-2xl flex items-center justify-center text-yellow-500 border border-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.1)]">
          <FiZap size={24} fill="currentColor" />
        </div>
        <div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-3">
            Webhook Integrations
            {onNavigateToLeads && (
              <button
                onClick={onNavigateToLeads}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white transition-all text-[9px] font-black uppercase tracking-widest border border-blue-500/20 cursor-pointer"
                title="Ir para Contatos"
              >
                <FiUsers size={11} /> Contatos
              </button>
            )}
            {onNavigateToBulk && (
              <button
                onClick={onNavigateToBulk}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white transition-all text-[9px] font-black uppercase tracking-widest border border-indigo-500/20 cursor-pointer"
                title="Ir para Disparo em Massa"
              >
                <FiSend size={11} /> Disparo em Massa
              </button>
            )}
            {onNavigateToDispatchHistory && (
              <button
                onClick={onNavigateToDispatchHistory}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-500/10 hover:bg-violet-500 text-violet-400 hover:text-white transition-all text-[9px] font-black uppercase tracking-widest border border-violet-500/20 cursor-pointer"
                title="Ir para Histórico de Disparos"
              >
                <FiActivity size={11} /> Hist. Disparos
              </button>
            )}
            {onNavigateToFunnels && (
              <button
                onClick={onNavigateToFunnels}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white transition-all text-[9px] font-black uppercase tracking-widest border border-emerald-500/20 cursor-pointer"
                title="Ir para Funis"
              >
                <FiGitMerge size={11} /> Funis
              </button>
            )}
          </h2>
          <p className="text-gray-400 text-[11px] font-medium mt-0.5">
            Conecte a Hotmart, Kiwify, Eduzz para Automações de Eventos.
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenMappingGuide}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-800/50 hover:bg-gray-800 text-gray-400 transition-all font-bold text-[9px] border border-white/5 uppercase tracking-widest cursor-pointer"
        >
          <FiShare2 size={14} /> Guia
        </button>
        <button
          onClick={onOpenNewModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-all font-black text-[10px] shadow-lg shadow-blue-600/20 active:scale-95 uppercase tracking-widest cursor-pointer"
        >
          <FiZap size={14} fill="currentColor" /> Nova Integração
        </button>
      </div>
    </div>
  );
}
