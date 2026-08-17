import { useState, useEffect, useRef } from 'react';
import { API_URL, WEBHOOK_BASE_URL } from '../../../config';
import { fetchWithAuth, useAuth } from '../../../AuthContext';
import { useClient } from '../../../contexts/ClientContext';
import { toast } from 'react-hot-toast';

// Reexportação modular
export { PLATFORM_EVENT_OPTIONS } from '../constants/platformEventOptions';
export { generateWebhookPayload } from '../utils/payloadGenerators';

import { PLATFORM_EVENT_OPTIONS } from '../constants/platformEventOptions';
import { generateWebhookPayload } from '../utils/payloadGenerators';

export function useStressTest(onStartSuccess) {
  const { user } = useAuth();
  const { activeClient } = useClient();

  // Form inputs
  const [testType, setTestType] = useState(() => localStorage.getItem('stress_test_type') || 'funnel');
  const [funnelId, setFunnelId] = useState(() => localStorage.getItem('stress_test_funnel_id') || '');
  const [templateName, setTemplateName] = useState(() => localStorage.getItem('stress_test_template_name') || 'welcome_message');
  const [numberOfContacts, setNumberOfContacts] = useState(() => localStorage.getItem('stress_test_contacts') ? parseInt(localStorage.getItem('stress_test_contacts')) : 100);
  const [delaySeconds, setDelaySeconds] = useState(() => localStorage.getItem('stress_test_delay') ? parseInt(localStorage.getItem('stress_test_delay')) : 0);
  const [concurrencyLimit, setConcurrencyLimit] = useState(() => localStorage.getItem('stress_test_concurrency') ? parseInt(localStorage.getItem('stress_test_concurrency')) : 5);
  const [simulateRateLimit, setSimulateRateLimit] = useState(() => localStorage.getItem('stress_test_simulate_rl') === 'true');
  const [pricingCategory, setPricingCategory] = useState(() => localStorage.getItem('stress_test_pricing_category') || 'MARKETING');
  const [interactionFunnelId, setInteractionFunnelId] = useState('');
  const [blockFunnelId, setBlockFunnelId] = useState('');

  const ALL_ERRORS = [
    "(#132015) O template está temporariamente indisponível para uso porque foi pausado devido à baixa qualidade.",
    "Erro Meta 131049: Esta mensagem não foi entregue para manter o engajamento saudável do ecossistema.",
    "Erro Meta 131026: Mensagem não entregável",
    "(#2) Serviço temporariamente indisponível (Erro do Servidor da Meta)",
    "(#131000) Algo deu errado (Erro do Servidor da Meta)",
    "Lista de Exclusão (Bloqueado)"
  ];

  const [selectedErrors, setSelectedErrors] = useState(() => {
    const saved = localStorage.getItem('stress_test_selected_errors');
    if (!saved) return ALL_ERRORS;
    try {
      const parsed = JSON.parse(saved);
      return parsed.map(err => {
        if (err.includes("132015")) return ALL_ERRORS[0];
        if (err.includes("131049")) return ALL_ERRORS[1];
        if (err.includes("131026")) return ALL_ERRORS[2];
        if (err.includes("(#2)") || err.includes("Service temporarily")) return ALL_ERRORS[3];
        if (err.includes("131000") || err.includes("Something went wrong")) return ALL_ERRORS[4];
        return err;
      });
    } catch (e) {
      return ALL_ERRORS;
    }
  });

  // Contacts import test state
  const [contactsCount, setContactsCount] = useState(() => {
    const s = localStorage.getItem('stress_test_contacts_count');
    return s ? parseInt(s) : 500;
  });
  const [contactsTagCount, setContactsTagCount] = useState(() => {
    const s = localStorage.getItem('stress_test_contacts_tag_count');
    return s ? parseInt(s) : 3;
  });
  const [contactsImportResult, setContactsImportResult] = useState(null);
  const [isContactsRunning, setIsContactsRunning] = useState(false);

  // Webhook test state
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

  // List of funnels
  const [funnels, setFunnels] = useState([]);
  const [loadingFunnels, setLoadingFunnels] = useState(false);

  // Active test monitoring
  const [activeTriggerId, setActiveTriggerId] = useState(() => {
    const saved = localStorage.getItem('stress_test_active_trigger_id');
    return saved ? parseInt(saved) : null;
  });
  const [triggerDetails, setTriggerDetails] = useState(() => {
    const saved = localStorage.getItem('stress_test_trigger_details');
    return saved ? JSON.parse(saved) : null;
  });
  const [messageStats, setMessageStats] = useState(() => {
    const saved = localStorage.getItem('stress_test_message_stats');
    return saved ? JSON.parse(saved) : null;
  });
  const [recentMessages, setRecentMessages] = useState(() => {
    const saved = localStorage.getItem('stress_test_recent_messages');
    return saved ? JSON.parse(saved) : [];
  });
  const [isRunning, setIsRunning] = useState(false);

  const monitoringInterval = useRef(null);

  // Persist form inputs on change
  useEffect(() => {
    localStorage.setItem('stress_test_type', testType);
    localStorage.setItem('stress_test_funnel_id', funnelId);
    localStorage.setItem('stress_test_template_name', templateName);
    localStorage.setItem('stress_test_contacts', numberOfContacts.toString());
    localStorage.setItem('stress_test_delay', delaySeconds.toString());
    localStorage.setItem('stress_test_concurrency', concurrencyLimit.toString());
    localStorage.setItem('stress_test_simulate_rl', simulateRateLimit.toString());
    localStorage.setItem('stress_test_pricing_category', pricingCategory);
    localStorage.setItem('stress_test_selected_errors', JSON.stringify(selectedErrors));
  }, [testType, funnelId, templateName, numberOfContacts, delaySeconds, concurrencyLimit, simulateRateLimit, pricingCategory, selectedErrors]);

  useEffect(() => {
    localStorage.setItem('stress_test_contacts_count', contactsCount.toString());
    localStorage.setItem('stress_test_contacts_tag_count', contactsTagCount.toString());
  }, [contactsCount, contactsTagCount]);

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

    let sent = 0, success = 0, failed = 0;
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

  // Fetch active funnels
  useEffect(() => {
    const loadFunnels = async () => {
      if (!activeClient) return;
      setLoadingFunnels(true);
      try {
        const res = await fetchWithAuth(`${API_URL}/funnels`, {}, activeClient.id);
        if (res.ok) {
          const data = await res.json();
          setFunnels(data);
          if (data.length > 0 && !funnelId) {
            setFunnelId(data[0].id.toString());
          }
        }
      } catch (err) {
        console.error("Erro ao carregar funis:", err);
        toast.error("Não foi possível carregar os funis.");
      } finally {
        setLoadingFunnels(false);
      }
    };
    loadFunnels();
  }, [activeClient]);

  // Monitoring loop
  useEffect(() => {
    if (activeTriggerId && activeClient) {
      setIsRunning(true);
      const fetchMonitoringData = async () => {
        try {
          const resTrigger = await fetchWithAuth(`${API_URL}/triggers/${activeTriggerId}`, {}, activeClient.id);
          if (resTrigger.ok) {
            const triggerData = await resTrigger.json();
            setTriggerDetails(triggerData);
            localStorage.setItem('stress_test_trigger_details', JSON.stringify(triggerData));

            if (['completed', 'failed', 'cancelled'].includes(triggerData.status)) {
              setIsRunning(false);
              setActiveTriggerId(null);
              localStorage.removeItem('stress_test_active_trigger_id');
              if (monitoringInterval.current) clearInterval(monitoringInterval.current);
            }
          } else {
            setIsRunning(false);
            setActiveTriggerId(null);
            localStorage.removeItem('stress_test_active_trigger_id');
            if (monitoringInterval.current) clearInterval(monitoringInterval.current);
          }

          const resMessages = await fetchWithAuth(`${API_URL}/triggers/${activeTriggerId}/messages`, {}, activeClient.id);
          if (resMessages.ok) {
            const msgData = await resMessages.json();
            setMessageStats(msgData.counts);
            setRecentMessages(msgData.items.slice(0, 15));
            localStorage.setItem('stress_test_message_stats', JSON.stringify(msgData.counts));
            localStorage.setItem('stress_test_recent_messages', JSON.stringify(msgData.items.slice(0, 15)));
          }
        } catch (err) {
          console.error("Erro no monitoramento do teste de estresse:", err);
        }
      };

      fetchMonitoringData();
      monitoringInterval.current = setInterval(fetchMonitoringData, 2000);
    } else {
      setIsRunning(false);
    }

    return () => {
      if (monitoringInterval.current) clearInterval(monitoringInterval.current);
    };
  }, [activeTriggerId, activeClient]);

  // Start scale test
  const handleStartTest = async (e) => {
    e.preventDefault();
    if (!activeClient) return;

    if (testType === 'funnel' && !funnelId) {
      toast.error("Por favor, selecione um funil para testar.");
      return;
    }
    if (testType === 'template' && !templateName.trim()) {
      toast.error("Por favor, informe o nome do template.");
      return;
    }

    const loadingToast = toast.loading("Iniciando teste de escala...");
    try {
      const payload = {
        funnel_id: testType === 'funnel' ? parseInt(funnelId) : null,
        template_name: testType === 'template' ? templateName : null,
        number_of_contacts: parseInt(numberOfContacts),
        delay_seconds: parseInt(delaySeconds),
        concurrency_limit: parseInt(concurrencyLimit),
        pricing_category: pricingCategory,
        interaction_funnel_id: (testType === 'template' && interactionFunnelId) ? parseInt(interactionFunnelId) : null,
        block_funnel_id: (testType === 'template' && blockFunnelId) ? parseInt(blockFunnelId) : null,
        simulated_error_reasons: selectedErrors
      };

      const res = await fetchWithAuth(`${API_URL}/stress-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }, activeClient.id);

      if (res.ok) {
        const data = await res.json();
        toast.success("Teste iniciado!", { id: loadingToast, duration: 3000 });

        setTriggerDetails(null);
        setMessageStats(null);
        setRecentMessages([]);
        localStorage.removeItem('stress_test_trigger_details');
        localStorage.removeItem('stress_test_message_stats');
        localStorage.removeItem('stress_test_recent_messages');

        setActiveTriggerId(data.trigger_id);
        localStorage.setItem('stress_test_active_trigger_id', data.trigger_id);
      } else {
        toast.error("Erro ao iniciar teste.", { id: loadingToast });
      }
    } catch (err) {
      toast.error("Erro ao conectar no servidor.", { id: loadingToast });
    }
  };

  // Import fake contacts
  const handleStartContactsTest = async (e) => {
    e.preventDefault();
    if (!activeClient) return;
    if (contactsCount <= 0 || contactsCount > 50000) {
      toast.error("Informe entre 1 e 50.000 contatos.");
      return;
    }
    setIsContactsRunning(true);
    setContactsImportResult(null);
    const loadingToast = toast.loading(`Importando ${contactsCount.toLocaleString('pt-BR')} contatos fictícios...`);
    try {
      const res = await fetchWithAuth(`${API_URL}/stress-test/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number_of_contacts: parseInt(contactsCount),
          number_of_random_tags: parseInt(contactsTagCount),
        }),
      }, activeClient.id);
      if (res.ok) {
        const data = await res.json();
        setContactsImportResult({ imported: data.imported, test_tag: data.test_tag });
        toast.success(`${data.imported.toLocaleString('pt-BR')} contatos importados!`, { id: loadingToast, duration: 4000 });
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.detail || 'Erro ao importar contatos.', { id: loadingToast });
      }
    } catch (err) {
      toast.error('Erro de conexão.', { id: loadingToast });
    } finally {
      setIsContactsRunning(false);
    }
  };

  // Cancel test
  const handleCancelTest = async () => {
    if (!activeTriggerId || !activeClient) return;
    try {
      const res = await fetchWithAuth(`${API_URL}/triggers/${activeTriggerId}/cancel`, {
        method: 'POST'
      }, activeClient.id);

      if (res.ok) {
        toast.success("Teste cancelado com sucesso!");
        setIsRunning(false);
        setActiveTriggerId(null);
        localStorage.removeItem('stress_test_active_trigger_id');
      } else {
        toast.error("Erro ao cancelar teste.");
      }
    } catch (err) {
      toast.error("Erro ao conectar no servidor para cancelar.");
    }
  };

  return {
    user, activeClient,
    testType, setTestType, funnelId, setFunnelId, templateName, setTemplateName,
    numberOfContacts, setNumberOfContacts, delaySeconds, setDelaySeconds,
    concurrencyLimit, setConcurrencyLimit, simulateRateLimit, setSimulateRateLimit,
    pricingCategory, setPricingCategory, interactionFunnelId, setInteractionFunnelId,
    blockFunnelId, setBlockFunnelId, funnels, loadingFunnels,
    activeTriggerId, triggerDetails, messageStats, recentMessages, isRunning,
    handleStartTest, handleCancelTest, selectedErrors, setSelectedErrors, ALL_ERRORS,
    contactsCount, setContactsCount,
    contactsTagCount, setContactsTagCount,
    contactsImportResult, setContactsImportResult,
    isContactsRunning,
    handleStartContactsTest,
    webhookIntegrations, loadingWebhookIntegrations,
    selectedIntegrationId, setSelectedIntegrationId,
    webhookSelectedEvents, setWebhookSelectedEvents,
    webhookCount, setWebhookCount,
    webhookConcurrency, setWebhookConcurrency,
    webhookDelayMs, setWebhookDelayMs,
    webhookTestResults, setWebhookTestResults,
    isWebhookRunning,
    webhookSendEach, setWebhookSendEach,
    handleStartWebhookTest, handleCancelWebhookTest,
  };
}
