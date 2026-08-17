import React, { useEffect, useRef } from 'react';
import { FiMousePointer } from 'react-icons/fi';
import { 
  formatDate, 
  DurationTimer, 
  getStatusBadge, 
  getFollowupConfig, 
  translateError 
} from './TriggerTableUtils';

// Subcomponentes Modulares
import TriggerBulkMetrics from './TriggerBulkMetrics';
import TriggerCostSummary from './TriggerCostSummary';
import TriggerButtonsActions from './TriggerButtonsActions';
import TriggerActionButtons from './TriggerActionButtons';

const TriggerTableRow = ({
  trigger,
  selectedIds,
  handleSelectOne,
  handleViewContacts,
  fetchChildren,
  fetchErrors,
  handleViewPipeline,
  handleEditParams,
  handleStartNow,
  handleCancel,
  handleRetry,
  handleDelete,
  handleSyncStats,
  user,
  onManualInteraction,
  handleTogglePin,
  folders,
  moveTriggerToFolder
}) => {
  const triggerWithActions = { ...trigger, onManualInteraction };

  const hasInteractionTracking = Boolean(
    triggerWithActions.interaction_funnel_id ||
    triggerWithActions.interaction_funnel ||
    (triggerWithActions.button_actions && Object.values(triggerWithActions.button_actions).some(
      action => action && (
        (action.type === 'interaction') ||
        (action.funnel_id && action.type !== 'block')
      )
    ))
  );

  // Auto-sync a cada 10s enquanto o trigger bulk está ativo E Restam > 0.
  const finalSyncDoneRef = useRef(false);
  useEffect(() => {
    if (!handleSyncStats || !trigger.is_bulk) return;
    const ACTIVE = ['processing', 'queued'];
    const isActive = ACTIVE.includes(trigger.status);
    if (!isActive) { finalSyncDoneRef.current = false; return; }

    const total = trigger.total_contacts || trigger.contacts_list?.length || 0;
    const processedNum = (trigger.total_sent || 0) + (trigger.total_failed || 0);
    const processedArr = trigger.processed_contacts?.length || 0;
    const remaining = Math.max(0, total - Math.max(processedArr, processedNum));

    if (remaining > 0) {
      finalSyncDoneRef.current = false;
      const interval = setInterval(() => handleSyncStats(trigger.id, { silent: true }), 10000);
      return () => clearInterval(interval);
    } else if (!finalSyncDoneRef.current) {
      finalSyncDoneRef.current = true;
      handleSyncStats(trigger.id, { silent: true });
    }
  }, [
    trigger.id, trigger.status, trigger.is_bulk,
    trigger.total_sent, trigger.total_failed,
    trigger.processed_contacts?.length, trigger.total_contacts,
    handleSyncStats
  ]);

  return (
    <tr className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 transition ${selectedIds.includes(trigger?.id) ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}>
      {/* Checkbox */}
      <td className="p-4">
        <input
          type="checkbox"
          checked={selectedIds.includes(trigger.id)}
          onChange={() => handleSelectOne(trigger.id)}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      </td>

      {/* Datas e Duração */}
      <td className="p-4 text-[11px] text-gray-600 dark:text-gray-300 leading-tight">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-gray-400 font-bold uppercase tracking-tighter text-[9px]">Chegada:</span>
            <span className="font-mono">{formatDate(triggerWithActions.created_at)}</span>
          </div>
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-blue-500 font-bold uppercase tracking-tighter text-[9px]">Disparo:</span>
            <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">{formatDate(triggerWithActions.scheduled_time)}</span>
          </div>
          {(() => {
            const started = triggerWithActions.processed_data?.started_at || triggerWithActions.scheduled_time || triggerWithActions.created_at;
            const isFinishedStatus = ['completed', 'failed', 'aborted', 'cancelled', 'cancelling'].includes(triggerWithActions.status);
            const finished = triggerWithActions.processed_data?.finished_at || (isFinishedStatus ? triggerWithActions.updated_at : null);
            
            if (!started) return null;
            
            return (
              <DurationTimer 
                started={started}
                finished={finished}
                triggerWithActions={triggerWithActions}
                isFinishedStatus={isFinishedStatus}
              />
            );
          })()}
        </div>
      </td>

      {/* Informações do Disparo (Bulk ou Individual) */}
      <td className="p-4 text-sm font-medium text-gray-800 dark:text-gray-200">
        {triggerWithActions.is_bulk ? (
          <div>
            <div className="flex items-center gap-2">
              <span className="text-blue-600 dark:text-blue-400 font-bold">
                {triggerWithActions.product_name === 'SCALE_TEST' ? '⚡ Teste de Escala: ' : '📤 '}
                {triggerWithActions.template_name?.split('|').pop() || triggerWithActions.funnel?.name || 'Disparo em Massa'}
              </span>
              {(() => {
                const cat = String(triggerWithActions.template_category || '').toUpperCase();
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
            {(triggerWithActions.interaction_child_count > 0 || triggerWithActions.block_child_count > 0 || triggerWithActions.child_count > 0 || (triggerWithActions.is_bulk && triggerWithActions.interaction_funnel_id)) && (
              <div className="flex flex-wrap items-center gap-3 mt-2 border-t border-gray-100 dark:border-gray-800/50 pt-2">
                {triggerWithActions.followup_status && (
                  (() => {
                    const config = getFollowupConfig(triggerWithActions.followup_status, triggerWithActions.followup_scheduled_time);
                    return (
                      <button 
                        onClick={() => fetchChildren(triggerWithActions, 'followup')} 
                        className={`flex items-center gap-1 px-2 py-0.5 rounded transition cursor-pointer ${config.className}`}
                      >
                        <span className="text-sm">{config.icon}</span>
                        <span className="text-[10px] font-black uppercase tracking-tighter">{config.text}</span>
                      </button>
                    );
                  })()
                )}
                {triggerWithActions.interaction_child_count > 0 && (
                  <button 
                    onClick={() => fetchChildren(triggerWithActions, 'interaction')} 
                    className="flex items-center gap-1 hover:bg-orange-50 dark:hover:bg-orange-900/20 px-2 py-0.5 rounded transition cursor-pointer group/rocket text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-900/30"
                  >
                    <span className="text-sm">🔄</span>
                    <span className="text-[10px] font-black uppercase tracking-tighter">Funis de Interação</span>
                  </button>
                )}
                {triggerWithActions.block_child_count > 0 && (
                  <button 
                    onClick={() => fetchChildren(triggerWithActions, 'block')} 
                    className="flex items-center gap-1 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-0.5 rounded transition cursor-pointer group/rocket text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/30"
                  >
                    <span className="text-sm">🚫</span>
                    <span className="text-[10px] font-black uppercase tracking-tighter">Funis de Bloqueio</span>
                  </button>
                )}
                {((triggerWithActions.interaction_child_count || 0) === 0 && (triggerWithActions.block_child_count || 0) === 0 && triggerWithActions.child_count > 0 && !triggerWithActions.followup_status && !triggerWithActions.is_bulk) && (
                  <button 
                    onClick={() => fetchChildren(triggerWithActions, 'all')} 
                    className="flex items-center gap-1 hover:bg-orange-50 dark:hover:bg-orange-900/20 px-1.5 py-0.5 rounded transition cursor-pointer group/rocket text-orange-600 dark:text-orange-400"
                  >
                    <span className="text-sm">🔄</span>
                    <span className="text-[10px] font-black uppercase tracking-tighter">Funis Ativados</span>
                  </button>
                )}
              </div>
            )}

            {/* Relatório de Falhas */}
            {triggerWithActions.total_failed > 0 && (
              <button onClick={() => fetchErrors(triggerWithActions.id)} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 mt-1 font-semibold cursor-pointer">
                📋 Ver Relatório de Falhas ({triggerWithActions.total_failed})
              </button>
            )}

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
        ) : (
          <div>
            <div className="flex items-center gap-2">
              <span className="uppercase text-xs font-black tracking-wider text-gray-500 mr-1">{triggerWithActions.event_type?.replace('_', ' ') || 'WEBHOOK'}:</span>
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
            <div className="flex flex-wrap items-center gap-3 mt-2 border-t border-gray-100 dark:border-gray-800/50 pt-2">
              {triggerWithActions.followup_status && (
                (() => {
                  const config = getFollowupConfig(triggerWithActions.followup_status, triggerWithActions.followup_scheduled_time);
                  return (
                    <button 
                      onClick={() => fetchChildren(triggerWithActions, 'followup')} 
                      className={`flex items-center gap-1 px-2 py-0.5 rounded transition cursor-pointer ${config.className}`}
                    >
                      <span className="text-sm">{config.icon}</span>
                      <span className="text-[10px] font-black uppercase tracking-tighter">{config.text}</span>
                    </button>
                  );
                })()
              )}
              {triggerWithActions.interaction_child_count > 0 && (
                <button 
                  onClick={() => fetchChildren(triggerWithActions, 'interaction')} 
                  className="flex items-center gap-1 hover:bg-orange-50 dark:hover:bg-orange-900/20 px-2 py-0.5 rounded transition cursor-pointer group/rocket text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-900/30"
                >
                  <span className="text-sm">🔄</span>
                  <span className="text-[10px] font-black uppercase tracking-tighter">Funis de Interação</span>
                </button>
              )}
              {triggerWithActions.block_child_count > 0 && (
                <button 
                  onClick={() => fetchChildren(triggerWithActions, 'block')} 
                  className="flex items-center gap-1 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-0.5 rounded transition cursor-pointer group/rocket text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/30"
                >
                  <span className="text-sm">🚫</span>
                  <span className="text-[10px] font-black uppercase tracking-tighter">Funis de Bloqueio</span>
                </button>
              )}
              {((triggerWithActions.interaction_child_count || 0) === 0 && (triggerWithActions.block_child_count || 0) === 0 && triggerWithActions.child_count > 0 && !triggerWithActions.followup_status) && (
                <button 
                  onClick={() => fetchChildren(triggerWithActions, 'all')} 
                  className="flex items-center gap-1 hover:bg-orange-50 dark:hover:bg-orange-900/20 px-1.5 py-0.5 rounded transition cursor-pointer group/rocket text-orange-600 dark:text-orange-400"
                >
                  <span className="text-sm">🔄</span>
                  <span className="text-[10px] font-black uppercase tracking-tighter">Funis Ativados</span>
                </button>
              )}
              {hasInteractionTracking && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-purple-600 dark:text-purple-400 ml-auto">
                  <FiMousePointer size={10} />
                  <span className="text-[10px] font-bold">{triggerWithActions.total_interactions || 0}</span>
                </span>
              )}
            </div>
          </div>
        )}
      </td>

      {/* Status, Pastas e Alertas */}
      <td className="p-4 text-center">
        {getStatusBadge(triggerWithActions)}
        {triggerWithActions.folder && (
          <div
            className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border"
            style={{
              backgroundColor: `${triggerWithActions.folder.color}1a`,
              borderColor: `${triggerWithActions.folder.color}4d`,
              color: triggerWithActions.folder.color
            }}
          >
            📁 {triggerWithActions.folder.name}
          </div>
        )}
        {triggerWithActions.is_stress_test && (
          <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-400 text-[10px] font-black uppercase tracking-wider">
            🧪 Teste de Escala
          </div>
        )}
        {!triggerWithActions.is_bulk && (triggerWithActions.status === 'failed' || triggerWithActions.status === 'cancelled') && triggerWithActions.failure_reason && (
          <div className="text-[10px] mt-1.5 leading-tight max-w-[150px] mx-auto break-words italic font-medium text-red-500">
            {translateError(triggerWithActions.failure_reason)}
          </div>
        )}
      </td>

      {/* Botões de Ação */}
      <TriggerActionButtons
        triggerWithActions={triggerWithActions}
        handleViewPipeline={handleViewPipeline}
        handleCancel={handleCancel}
        handleStartNow={handleStartNow}
        handleEditParams={handleEditParams}
        handleRetry={handleRetry}
        handleTogglePin={handleTogglePin}
        folders={folders}
        moveTriggerToFolder={moveTriggerToFolder}
        handleDelete={handleDelete}
        user={user}
      />
    </tr>
  );
};

export default TriggerTableRow;
