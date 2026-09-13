import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { API_URL, WEBHOOK_BASE_URL } from '../../../config';
import { fetchWithAuth } from '../../../AuthContext';
import { PLATFORM_EVENT_OPTIONS } from '../constants/platformEventOptions';
import { generateWebhookPayload } from '../utils/payloadGenerators';

export function useStressWebhookTest(activeClient, testType) {
  const [webhookIntegrations, setWebhookIntegrations] = useState([]);
  const [loadingWebhookIntegrations, setLoadingWebhookIntegrations] = useState(false);
  const [selectedIntegrationId, setSelectedIntegrationId] = useState('');
  const [webhookSelectedEvents, setWebhookSelectedEvents] = useState([]);
  const [webhookCount, setWebhookCount] = useState(10);
  const [webhookConcurrency, setWebhookConcurrency] = useState(5);
  const [webhookDelayMs, setWebhookDelayMs] = useState(0);
  const [webhookTestResults, setWebhookTestResults] = useState(null);
  const [isWebhookRunning, setIsWebhookRunning] = useState(false);
  const [webhookSendEach, setWebhookSendEach] = useState(false);
  const webhookAbortRef = useRef(false);

  // Fetch webhook integrations
  useEffect(() => {
    if (!activeClient || testType !== 'webhook') return;
    const load = async () => {
      setLoadingWebhookIntegrations(true);
      try {
        const res = await fetchWithAuth(`${API_URL}/webhook-integrations`, {}, activeClient.id);
        if (res.ok) {
          const data = await res.json();
          setWebhookIntegrations(data);
          if (data.length > 0 && !selectedIntegrationId) {
            setSelectedIntegrationId(String(data[0].id));
            const platform = data[0].platform?.toLowerCase();
            const events = PLATFORM_EVENT_OPTIONS[platform];
            if (events?.length > 0) setWebhookSelectedEvents([events[0].value]);
          }
        }
      } catch (err) {
        toast.error("Não foi possível carregar as integrações.");
      } finally {
        setLoadingWebhookIntegrations(false);
      }
    };
    load();
  }, [activeClient, testType]);

  // When selected integration changes, reset to first event selected
  useEffect(() => {
    if (!selectedIntegrationId || !webhookIntegrations.length) return;
    const integration = webhookIntegrations.find(i => String(i.id) === String(selectedIntegrationId));
    if (!integration) return;
    const platform = integration.platform?.toLowerCase();
    const events = PLATFORM_EVENT_OPTIONS[platform];
    if (events?.length > 0) setWebhookSelectedEvents([events[0].value]);
  }, [selectedIntegrationId]);

  // Start webhook stress test
  const handleStartWebhookTest = async () => {
    if (!selectedIntegrationId) {
      toast.error("Selecione uma integração");
      return;
    }
    if (!webhookSelectedEvents.length) {
      toast.error("Selecione pelo menos um tipo de evento");
      return;
    }
    const integration = webhookIntegrations.find(i => String(i.id) === String(selectedIntegrationId));
    if (!integration) {
      toast.error("Integração não encontrada");
      return;
    }

    const webhookUrl = `${WEBHOOK_BASE_URL}/api/webhooks/${integration.custom_slug || integration.id}`;
    const platform = integration.platform?.toLowerCase() || 'default';

    const eventQueue = webhookSendEach
      ? [...webhookSelectedEvents]
      : Array.from({ length: webhookCount }, () =>
          webhookSelectedEvents[Math.floor(Math.random() * webhookSelectedEvents.length)]
        );

    const total = eventQueue.length;
    webhookAbortRef.current = false;
    setIsWebhookRunning(true);
    setWebhookTestResults({ sent: 0, success: 0, failed: 0, total, log: [] });

    let sent = 0;
    let success = 0;
    let failed = 0;
    const log = [];
    const BATCH = Math.max(1, Math.min(webhookConcurrency, 20));

    for (let i = 0; i < total; i += BATCH) {
      if (webhookAbortRef.current) break;

      const batchPromises = [];
      for (let j = i; j < Math.min(i + BATCH, total); j++) {
        const chosenEvent = eventQueue[j];
        const payload = generateWebhookPayload(platform, chosenEvent, j);
        payload._zapvoice_stress_test = true;
        batchPromises.push(
          fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })
          .then(r => {
            sent++;
            if (r.ok || r.status === 200) {
              success++;
              log.push({ index: j + 1, status: r.status, ok: true, event: chosenEvent });
            } else {
              failed++;
              log.push({ index: j + 1, status: r.status, ok: false, event: chosenEvent });
            }
          })
          .catch(e => {
            sent++;
            failed++;
            log.push({ index: j + 1, status: 0, ok: false, event: chosenEvent, error: e.message });
          })
        );
      }

      await Promise.all(batchPromises);
      setWebhookTestResults({ sent, success, failed, total, log: [...log] });

      if (webhookDelayMs > 0 && i + BATCH < total) {
        await new Promise(r => setTimeout(r, webhookDelayMs));
      }
    }

    setIsWebhookRunning(false);
    if (!webhookAbortRef.current) {
      toast.success(`Teste concluído: ${success} OK / ${failed} falhas`);
    }
  };

  const handleCancelWebhookTest = () => {
    webhookAbortRef.current = true;
    setIsWebhookRunning(false);
    toast("Teste de webhook interrompido.");
  };

  return {
    webhookIntegrations,
    loadingWebhookIntegrations,
    selectedIntegrationId,
    setSelectedIntegrationId,
    webhookSelectedEvents,
    setWebhookSelectedEvents,
    webhookCount,
    setWebhookCount,
    webhookConcurrency,
    setWebhookConcurrency,
    webhookDelayMs,
    setWebhookDelayMs,
    webhookTestResults,
    setWebhookTestResults,
    isWebhookRunning,
    webhookSendEach,
    setWebhookSendEach,
    handleStartWebhookTest,
    handleCancelWebhookTest
  };
}
