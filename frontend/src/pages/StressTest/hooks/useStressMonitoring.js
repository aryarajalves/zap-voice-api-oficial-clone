import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../../config';
import { fetchWithAuth } from '../../../AuthContext';

export function useStressMonitoring(activeClient) {
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const monitoringInterval = useRef(null);

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

  const resetMonitoring = (newTriggerId) => {
    setTriggerDetails(null);
    setMessageStats(null);
    setRecentMessages([]);
    localStorage.removeItem('stress_test_trigger_details');
    localStorage.removeItem('stress_test_message_stats');
    localStorage.removeItem('stress_test_recent_messages');

    setActiveTriggerId(newTriggerId);
    localStorage.setItem('stress_test_active_trigger_id', newTriggerId);
  };

  return {
    activeTriggerId,
    setActiveTriggerId,
    triggerDetails,
    setTriggerDetails,
    messageStats,
    setMessageStats,
    recentMessages,
    setRecentMessages,
    isRunning,
    setIsRunning,
    isSubmitting,
    setIsSubmitting,
    handleCancelTest,
    resetMonitoring
  };
}
