import { useEffect } from 'react';
import { WS_URL } from '../../../config';

/**
 * Hook para gerenciar conexão WebSocket e atualizações em tempo real
 * de disparos, reenvios em lote e histórico de webhooks.
 */
export function useIntegrationsSocket({
  activeClient,
  isPipelineModalOpen,
  selectedDispatchId,
  isDispatchHistoryModalOpen,
  isHistoryModalOpen,
  historyIntegrationId,
  fetchIntegrations,
  setBulkResendProgress,
  setSelectedDispatch,
  setDispatchHistory,
  setWebhookHistory,
  bulkResendProgress
}) {
  // WebSocket para atualizações em tempo real
  useEffect(() => {
    let ws;
    let reconnectTimeout;

    const connect = () => {
      if (!activeClient) return;
      const wsBase = WS_URL.endsWith('/ws') ? WS_URL : `${WS_URL}/ws`;
      const wsToken = localStorage.getItem('token');
      const wsFinalUrl = wsToken ? `${wsBase}?token=${wsToken}` : wsBase;

      try {
        ws = new WebSocket(wsFinalUrl);
        ws.onmessage = (event) => {
          const message = JSON.parse(event.data);
          if (message.event === 'bulk_progress' && message.data?.type === 'webhook_resend') {
            setBulkResendProgress(message.data);
          }
          if (message.event === 'trigger_progress' || message.event === 'bulk_progress') {
            const data = message.data;
            const triggerId = data.id || data.trigger_id;

            if (isPipelineModalOpen && selectedDispatchId === triggerId && setSelectedDispatch) {
              setSelectedDispatch(prev => ({ ...prev, ...data }));
            }

            if (isDispatchHistoryModalOpen && setDispatchHistory) {
              setDispatchHistory(prev => {
                const index = prev.findIndex(item => item.id === triggerId);
                if (index !== -1) {
                  const newHistory = [...prev];
                  const existingItem = newHistory[index];
                  const mappedData = {
                    status: data.status !== undefined ? data.status : existingItem.status,
                    total_sent: data.sent !== undefined ? data.sent : (data.total_sent !== undefined ? data.total_sent : existingItem.total_sent),
                    total_failed: data.failed !== undefined ? data.failed : (data.total_failed !== undefined ? data.total_failed : existingItem.total_failed),
                    total_contacts: data.total_contacts !== undefined ? data.total_contacts : (data.total !== undefined ? data.total : existingItem.total_contacts),
                    total_delivered: data.delivered !== undefined ? data.delivered : (data.total_delivered !== undefined ? data.total_delivered : existingItem.total_delivered),
                    total_read: data.read !== undefined ? data.read : (data.total_read !== undefined ? data.total_read : existingItem.total_read),
                    total_interactions: data.interactions !== undefined ? data.interactions : (data.total_interactions !== undefined ? data.total_interactions : existingItem.total_interactions),
                    total_blocked: data.blocked !== undefined ? data.blocked : (data.total_blocked !== undefined ? data.total_blocked : existingItem.total_blocked),
                    total_cost: data.cost !== undefined ? data.cost : (data.total_cost !== undefined ? data.total_cost : existingItem.total_cost),
                    total_memory_sent: data.memory_sent !== undefined ? data.memory_sent : (data.total_memory_sent !== undefined ? data.total_memory_sent : existingItem.total_memory_sent)
                  };
                  newHistory[index] = { ...existingItem, ...data, ...mappedData };
                  return newHistory;
                }
                return prev;
              });
            }

            if (['completed', 'failed', 'cancelled'].includes(data.status)) {
              fetchIntegrations(true);
            }
          }

          if (message.event === 'webhook_history_update') {
            const data = message.data;
            if (isHistoryModalOpen && historyIntegrationId === data.integration_id && setWebhookHistory) {
              setWebhookHistory(prev => {
                const index = prev.findIndex(item => item.id === data.history_id);
                if (index !== -1) {
                  const newHistory = [...prev];
                  newHistory[index] = { ...newHistory[index], processed_data: data.processed_data };
                  return newHistory;
                }
                return prev;
              });
            }
          }
        };
        ws.onclose = () => { reconnectTimeout = setTimeout(connect, 3000); };
      } catch (err) { console.error(err); }
    };

    connect();
    return () => {
      if (ws) { ws.onclose = null; ws.close(); }
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [
    activeClient,
    isPipelineModalOpen,
    selectedDispatchId,
    isDispatchHistoryModalOpen,
    isHistoryModalOpen,
    historyIntegrationId,
    fetchIntegrations,
    setBulkResendProgress,
    setSelectedDispatch,
    setDispatchHistory,
    setWebhookHistory
  ]);

  // Limpeza automática do progresso de reenvio
  useEffect(() => {
    if (bulkResendProgress?.status === 'completed' || bulkResendProgress?.status === 'failed') {
      const timer = setTimeout(() => {
        setBulkResendProgress(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [bulkResendProgress?.status, setBulkResendProgress]);
}
