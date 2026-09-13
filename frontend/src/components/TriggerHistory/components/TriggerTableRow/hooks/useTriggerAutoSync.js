import { useEffect, useRef } from 'react';

/**
 * Hook para auto-sincronizar estatísticas do trigger a cada 10s enquanto estiver ativo e restarem contatos.
 */
export function useTriggerAutoSync(trigger, handleSyncStats) {
  const finalSyncDoneRef = useRef(false);

  useEffect(() => {
    if (!handleSyncStats || !trigger?.is_bulk) return;
    const ACTIVE = ['processing', 'queued'];
    const isActive = ACTIVE.includes(trigger.status);
    if (!isActive) {
      finalSyncDoneRef.current = false;
      return;
    }

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
    trigger?.id,
    trigger?.status,
    trigger?.is_bulk,
    trigger?.total_sent,
    trigger?.total_failed,
    trigger?.processed_contacts?.length,
    trigger?.total_contacts,
    handleSyncStats
  ]);
}
