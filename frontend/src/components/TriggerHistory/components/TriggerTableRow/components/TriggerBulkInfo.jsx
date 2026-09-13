import React from 'react';
import TriggerBulkMetrics from '../../TriggerBulkMetrics';
import TriggerCostSummary from '../../TriggerCostSummary';
import TriggerButtonsActions from '../../TriggerButtonsActions';
import TriggerChildFunnels from './TriggerChildFunnels';

export default function TriggerBulkInfo({
  triggerWithActions,
  hasInteractionTracking,
  handleViewContacts,
  handleSyncStats,
  fetchChildren
}) {
  const cat = String(triggerWithActions.template_category || '').toUpperCase();

  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="text-blue-600 dark:text-blue-400 font-bold">
          {triggerWithActions.product_name === 'SCALE_TEST' ? '⚡ Teste de Escala: ' : '📤 '}
          {triggerWithActions.template_name?.split('|').pop() || triggerWithActions.funnel?.name || 'Disparo em Massa'}
        </span>
        {(() => {
          if (cat === 'UTILITY' || cat === 'UTILIDADE') {
            return (
              <span className="text-[10px] bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300/40 dark:border-amber-800/40 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1" title="Categoria Meta: Utilidade">
                🛠️ Utilidade
              </span>
            );
          }
          if (cat === 'AUTHENTICATION' || cat === 'AUTENTICACAO' || cat === 'AUTENTICAÇÃO') {
            return (
              <span className="text-[10px] bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-300/40 dark:border-purple-800/40 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1" title="Categoria Meta: Autenticação">
                🔐 Autenticação
              </span>
            );
          }
          if (cat === 'MARKETING' || triggerWithActions.template_name) {
            return (
              <span className="text-[10px] bg-sky-100 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-300/40 dark:border-sky-800/40 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1" title="Categoria Meta: Marketing">
                📢 Marketing
              </span>
            );
          }
          return null;
        })()}
        {triggerWithActions.product_name === 'SCALE_TEST' ? (
          <span className="text-xs bg-purple-100 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded-full font-bold">⚡ Simulação</span>
        ) : triggerWithActions.is_recurring ? (
          <span className="text-xs bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold">🔄 Recorrente</span>
        ) : (
          <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">Bulk</span>
        )}
        <span className="text-[10px] bg-slate-105/10 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1" title="Delay entre envios">
          ⏱️ {triggerWithActions.delay_seconds ?? 5}s
        </span>
        <span className="text-[10px] bg-slate-105/10 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1" title="Limite de concorrência">
          👥 {triggerWithActions.concurrency_limit ?? 1}
        </span>
        {triggerWithActions.waba_card_last4 && String(triggerWithActions.waba_card_last4).trim() !== "" && (
          <span className="text-[10px] bg-blue-500/10 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border border-blue-500/20 px-2 py-0.5 rounded-full font-bold flex items-center gap-1" title="Últimos 4 dígitos do Cartão WABA vinculado">
            💳 Final {String(triggerWithActions.waba_card_last4).trim()}
          </span>
        )}
      </div>

      {/* Funis de Interação e Bloqueio */}
      {triggerWithActions.is_bulk && (triggerWithActions.interaction_funnel || triggerWithActions.block_funnel) && (
        <div className="flex flex-col gap-0.5 mt-1 text-[11px] text-gray-500 dark:text-gray-400">
          {triggerWithActions.interaction_funnel && (
            <div className="flex items-center gap-1">
              <span className="text-amber-500 font-bold">🔥 Interação:</span>
              <span className="font-semibold text-gray-700 dark:text-gray-300">{triggerWithActions.interaction_funnel.name}</span>
            </div>
          )}
          {triggerWithActions.block_funnel && (
            <div className="flex items-center gap-1">
              <span className="text-red-500 font-bold">🚫 Bloqueio:</span>
              <span className="font-semibold text-gray-700 dark:text-gray-300">{triggerWithActions.block_funnel.name}</span>
            </div>
          )}
        </div>
      )}

      {/* Métricas dos Contatos */}
      {(triggerWithActions.template_name || triggerWithActions.is_bulk) && (
        <TriggerBulkMetrics
          triggerWithActions={triggerWithActions}
          hasInteractionTracking={hasInteractionTracking}
          handleViewContacts={handleViewContacts}
          handleSyncStats={handleSyncStats}
        />
      )}

      {/* Funis Filhos e Ações Relacionadas */}
      <TriggerChildFunnels 
        triggerWithActions={triggerWithActions} 
        fetchChildren={fetchChildren} 
      />

      {/* Resumo de Custos */}
      <TriggerCostSummary
        triggerWithActions={triggerWithActions}
        hasInteractionTracking={hasInteractionTracking}
      />

      {/* Botões e Ações */}
      <TriggerButtonsActions
        buttonActions={triggerWithActions.button_actions}
      />
    </div>
  );
}
