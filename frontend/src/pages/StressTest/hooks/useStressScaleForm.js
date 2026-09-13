import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../../config';
import { fetchWithAuth } from '../../../AuthContext';
import { ALL_ERRORS, loadInitialSelectedErrors } from '../constants/stressErrors';

export function useStressScaleForm(activeClient, monitoring, onStartSuccess) {
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
  const [selectedErrors, setSelectedErrors] = useState(loadInitialSelectedErrors);

  // List of funnels
  const [funnels, setFunnels] = useState([]);
  const [loadingFunnels, setLoadingFunnels] = useState(false);

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

  // Start scale test
  const handleStartTest = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!activeClient) return;

    if (testType === 'funnel' && !funnelId) {
      toast.error("Por favor, selecione um funil para testar.");
      return;
    }
    if (testType === 'template' && !templateName.trim()) {
      toast.error("Por favor, informe o nome do template.");
      return;
    }

    monitoring.setIsSubmitting(true);
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
        toast.success(`Teste de escala #${data.trigger_id} iniciado!`, { id: loadingToast, duration: 3000 });
        monitoring.resetMonitoring(data.trigger_id);
        if (onStartSuccess) onStartSuccess(data);
      } else {
        toast.error("Erro ao iniciar teste.", { id: loadingToast });
      }
    } catch (err) {
      toast.error("Erro ao conectar no servidor.", { id: loadingToast });
    } finally {
      monitoring.setIsSubmitting(false);
    }
  };

  return {
    testType,
    setTestType,
    funnelId,
    setFunnelId,
    templateName,
    setTemplateName,
    numberOfContacts,
    setNumberOfContacts,
    delaySeconds,
    setDelaySeconds,
    concurrencyLimit,
    setConcurrencyLimit,
    simulateRateLimit,
    setSimulateRateLimit,
    pricingCategory,
    setPricingCategory,
    interactionFunnelId,
    setInteractionFunnelId,
    blockFunnelId,
    setBlockFunnelId,
    selectedErrors,
    setSelectedErrors,
    ALL_ERRORS,
    funnels,
    loadingFunnels,
    handleStartTest
  };
}
