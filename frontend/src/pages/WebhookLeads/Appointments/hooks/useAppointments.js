import { useState, useEffect, useCallback } from 'react';
import { useClient } from '../../../../contexts/ClientContext';
import { fetchWithAuth } from '../../../../AuthContext';
import { API_URL } from '../../../../config';
import { toast } from 'react-hot-toast';

export function useAppointments() {
  const { activeClient } = useClient();
  const [appointments, setAppointments] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // '' | 'pending' | 'occurred'
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(20);
  const [now, setNow] = useState(new Date());
  const [retryingIds, setRetryingIds] = useState({});

  const handleRetryReminder = async (leadId) => {
    if (!activeClient?.id) return;
    setRetryingIds(prev => ({ ...prev, [leadId]: true }));
    const loadingToast = toast.loading("Re-disparando lembrete...");
    try {
      const res = await fetchWithAuth(`${API_URL}/reminders/leads/${leadId}/retry`, {
        method: 'POST'
      }, activeClient.id);
      if (res.ok) {
        toast.success("Lembrete re-disparado com sucesso!", { id: loadingToast });
        fetchAppointments();
      } else {
        const err = await res.json();
        toast.error(err.detail || "Falha ao re-disparar lembrete.", { id: loadingToast });
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro de conexão ao re-disparar.", { id: loadingToast });
    } finally {
      setRetryingIds(prev => ({ ...prev, [leadId]: false }));
    }
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch scheduled leads
  const fetchAppointments = useCallback(async () => {
    if (!activeClient?.id) return;
    setLoading(true);
    try {
      let url = `${API_URL}/leads?skip=${page * limit}&limit=${limit}&has_appointment=true`;
      if (debouncedSearch) {
        url += `&search=${encodeURIComponent(debouncedSearch)}`;
      }
      if (statusFilter) {
        url += `&appointment_status=${statusFilter}`;
      }
      if (dateFrom) {
        url += `&date_from=${dateFrom}`;
      }
      if (dateTo) {
        url += `&date_to=${dateTo}`;
      }
      const res = await fetchWithAuth(url, {}, activeClient.id);
      if (res.ok) {
        const data = await res.json();
        setAppointments(data.items || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error("Erro ao carregar agendamentos:", err);
      toast.error("Erro ao carregar agendamentos.");
    } finally {
      setLoading(false);
    }
  }, [activeClient?.id, page, limit, debouncedSearch, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Real-time ticking for countdowns
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleClearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(0);
  };

  const totalPages = Math.ceil(total / limit);

  return {
    appointments,
    total,
    loading,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    page,
    setPage,
    limit,
    setLimit,
    now,
    retryingIds,
    handleRetryReminder,
    handleClearFilters,
    fetchAppointments,
    totalPages,
  };
}
