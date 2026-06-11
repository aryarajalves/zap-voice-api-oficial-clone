import { useState, useEffect, useRef } from 'react';
import { API_URL } from '../../../config';
import { fetchWithAuth } from '../../../AuthContext';
import { useAuth } from '../../../AuthContext';
import { useClient } from '../../../contexts/ClientContext';
import { toast } from 'react-hot-toast';

export function useStressTest() {
  const { user } = useAuth();
  const { activeClient } = useClient();

  // Form inputs
  const [testType, setTestType] = useState(() => localStorage.getItem('stress_test_type') || 'funnel'); // 'funnel' | 'template'
  const [funnelId, setFunnelId] = useState(() => localStorage.getItem('stress_test_funnel_id') || '');
  const [templateName, setTemplateName] = useState(() => localStorage.getItem('stress_test_template_name') || 'welcome_message');
  const [numberOfContacts, setNumberOfContacts] = useState(() => localStorage.getItem('stress_test_contacts') ? parseInt(localStorage.getItem('stress_test_contacts')) : 100);
  const [delaySeconds, setDelaySeconds] = useState(() => localStorage.getItem('stress_test_delay') ? parseInt(localStorage.getItem('stress_test_delay')) : 0);
  const [concurrencyLimit, setConcurrencyLimit] = useState(() => localStorage.getItem('stress_test_concurrency') ? parseInt(localStorage.getItem('stress_test_concurrency')) : 5);
  const [simulateRateLimit, setSimulateRateLimit] = useState(() => localStorage.getItem('stress_test_simulate_rl') === 'true');
  const [pricingCategory, setPricingCategory] = useState(() => localStorage.getItem('stress_test_pricing_category') || 'marketing'); // 'marketing' | 'utility'
  const [interactionFunnelId, setInteractionFunnelId] = useState(() => localStorage.getItem('stress_test_interaction_funnel_id') || '');
  const [blockFunnelId, setBlockFunnelId] = useState(() => localStorage.getItem('stress_test_block_funnel_id') || '');

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

  // Reference for intervals
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
      localStorage.setItem('stress_test_interaction_funnel_id', interactionFunnelId);
      localStorage.setItem('stress_test_block_funnel_id', blockFunnelId);
      localStorage.setItem('stress_test_selected_errors', JSON.stringify(selectedErrors));
  }, [testType, funnelId, templateName, numberOfContacts, delaySeconds, concurrencyLimit, simulateRateLimit, pricingCategory, interactionFunnelId, blockFunnelId, selectedErrors]);

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

  // Handle monitoring loop
  useEffect(() => {
      if (activeTriggerId && activeClient) {
          setIsRunning(true);
          const fetchMonitoringData = async () => {
              try {
                  // 1. Get trigger status
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

                  // 2. Get message status list and counts
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

  // Start stress test
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
              
              setTriggerDetails(null);
              setMessageStats(null);
              setRecentMessages([]);
              localStorage.removeItem('stress_test_trigger_details');
              localStorage.removeItem('stress_test_message_stats');
              localStorage.removeItem('stress_test_recent_messages');

              setActiveTriggerId(data.trigger_id);
              localStorage.setItem('stress_test_active_trigger_id', data.trigger_id.toString());
              toast.dismiss(loadingToast);
              toast.success("Teste de escala iniciado com sucesso!");
          } else {
              const errData = await res.json();
              throw new Error(errData.detail || "Erro ao iniciar stress test");
          }
      } catch (err) {
          console.error(err);
          toast.dismiss(loadingToast);
          toast.error(`Falha ao iniciar teste: ${err.message}`);
      }
  };

  // Cancel active test
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
    handleStartTest, handleCancelTest, selectedErrors, setSelectedErrors, ALL_ERRORS
  };
}
