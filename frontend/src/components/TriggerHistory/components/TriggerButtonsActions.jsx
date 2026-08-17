import React from 'react';

export default function TriggerButtonsActions({ buttonActions }) {
  if (!buttonActions || Object.keys(buttonActions).length === 0) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-col gap-1 border-t border-gray-100 dark:border-gray-800/50 pt-2 text-xs">
      <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Botões e Ações:</span>
      <div className="flex flex-wrap gap-2 mt-1">
        {Object.entries(buttonActions).map(([btnText, action]) => {
          const hasFunnel = action && action.funnel_id;
          const funnelName = action && action.funnel_name;
          const actionType = action && action.type;
          
          return (
            <div 
              key={btnText} 
              className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50 text-gray-700 dark:text-gray-300 font-semibold"
            >
              <span className="text-[10px]">🔘</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{btnText}</span>
              <span className="text-gray-400">→</span>
              {hasFunnel ? (
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter ${actionType === 'block' ? 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200/50 dark:border-red-900/20' : 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/20'}`}>
                  {actionType === 'block' ? '🚫 Bloqueio' : '🔥 Interação'}: {funnelName || `Funil #${action.funnel_id}`}
                </span>
              ) : (
                <span className="text-gray-400 dark:text-gray-500 text-[10px] font-bold italic">Sem ação vinculada</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
