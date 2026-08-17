import React from 'react';

export default function TriggerCostSummary({ triggerWithActions, hasInteractionTracking }) {
  if (!triggerWithActions.total_delivered || triggerWithActions.total_delivered <= 0) {
    return null;
  }

  const totalDelivered = triggerWithActions.total_delivered || 0;
  const totalPaid = triggerWithActions.total_paid_templates || 0;
  const totalFree = Math.max(0, totalDelivered - totalPaid);
  const hasCost = triggerWithActions.total_cost > 0;

  const formatPct = (value) => {
    if (value <= 0) return '0';
    if (value >= 100) return '100';
    const rounded = Math.round(value);
    if (rounded === 0 || rounded === 100) return value.toFixed(1);
    return String(rounded);
  };

  const paidPct = formatPct(totalDelivered > 0 ? (totalPaid / totalDelivered) * 100 : 0);
  const freePct = formatPct(totalDelivered > 0 ? (totalFree / totalDelivered) * 100 : 0);

  let unitCost = triggerWithActions.cost_per_unit;
  if (!unitCost || unitCost <= 0) {
    unitCost = totalPaid > 0 ? (triggerWithActions.total_cost / totalPaid) : 0.35;
  }

  return (
    <div className={`text-xs font-semibold mt-2 flex flex-wrap gap-2 items-center ${hasCost ? 'text-green-600 dark:text-green-400' : 'text-blue-500'}`}>
      {totalFree > 0 && (
        <span>
          🆓 {totalFree} {totalFree === 1 ? 'de graça' : 'disparos grátis'} ({freePct}%)
          {unitCost > 0 && (
            <span className="text-blue-500 font-bold ml-1">
              (economia de R$ {(totalFree * unitCost).toFixed(2)})
            </span>
          )}
        </span>
      )}
      {hasCost && (
        <span className={totalFree > 0 ? 'ml-2 border-l border-gray-300 dark:border-white/10 pl-2' : ''}>
          💰 R$ {triggerWithActions.total_cost.toFixed(2)} ({totalPaid} {totalPaid === 1 ? 'pago' : 'pagos'} - {paidPct}%)
        </span>
      )}
      {hasCost && triggerWithActions.total_interactions > 0 && hasInteractionTracking && (
        <span className="text-[10px] bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded border border-green-200 dark:border-green-800" title="Custo por Interação (CPI)">
          R$ {(triggerWithActions.total_cost / triggerWithActions.total_interactions).toFixed(2)} / interação
        </span>
      )}
    </div>
  );
}
