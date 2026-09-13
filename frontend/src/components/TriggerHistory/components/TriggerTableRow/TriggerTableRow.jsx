import React from 'react';
import TriggerActionButtons from '../TriggerActionButtons';
import { useTriggerAutoSync } from './hooks/useTriggerAutoSync';
import TriggerDateCell from './components/TriggerDateCell';
import TriggerInfoCell from './components/TriggerInfoCell';
import TriggerStatusCell from './components/TriggerStatusCell';

const TriggerTableRow = ({
  trigger,
  selectedIds = [],
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

  // Polling automático de estatísticas
  useTriggerAutoSync(trigger, handleSyncStats);

  const isSelected = selectedIds?.includes(trigger?.id);

  return (
    <tr className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 transition ${isSelected ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}>
      {/* Checkbox */}
      <td className="p-4">
        <input
          type="checkbox"
          checked={Boolean(isSelected)}
          onChange={() => handleSelectOne?.(trigger?.id)}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      </td>

      {/* Datas e Duração */}
      <TriggerDateCell triggerWithActions={triggerWithActions} />

      {/* Informações do Disparo (Bulk ou Individual) */}
      <TriggerInfoCell
        triggerWithActions={triggerWithActions}
        hasInteractionTracking={hasInteractionTracking}
        handleViewContacts={handleViewContacts}
        handleSyncStats={handleSyncStats}
        fetchChildren={fetchChildren}
      />

      {/* Status, Pastas e Alertas */}
      <TriggerStatusCell triggerWithActions={triggerWithActions} />

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
