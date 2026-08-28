import React from 'react';
import TriggerTableTip from './TriggerTableTip';

export default function TriggerBulkMetrics({
  triggerWithActions,
  hasInteractionTracking,
  handleViewContacts,
  handleSyncStats
}) {
  const total = triggerWithActions.total_contacts || (triggerWithActions.contacts_list?.length) || 0;
  const processedNum = (triggerWithActions.total_sent || 0) + (triggerWithActions.total_failed || 0) + (triggerWithActions.total_skipped || 0) + (triggerWithActions.total_blocked || 0);
  const processedArr = triggerWithActions.processed_contacts?.length || 0;
  const processed = Math.max(processedArr, processedNum);
  const remaining = Math.max(0, total - processed);

  const queueCount = triggerWithActions.queue_count !== undefined && triggerWithActions.queue_count !== null
    ? triggerWithActions.queue_count
    : Math.max(0, (triggerWithActions.total_sent || 0) - (triggerWithActions.total_delivered || 0));

  return (
    <div className="flex flex-wrap gap-4 mt-2">
      <button 
        onClick={() => handleViewContacts(triggerWithActions, 'total')}
        className="flex items-center gap-1.5 hover:opacity-80 transition cursor-pointer" 
        title="Ver Total na Lista"
      >
        <span className="text-sm">🚀</span>
        <span className="text-xs font-black text-gray-500">{total}</span>
      </button>

      <button
        onClick={() => handleViewContacts(triggerWithActions, 'sent')}
        className="flex items-center gap-1.5 hover:opacity-80 transition cursor-pointer"
        title="Ver Enviados"
      >
        <span className="text-sm">✅</span>
        <span className="text-xs font-black text-gray-500">{triggerWithActions.total_sent || 0}</span>
      </button>
      
      <button 
        onClick={() => handleViewContacts(triggerWithActions, 'queue')} 
        className="flex items-center gap-1.5 hover:opacity-80 transition cursor-pointer" 
        title="Ver Fila de Envio (Meta)"
      >
        <span className="text-sm">⏳</span>
        <span className="text-xs font-black text-blue-500">{queueCount}</span>
      </button>

      <button
        onClick={() => handleViewContacts(triggerWithActions, 'delivered')}
        className="flex items-center gap-1.5 hover:opacity-80 transition cursor-pointer"
        title="Ver Entregues"
      >
        <span className="text-sm">📬</span>
        <span className="text-xs font-black text-emerald-500">{triggerWithActions.total_delivered || 0}</span>
      </button>
      
      <button
        onClick={() => handleViewContacts(triggerWithActions, 'read')}
        className="flex items-center gap-1.5 hover:opacity-80 transition cursor-pointer"
        title="Ver Lidos"
      >
        <span className="text-sm">👀</span>
        <span className="text-xs font-black text-indigo-500">{triggerWithActions.total_read || 0}</span>
      </button>

      {hasInteractionTracking && (
        <button
          onClick={() => handleViewContacts(triggerWithActions, 'interaction')}
          className="flex items-center gap-1.5 hover:opacity-80 transition cursor-pointer"
          title="Ver Cliques"
        >
          <span className="text-sm">👆</span>
          <span className="text-xs font-black text-amber-500">{triggerWithActions.total_interactions || 0}</span>
        </button>
      )}

      <button
        onClick={() => handleViewContacts(triggerWithActions, 'blocked')}
        className="flex items-center gap-1.5 hover:opacity-80 transition cursor-pointer"
        title="Ver Bloqueios"
      >
        <span className="text-sm">🚫</span>
        <span className="text-xs font-black text-rose-500">{triggerWithActions.total_blocked || 0}</span>
      </button>

      <button
        onClick={() => handleViewContacts(triggerWithActions, 'skipped')}
        className="flex items-center gap-1.5 hover:opacity-80 transition cursor-pointer"
        title="Ver Pulados — Template já enviado nas últimas 24h"
      >
        <span className="text-sm">⏭️</span>
        <span className="text-xs font-black text-amber-500">{triggerWithActions.total_skipped || 0}</span>
      </button>

      <button
        onClick={() => handleViewContacts(triggerWithActions, 'failed')}
        className="flex items-center gap-1.5 hover:opacity-80 transition cursor-pointer"
        title="Ver Falhas"
      >
        <span className="text-sm">❌</span>
        <span className="text-xs font-black text-red-500">{triggerWithActions.total_failed || 0}</span>
      </button>

      <div className="flex items-center gap-1.5 cursor-default select-none" title="Faltam para terminar o lote">
        <span className="text-sm">⏳</span>
        <span className="text-xs font-black text-slate-500 dark:text-slate-400">Restam {remaining}</span>
      </div>

      {handleSyncStats && (
        <TriggerTableTip text="Recalcular os contadores (enviados, entregues, lidos, interações) a partir dos registros reais. Use quando os números da linha não batem com os da lista de contatos.">
          <button
            onClick={() => handleSyncStats(triggerWithActions.id)}
            className="flex items-center gap-1 hover:opacity-80 transition cursor-pointer"
            title="Sincronizar contadores"
          >
            <span className="text-sm">🔄</span>
            <span className="text-[10px] font-black text-slate-400 hover:text-blue-500">Sync</span>
          </button>
        </TriggerTableTip>
      )}
    </div>
  );
}
