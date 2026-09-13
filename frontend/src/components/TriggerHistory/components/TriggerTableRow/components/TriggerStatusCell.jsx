import React from 'react';
import { getStatusBadge, translateError } from '../../TriggerTableUtils';

export default function TriggerStatusCell({ triggerWithActions }) {
  return (
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
      {!triggerWithActions.is_bulk && 
       (triggerWithActions.status === 'failed' || triggerWithActions.status === 'cancelled') && 
       triggerWithActions.failure_reason && (
        <div className="text-[10px] mt-1.5 leading-tight max-w-[150px] mx-auto break-words italic font-medium text-red-500">
          {translateError(triggerWithActions.failure_reason)}
        </div>
      )}
    </td>
  );
}
