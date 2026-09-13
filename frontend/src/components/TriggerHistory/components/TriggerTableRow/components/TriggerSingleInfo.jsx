import React from 'react';
import { FiMousePointer } from 'react-icons/fi';
import TriggerChildFunnels from './TriggerChildFunnels';

export default function TriggerSingleInfo({
  triggerWithActions,
  hasInteractionTracking,
  fetchChildren
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="uppercase text-xs font-black tracking-wider text-gray-500 mr-1">
          {triggerWithActions.event_type?.replace('_', ' ') || 'WEBHOOK'}:
        </span>
        {triggerWithActions.funnel?.name || <span className="text-gray-400 italic">Funil Apagado</span>}
        <span className="text-[10px] bg-slate-105/10 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1" title="Delay entre envios">
          ⏱️ {triggerWithActions.delay_seconds ?? 5}s
        </span>
        <span className="text-[10px] bg-slate-105/10 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1" title="Limite de concorrência">
          👥 {triggerWithActions.concurrency_limit ?? 1}
        </span>
      </div>

      {(triggerWithActions.contact_name || triggerWithActions.contact_phone) && (
        <div className="flex items-center gap-2 mt-1">
          <span className="inline-flex items-center gap-1.5 bg-blue-500/10 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border border-blue-500/20 px-2 py-0.5 rounded-md font-semibold text-xs">
            <span>👤</span>
            <span>{triggerWithActions.contact_name || 'Contato'}</span>
            {triggerWithActions.contact_phone && (
              <span className="text-gray-500 dark:text-gray-400 font-mono text-[11px]">({triggerWithActions.contact_phone})</span>
            )}
          </span>
        </div>
      )}

      {triggerWithActions.total_delivered > 0 && (
        <div className={`text-[10px] font-bold mt-0.5 ${triggerWithActions.total_cost > 0 ? 'text-green-600 dark:text-green-400' : 'text-blue-500'}`}>
          {triggerWithActions.total_cost > 0 ? `💰 R$ ${triggerWithActions.total_cost.toFixed(2)}` : '🆓 de graça'}
        </div>
      )}

      <TriggerChildFunnels 
        triggerWithActions={triggerWithActions} 
        fetchChildren={fetchChildren}
      >
        {hasInteractionTracking && (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-purple-600 dark:text-purple-400 ml-auto">
            <FiMousePointer size={10} />
            <span className="text-[10px] font-bold">{triggerWithActions.total_interactions || 0}</span>
          </span>
        )}
      </TriggerChildFunnels>
    </div>
  );
}
