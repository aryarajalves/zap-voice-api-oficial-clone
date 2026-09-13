import React from 'react';
import { formatDate, DurationTimer } from '../../TriggerTableUtils';

export default function TriggerDateCell({ triggerWithActions }) {
  const started = triggerWithActions.processed_data?.started_at || 
                  triggerWithActions.scheduled_time || 
                  triggerWithActions.created_at;
  const isFinishedStatus = ['completed', 'failed', 'aborted', 'cancelled', 'cancelling'].includes(triggerWithActions.status);
  const finished = triggerWithActions.processed_data?.finished_at || (isFinishedStatus ? triggerWithActions.updated_at : null);

  return (
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
        {started && (
          <DurationTimer 
            started={started}
            finished={finished}
            triggerWithActions={triggerWithActions}
            isFinishedStatus={isFinishedStatus}
          />
        )}
      </div>
    </td>
  );
}
