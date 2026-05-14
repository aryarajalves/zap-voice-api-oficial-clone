import { useState, useCallback } from 'react';
import { API_URL } from '../../../config';
import { fetchWithAuth } from '../../../AuthContext';
import { toast } from 'react-hot-toast';

export function useDispatchHistory(activeClient) {
  const [dispatchHistory, setDispatchHistory] = useState([]);
  const [loadingDispatchHistory, setLoadingDispatchHistory] = useState(false);
  const [isPlaying, setIsPlaying] = useState({});
  const [isCancelling, setIsCancelling] = useState({});
  const [dispatchSearch, setDispatchSearch] = useState('');
  const [dispatchEventFilter, setDispatchEventFilter] = useState('');
  const [dispatchTypeFilter, setDispatchTypeFilter] = useState('');
  const [dispatchStartDate, setDispatchStartDate] = useState('');
  const [dispatchEndDate, setDispatchEndDate] = useState('');
  const [dispatchPage, setDispatchPage] = useState(1);
  const [dispatchLimit, setDispatchLimit] = useState(20);
  const [dispatchTotal, setDispatchTotal] = useState(0);
  const [selectedDispatchIds, setSelectedDispatchIds] = useState([]);
  const [isBackfillingCosts, setIsBackfillingCosts] = useState(false);
  const [isBulkPlayingDispatches, setIsBulkPlayingDispatches] = useState(false);
  const [contactsModal, setContactsModal] = useState({ isOpen: false, triggerId: null, contacts: [], counts: {}, title: '' });
  const [contactsFilter, setContactsFilter] = useState('all');
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [childrenModal, setChildrenModal] = useState({ isOpen: false, triggerId: null, triggerName: '', children: [], isLoading: false });

  const fetchDispatches = useCallback(async (integrationId, page = 1, limit = 20, search = '', event = '', start = '', end = '', type = '', isSilent = false) => {
    if (!activeClient || !integrationId) return;
    if (!isSilent) setLoadingDispatchHistory(true);
    try {
      const res = await fetchWithAuth(
        `${API_URL}/webhook-integrations/${integrationId}/dispatches?page=${page}&limit=${limit}&search=${search}&event_type=${event}&start_date=${start}&end_date=${end}&type=${type}`,
        {},
        activeClient.id
      );
      if (res.ok) {
        const data = await res.json();
        setDispatchHistory(data.items || []);
        setDispatchTotal(data.total || 0);
      }
    } catch (err) {
      console.error(err);
      if (!isSilent) toast.error('Erro ao carregar fila de disparos');
    } finally {
      if (!isSilent) setLoadingDispatchHistory(false);
    }
  }, [activeClient]);

  const handlePlayDispatch = async (dispatchId, integrationId) => {
    setIsPlaying(prev => ({ ...prev, [dispatchId]: true }));
    try {
      const res = await fetchWithAuth(`${API_URL}/webhook-integrations/${integrationId}/dispatches/${dispatchId}/play`, { method: 'POST' }, activeClient.id);
      if (res.ok) {
        toast.success('Disparo iniciado manualmente');
        fetchDispatches(integrationId, dispatchPage, dispatchLimit, dispatchSearch, dispatchEventFilter, dispatchStartDate, dispatchEndDate, dispatchTypeFilter, true);
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao processar disparo');
    } finally {
      setIsPlaying(prev => ({ ...prev, [dispatchId]: false }));
    }
  };

  const handleDeleteDispatch = async (integrationId, type, id = null, ids = []) => {
    try {
      let url = `${API_URL}/webhook-integrations/${integrationId}/dispatches`;
      if (type === 'single') url += `/${id}`;
      else if (type === 'bulk') url += `/bulk-delete`;

      const res = await fetchWithAuth(url, {
        method: 'DELETE',
        body: type === 'bulk' ? JSON.stringify({ ids }) : undefined
      }, activeClient.id);

      if (res.ok) {
        toast.success('Registros removidos');
        if (type === 'bulk') setSelectedDispatchIds([]);
        fetchDispatches(integrationId, dispatchPage, dispatchLimit, dispatchSearch, dispatchEventFilter, dispatchStartDate, dispatchEndDate, dispatchTypeFilter);
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao remover registros');
    }
  };

  const handleBulkDispatchPlay = async (integrationId) => {
    if (selectedDispatchIds.length === 0) return;
    setIsBulkPlayingDispatches(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/webhook-integrations/${integrationId}/dispatches/bulk-play`, {
        method: 'POST',
        body: JSON.stringify({ ids: selectedDispatchIds })
      }, activeClient.id);
      if (res.ok) {
        toast.success('Processamento em massa iniciado');
        setSelectedDispatchIds([]);
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao iniciar processamento');
    } finally {
      setIsBulkPlayingDispatches(false);
    }
  };

  const handleBackfillCosts = async (integrationId) => {
    setIsBackfillingCosts(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/webhook-integrations/${integrationId}/dispatches/backfill-costs`, { method: 'POST' }, activeClient.id);
      if (res.ok) {
        toast.success('Custos recalculados com sucesso');
        fetchDispatches(integrationId, dispatchPage, dispatchLimit, dispatchSearch, dispatchEventFilter, dispatchStartDate, dispatchEndDate, dispatchTypeFilter, true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsBackfillingCosts(false);
    }
  };

  const fetchDispatchContacts = async (triggerId) => {
    setLoadingContacts(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/webhook-integrations/dispatches/${triggerId}/contacts?filter=${contactsFilter}`, {}, activeClient.id);
      if (res.ok) {
        const data = await res.json();
        setContactsModal(prev => ({ ...prev, contacts: data.contacts, counts: data.counts }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingContacts(false);
    }
  };
  
  const fetchChildren = useCallback(async (trigger) => {
    setChildrenModal({ isOpen: true, triggerId: trigger.id, triggerName: trigger.template_name || trigger.funnel?.name || 'Disparo', children: [], isLoading: true });
    try {
      const res = await fetchWithAuth(`${API_URL}/triggers/${trigger.id}/children`, {}, activeClient?.id);
      if (res.ok) {
        const data = await res.json();
        setChildrenModal(prev => ({ ...prev, children: data, isLoading: false }));
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(`Erro ${res.status}: ${errorData.detail || "Falha ao buscar funis iniciados"}`);
        setChildrenModal(prev => ({ ...prev, isLoading: false }));
      }
    } catch (err) {
      toast.error("Erro de conexão ao buscar funis iniciados");
      setChildrenModal(prev => ({ ...prev, isLoading: false }));
    }
  }, [activeClient]);

  return {
    dispatchHistory,
    setDispatchHistory,
    loadingDispatchHistory,
    isPlaying,
    isCancelling,
    dispatchSearch,
    setDispatchSearch,
    dispatchEventFilter,
    setDispatchEventFilter,
    dispatchTypeFilter,
    setDispatchTypeFilter,
    dispatchStartDate,
    setDispatchStartDate,
    dispatchEndDate,
    setDispatchEndDate,
    dispatchPage,
    setDispatchPage,
    dispatchLimit,
    setDispatchLimit,
    dispatchTotal,
    selectedDispatchIds,
    setSelectedDispatchIds,
    isBackfillingCosts,
    isBulkPlayingDispatches,
    contactsModal,
    setContactsModal,
    contactsFilter,
    setContactsFilter,
    loadingContacts,
    childrenModal,
    setChildrenModal,
    fetchDispatches,
    handlePlayDispatch,
    handleDeleteDispatch,
    handleBulkDispatchPlay,
    handleBackfillCosts,
    fetchDispatchContacts,
    fetchChildren
  };
}
