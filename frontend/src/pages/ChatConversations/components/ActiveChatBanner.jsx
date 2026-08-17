import React from 'react';
import { FiX, FiZap } from 'react-icons/fi';

export default function ActiveChatBanner({
    activeFunnel,
    onOpenPipeline,
    isLoadingPipeline,
    onOpenCancelModal
}) {
    if (!activeFunnel) return null;

    return (
        <div className="bg-blue-600/10 border-b border-blue-500/20 px-6 py-2.5 flex items-center justify-between text-xs text-blue-400 font-medium">
            <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                <span>
                    Funil em execução para este contato: <strong>{activeFunnel.name}</strong> 
                    <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/20 text-blue-300 uppercase">
                        {activeFunnel.status === 'queued' ? 'Aguardando' : 
                         activeFunnel.status === 'processing' ? 'Processando' : 
                         activeFunnel.status === 'suspended' ? 'Pausado (Aguardando resposta)' : 
                         activeFunnel.status === 'paused_waiting_delivery' ? 'Aguardando entrega' : 
                         activeFunnel.status}
                    </span>
                </span>
            </div>
            <div className="flex items-center gap-3">
                <button
                    onClick={onOpenPipeline}
                    disabled={isLoadingPipeline}
                    className="px-2.5 py-1 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:text-blue-300 rounded-lg transition text-[11px] font-bold flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
                    title="Abrir pipeline da automação em tempo real"
                >
                    <FiZap size={13} className={isLoadingPipeline ? "animate-spin" : ""} />
                    {isLoadingPipeline ? "Carregando..." : "Ver Pipeline"}
                </button>
                <button
                    onClick={onOpenCancelModal}
                    className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 rounded-lg transition text-[11px] font-bold flex items-center gap-1.5"
                >
                    <FiX size={13} /> Cancelar Funil
                </button>
                <span className="text-[10px] text-gray-400 hidden sm:inline">
                    Atualiza automaticamente
                </span>
            </div>
        </div>
    );
}
