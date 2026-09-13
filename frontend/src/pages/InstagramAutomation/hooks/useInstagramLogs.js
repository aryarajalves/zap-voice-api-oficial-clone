import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../../config';
import { fetchWithAuth } from '../../../AuthContext';

export default function useInstagramLogs(activeClient) {
  const [activeTab, setActiveTab] = useState('rules');
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotalPages, setLogsTotalPages] = useState(1);
  const [logsTotalItems, setLogsTotalItems] = useState(0);
  const [logsStatusFilter, setLogsStatusFilter] = useState(null);

  const fetchLogs = useCallback(async () => {
    if (!activeClient) return;
    setLogsLoading(true);
    try {
      let url = `${API_URL}/instagram/logs?page=${logsPage}&limit=10`;
      if (logsStatusFilter) url += `&status=${logsStatusFilter}`;
      const res = await fetchWithAuth(url, {}, activeClient.id);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setLogsTotalPages(data.pages || 1);
        setLogsTotalItems(data.total || 0);
      }
    } catch (err) {
      console.error("Erro ao buscar logs do Instagram:", err);
      toast.error("Erro ao carregar histórico.");
    } finally {
      setLogsLoading(false);
    }
  }, [activeClient, logsPage, logsStatusFilter]);

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs();
    }
  }, [activeClient, activeTab, logsPage, logsStatusFilter, fetchLogs]);

  return {
    activeTab,
    setActiveTab,
    logs,
    setLogs,
    logsLoading,
    logsPage,
    setLogsPage,
    logsTotalPages,
    logsTotalItems,
    logsStatusFilter,
    setLogsStatusFilter,
    fetchLogs
  };
}
