import React from 'react';
import { FiZap } from 'react-icons/fi';

export default function HistoryManyChatStatus({ manychat_sync }) {
  const sync = manychat_sync;
  const keyPrev = sync?.key_preview || (
    sync?.account_name?.toLowerCase().includes('conta 2')
      ? '...be1c'
      : sync?.account_name?.toLowerCase().includes('conta principal') || sync?.account_name?.toLowerCase().includes('conta 1')
        ? '...074e'
        : ''
  );

  return (
    <div className="mt-4 p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl relative overflow-hidden group/mc">
      <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none group-hover/mc:scale-110 transition-transform duration-700">
        <FiZap size={60} className="text-indigo-400" />
      </div>
      <div className="text-[10px] text-indigo-400 font-black uppercase mb-3 flex items-center justify-between tracking-widest relative z-10">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`flex h-2 w-2 rounded-full ${
            sync?.status === 'success' ? 'bg-green-500' : 
            sync?.status === 'failed' ? 'bg-red-500' : 'bg-orange-500'
          } animate-pulse`}></span>
          Integração ManyChat
          {sync?.account_name && (
            <span className="text-[10px] text-indigo-300 font-bold bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 normal-case flex items-center gap-1.5">
              • Conta: {sync.account_name}
              {keyPrev && (
                <span className="text-[9px] text-indigo-400 font-mono opacity-90 font-normal">
                  ({keyPrev})
                </span>
              )}
            </span>
          )}
        </div>
        <span className="text-[9px] opacity-60">Status: {sync?.status || 'Pendente'}</span>
      </div>

      {sync ? (
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[11px] relative z-10">
          {sync.account_name && (
            <div className="flex justify-between border-b border-indigo-500/10 pb-1 md:col-span-2">
              <span className="text-gray-400 font-medium">Conta Destino:</span>
              <span className="font-bold text-indigo-300 flex items-center gap-1.5 flex-wrap justify-end">
                ⚡ {sync.account_name}
                {keyPrev && (
                  <span className="text-[9px] text-indigo-300/90 font-mono bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20" title="Últimos dígitos do token ManyChat">
                    ({keyPrev})
                  </span>
                )}
                {sync.rotation_info && (
                  <span className="text-[9px] text-indigo-400/90 font-mono bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                    ({sync.rotation_info})
                  </span>
                )}
              </span>
            </div>
          )}
          <div className="flex justify-between border-b border-indigo-500/10 pb-1">
            <span className="text-gray-400">Contato:</span>
            <span className={`font-bold ${sync.contact?.status === 'created' ? 'text-green-400' : 'text-indigo-300'}`}>
              {sync.contact?.status === 'created' ? '✅ Criado' : 
               sync.contact?.status === 'existed' ? '🔍 Localizado' : '❌ Falhou'}
            </span>
          </div>
          <div className="flex justify-between border-b border-indigo-500/10 pb-1">
            <span className="text-gray-400">Etiqueta:</span>
            <span className={`font-bold ${sync.tag?.status === 'applied' ? 'text-green-400' : 'text-orange-400'}`}>
              {sync.tag?.status === 'applied' ? '🏷️ Vinculada' : '⚠️ Pendente'}
            </span>
          </div>
          <div className="flex justify-between md:col-span-2 pt-1">
            <span className="text-gray-500">Etiqueta aplicada:</span>
            <span className="font-mono text-indigo-400 bg-indigo-500/5 px-1.5 py-0.5 rounded text-[10px]">
              {sync.tag?.name || '-'}
            </span>
          </div>
          {sync.error && (
            <div className="md:col-span-2 mt-1 p-2 bg-red-500/5 border border-red-500/10 rounded-lg text-red-400 text-[10px]">
              <strong>Erro:</strong> {sync.error}
            </div>
          )}
        </div>
      ) : (
        <div className="text-[11px] text-gray-500 italic py-2">
          Aguardando sincronização com o ManyChat...
        </div>
      )}
    </div>
  );
}
