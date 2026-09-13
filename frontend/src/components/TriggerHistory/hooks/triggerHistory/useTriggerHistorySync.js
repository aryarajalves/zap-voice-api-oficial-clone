import { useEffect } from 'react';
import { API_URL, WS_URL } from '../../../../config';
import { fetchWithAuth } from '../../../../AuthContext';
import { handleWebSocketMessage } from '../../utils/triggerHistoryUtils';

export function useTriggerHistorySync({
    activeClient,
    monitoringTrigger,
    setMonitoringTrigger,
    fetchHistory,
    setTriggers,
    setChildrenModal
}) {
    // Auto-refresh do pipeline modal enquanto o trigger ainda está em execução ou suspenso/falhado
    useEffect(() => {
        const ACTIVE_STATUSES = ['processing', 'queued', 'suspended', 'failed'];
        if (!monitoringTrigger || !ACTIVE_STATUSES.includes(monitoringTrigger.status)) return;

        const interval = setInterval(async () => {
            try {
                const res = await fetchWithAuth(`${API_URL}/triggers/${monitoringTrigger.id}`, {}, activeClient?.id);
                if (res.ok) {
                    const updated = await res.json();
                    setMonitoringTrigger(updated);
                    if (!ACTIVE_STATUSES.includes(updated.status)) {
                        clearInterval(interval);
                    }
                }
            } catch (_) {
                // Silencioso — não interrompe a UI por falha de refresh
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [monitoringTrigger?.id, monitoringTrigger?.status, activeClient?.id]);

    // WebSocket handling e auto-reconexão
    useEffect(() => {
        let ws;
        let reconnectTimeout;
        let isMounted = true;

        const connectWS = () => {
            if (!isMounted) return;
            const wsBase = WS_URL.endsWith('/ws') ? WS_URL : `${WS_URL}/ws`;
            const wsToken = localStorage.getItem('token');
            const wsFinalUrl = wsToken ? `${wsBase}?token=${wsToken}` : wsBase;

            try {
                ws = new WebSocket(wsFinalUrl);

                ws.onopen = () => {
                    if (activeClient?.id && ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({
                            event: "subscribe_client",
                            client_id: activeClient.id
                        }));
                    }
                };

                ws.onmessage = (event) => {
                    try {
                        const payload = JSON.parse(event.data);
                        handleWebSocketMessage(payload, activeClient, setTriggers, setChildrenModal);
                    } catch (e) {}
                };

                ws.onclose = () => {
                    if (isMounted) {
                        reconnectTimeout = setTimeout(connectWS, 3000);
                    }
                };

                ws.onerror = () => {
                    if (ws) ws.close();
                };
            } catch (e) {
                if (isMounted) {
                    reconnectTimeout = setTimeout(connectWS, 5000);
                }
            }
        };

        connectWS();

        // Polling de segurança a cada 10s para disparos em andamento
        const interval = setInterval(fetchHistory, 10000);

        return () => {
            isMounted = false;
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
            if (ws) ws.close();
            clearInterval(interval);
        };
    }, [activeClient?.id, fetchHistory]);
}
