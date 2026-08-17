import React from 'react';
import TriggerTableTip from './TriggerTableTip';
import MoveFolderButton from './MoveFolderButton';

export default function TriggerActionButtons({
  triggerWithActions,
  handleViewPipeline,
  handleCancel,
  handleStartNow,
  handleEditParams,
  handleRetry,
  handleTogglePin,
  folders,
  moveTriggerToFolder,
  handleDelete,
  user
}) {
  const isPipelineSupported = (triggerWithActions.funnel_id || triggerWithActions.product_name === 'SCALE_TEST' || (triggerWithActions.button_actions && Object.keys(triggerWithActions.button_actions).length > 0)) &&
    Array.isArray(triggerWithActions.execution_history) && triggerWithActions.execution_history.some(log => log.node_id);

  return (
    <td className="p-4 text-right flex justify-end gap-2">
      {/* 0. VISUALIZAR FLUXO */}
      {isPipelineSupported && (
        <button 
          onClick={() => handleViewPipeline(triggerWithActions.id)} 
          className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition cursor-pointer" 
          title="Ver Fluxo de Automação Visual"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
          </svg>
        </button>
      )}

      {/* 1. DISPAROS EM ANDAMENTO */}
      {triggerWithActions.status === 'processing' && (
        <>
          <TriggerTableTip text="Cancelar o disparo. O batch atual será concluído e o envio para antes do próximo grupo de contatos.">
            <button onClick={() => handleCancel(triggerWithActions.id)} className="p-1 text-red-500 hover:bg-red-50 rounded cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </TriggerTableTip>
          {triggerWithActions.is_bulk && (
            <TriggerTableTip text="Forçar retomada do disparo. Use quando o disparo parece travado — o sistema verifica se o worker ainda está ativo e reinicia o envio a partir dos contatos pendentes.">
              <button onClick={() => handleStartNow(triggerWithActions.id)} className="p-1 text-orange-500 hover:bg-orange-50 rounded cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </TriggerTableTip>
          )}
        </>
      )}

      {/* 2. DISPAROS PENDENTES */}
      {triggerWithActions.status === 'pending' && (
        <>
          {triggerWithActions.is_bulk && (
            <TriggerTableTip text="Editar os parâmetros do disparo antes de iniciá-lo (delay, concorrência, template).">
              <button onClick={() => handleEditParams(triggerWithActions)} className="p-1 text-blue-500 hover:bg-blue-50 rounded cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </TriggerTableTip>
          )}
          <TriggerTableTip text="Iniciar o disparo agora, sem esperar o horário agendado.">
            <button onClick={() => handleStartNow(triggerWithActions.id)} className="p-1 text-green-500 hover:bg-green-50 rounded cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </TriggerTableTip>
          <TriggerTableTip text="Cancelar o disparo. Ele será removido da fila e não será enviado.">
            <button onClick={() => handleCancel(triggerWithActions.id)} className="p-1 text-red-500 hover:bg-red-50 rounded cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </TriggerTableTip>
        </>
      )}

      {/* 3. DISPAROS FINALIZADOS, PAUSADOS, CANCELADOS OU EM ENCERRAMENTO */}
      {(triggerWithActions.status === 'failed' || triggerWithActions.status === 'cancelled' || triggerWithActions.status === 'paused' || triggerWithActions.status === 'cancelling') && (
        <div className="flex items-center gap-2">
          {triggerWithActions.is_bulk && (
            <TriggerTableTip text="Ajustar o delay entre disparos e o limite de concorrência antes de retomar.">
              <button onClick={() => handleEditParams(triggerWithActions)} className="p-1 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </TriggerTableTip>
          )}
          <TriggerTableTip text="Retomar o disparo a partir do último contato enviado.">
            <button onClick={() => handleStartNow(triggerWithActions.id)} className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded flex items-center gap-1 cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </TriggerTableTip>
          {triggerWithActions.status === 'failed' && (
            <TriggerTableTip text="Repetir o disparo apenas para os contatos que falharam, sem reenviar para quem já recebeu.">
              <button onClick={() => handleRetry(triggerWithActions.id)} className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </TriggerTableTip>
          )}
        </div>
      )}

      {/* 4. FIXAR */}
      {handleTogglePin && (
        <TriggerTableTip text={triggerWithActions.is_pinned ? "Desafixar do topo" : "Fixar no topo do histórico"}>
          <button
            onClick={() => handleTogglePin(triggerWithActions.id)}
            className={`p-1 rounded transition-colors cursor-pointer ${triggerWithActions.is_pinned ? 'text-amber-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20' : 'text-gray-300 hover:text-amber-400 hover:bg-amber-50 dark:text-gray-600 dark:hover:bg-amber-900/20'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill={triggerWithActions.is_pinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
        </TriggerTableTip>
      )}

      {/* 4b. MOVER PARA PASTA */}
      {moveTriggerToFolder && (
        <MoveFolderButton
          trigger={triggerWithActions}
          folders={folders}
          moveTriggerToFolder={moveTriggerToFolder}
        />
      )}

      {/* 5. OPÇÕES ADMINISTRATIVAS */}
      {user?.role === 'super_admin' && (
        <TriggerTableTip text="Excluir este registro do histórico permanentemente. Os dados de envio serão perdidos.">
          <button onClick={() => handleDelete(triggerWithActions.id)} className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </TriggerTableTip>
      )}
    </td>
  );
}
