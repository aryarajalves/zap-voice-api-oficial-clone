import React from 'react';
import TriggerBulkInfo from './TriggerBulkInfo';
import TriggerSingleInfo from './TriggerSingleInfo';

export default function TriggerInfoCell({
  triggerWithActions,
  hasInteractionTracking,
  handleViewContacts,
  handleSyncStats,
  fetchChildren
}) {
  return (
    <td className="p-4 text-sm font-medium text-gray-800 dark:text-gray-200">
      {triggerWithActions.is_bulk ? (
        <TriggerBulkInfo
          triggerWithActions={triggerWithActions}
          hasInteractionTracking={hasInteractionTracking}
          handleViewContacts={handleViewContacts}
          handleSyncStats={handleSyncStats}
          fetchChildren={fetchChildren}
        />
      ) : (
        <TriggerSingleInfo
          triggerWithActions={triggerWithActions}
          hasInteractionTracking={hasInteractionTracking}
          fetchChildren={fetchChildren}
        />
      )}
    </td>
  );
}
