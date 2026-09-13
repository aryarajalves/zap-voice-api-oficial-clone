import React from 'react';
import { getFollowupConfig } from '../../TriggerTableUtils';

export default function TriggerChildFunnels({ triggerWithActions, fetchChildren, children }) {
  const hasButtons = 
    Boolean(triggerWithActions.followup_status) ||
    Boolean(triggerWithActions.interaction_child_count > 0) ||
    Boolean(triggerWithActions.block_child_count > 0) ||
    Boolean(
      (triggerWithActions.interaction_child_count || 0) === 0 &&
      (triggerWithActions.block_child_count || 0) === 0 &&
      triggerWithActions.child_count > 0 &&
      !triggerWithActions.followup_status &&
      !triggerWithActions.is_bulk
    );

  const shouldRenderContainer = 
    hasButtons || 
    Boolean(triggerWithActions.is_bulk && triggerWithActions.interaction_funnel_id) || 
    Boolean(children);

  if (!shouldRenderContainer) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 mt-2 border-t border-gray-100 dark:border-gray-800/50 pt-2">
      {triggerWithActions.followup_status && (() => {
        const config = getFollowupConfig(triggerWithActions.followup_status, triggerWithActions.followup_scheduled_time);
        return (
          <button 
            onClick={() => fetchChildren?.(triggerWithActions, 'followup')} 
            className={`flex items-center gap-1 px-2 py-0.5 rounded transition cursor-pointer ${config.className}`}
          >
            <span className="text-sm">{config.icon}</span>
            <span className="text-[10px] font-black uppercase tracking-tighter">{config.text}</span>
          </button>
        );
      })()}

      {triggerWithActions.interaction_child_count > 0 && (
        <button 
          onClick={() => fetchChildren?.(triggerWithActions, 'interaction')} 
          className="flex items-center gap-1 hover:bg-orange-50 dark:hover:bg-orange-900/20 px-2 py-0.5 rounded transition cursor-pointer group/rocket text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-900/30"
        >
          <span className="text-sm">🔄</span>
          <span className="text-[10px] font-black uppercase tracking-tighter">Funis de Interação</span>
        </button>
      )}

      {triggerWithActions.block_child_count > 0 && (
        <button 
          onClick={() => fetchChildren?.(triggerWithActions, 'block')} 
          className="flex items-center gap-1 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-0.5 rounded transition cursor-pointer group/rocket text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/30"
        >
          <span className="text-sm">🚫</span>
          <span className="text-[10px] font-black uppercase tracking-tighter">Funis de Bloqueio</span>
        </button>
      )}

      {((triggerWithActions.interaction_child_count || 0) === 0 && 
        (triggerWithActions.block_child_count || 0) === 0 && 
        triggerWithActions.child_count > 0 && 
        !triggerWithActions.followup_status && 
        !triggerWithActions.is_bulk) && (
        <button 
          onClick={() => fetchChildren?.(triggerWithActions, 'all')} 
          className="flex items-center gap-1 hover:bg-orange-50 dark:hover:bg-orange-900/20 px-1.5 py-0.5 rounded transition cursor-pointer group/rocket text-orange-600 dark:text-orange-400"
        >
          <span className="text-sm">🔄</span>
          <span className="text-[10px] font-black uppercase tracking-tighter">Funis Ativados</span>
        </button>
      )}

      {children}
    </div>
  );
}
