import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { API_URL } from '../../../config';
import { useClient } from '../../../contexts/ClientContext';

export function useEmailHistory() {
  const { activeClient } = useClient();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  // State para confirmação de deleção
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // --- Filtros ---
  const [filterSearch, setFilterSearch] = useState('');   // por nome de campanha / assunto
  const [filterStatus, setFilterStatus] = useState('');   // '' = todos
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Client-ID': activeClient?.id ? String(activeClient.id) : ''
    };
  };

  const fetchHistory = async () => {
    if (!activeClient) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/email/history?limit=500`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setHistory(data || []);
        setCurrentPage(1);
      }
    } catch (err) {
      console.error("Erro ao carregar histórico de e-mails:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [activeClient]);

  // WebSocket Realtime Sync
  useEffect(() => {
    if (!activeClient) return;

    let ws = null;
    try {
      const token = localStorage.getItem('token');
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname;
      const port = '8000';
      const wsUrl = `${wsProtocol}//${host}:${port}/ws?token=${token}`;

      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'email_dispatch_updated' && message.data) {
            const data = message.data;
            if (activeClient?.id && data.client_id && String(data.client_id) !== String(activeClient.id)) {
              return;
            }

            setHistory(prevHistory => {
              const exists = prevHistory.some(item => item.id === data.dispatch_id);
              if (exists) {
                return prevHistory.map(item => {
                  if (item.id === data.dispatch_id) {
                    return {
                      ...item,
                      status: data.status,
                      total_sent: data.total_sent !== undefined ? data.total_sent : item.total_sent,
                      total_failed: data.total_failed !== undefined ? data.total_failed : item.total_failed,
                      failure_reason: data.failure_reason || item.failure_reason
                    };
                  }
                  return item;
                });
              } else {
                fetchHistory();
                return prevHistory;
              }
            });
          }
        } catch (e) {
          console.error("Erro ao processar evento WS no histórico de e-mails:", e);
        }
      };
    } catch (err) {
      console.error("Erro ao conectar no WebSocket do histórico de e-mails:", err);
    }

    return () => {
      if (ws) ws.close();
    };
  }, [activeClient]);

  const handleDeleteDispatch = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      const res = await fetch(`${API_URL}/email/history/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });

      if (res.ok) {
        toast.success("Registro de disparo deletado com sucesso!");
        setHistory(prev => prev.filter(item => item.id !== deleteTarget.id));
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.detail || "Erro ao deletar registro.");
      }
    } catch (err) {
      console.error("Erro ao excluir disparo:", err);
      toast.error("Falha ao comunicar com o servidor.");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  // Filtros aplicados
  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      if (filterStatus && item.status !== filterStatus) return false;

      if (filterSearch.trim()) {
        const q = filterSearch.trim().toLowerCase();
        const inTitle = (item.title || '').toLowerCase().includes(q);
        const inSubject = (item.subject || '').toLowerCase().includes(q);
        const inTag = (item.tag_name || '').toLowerCase().includes(q);
        if (!inTitle && !inSubject && !inTag) return false;
      }

      if (filterDateFrom || filterDateTo) {
        let str = String(item.created_at || '');
        if (!str.endsWith('Z') && !str.includes('+') && !/-\d{2}:\d{2}$/.test(str)) str += 'Z';
        const itemDate = new Date(str);

        if (filterDateFrom) {
          const fromDate = new Date(filterDateFrom + 'T00:00:00-03:00');
          if (itemDate < fromDate) return false;
        }
        if (filterDateTo) {
          const toDate = new Date(filterDateTo + 'T23:59:59-03:00');
          if (itemDate > toDate) return false;
        }
      }

      return true;
    });
  }, [history, filterStatus, filterSearch, filterDateFrom, filterDateTo]);

  const hasFilters = Boolean(filterSearch || filterStatus || filterDateFrom || filterDateTo);

  const clearFilters = () => {
    setFilterSearch('');
    setFilterStatus('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setCurrentPage(1);
  };

  // Resetar para página 1 quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [filterSearch, filterStatus, filterDateFrom, filterDateTo]);

  const totalPages = Math.ceil(filteredHistory.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredHistory.length);
  const currentHistory = filteredHistory.slice(startIndex, endIndex);

  return {
    history,
    loading,
    fetchHistory,
    pageSize,
    setPageSize,
    currentPage,
    setCurrentPage,
    deleteTarget,
    setDeleteTarget,
    deleting,
    handleDeleteDispatch,
    filterSearch,
    setFilterSearch,
    filterStatus,
    setFilterStatus,
    filterDateFrom,
    setFilterDateFrom,
    filterDateTo,
    setFilterDateTo,
    filteredHistory,
    hasFilters,
    clearFilters,
    totalPages,
    startIndex,
    endIndex,
    currentHistory
  };
}
