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
  const [dispatchStatusFilter, setDispatchStatusFilter] = useState('');
  const [dispatchTemplateFilter, setDispatchTemplateFilter] = useState('');
  const [distinctTemplates, setDistinctTemplates] = useState([]);
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
  const [dispatchStats, setDispatchStats] = useState(null);
  const [isBlocking, setIsBlocking] = useState({});
  const [isBulkBlocking, setIsBulkBlocking] = useState(false);

  const fetchDispatches = useCallback(async (integrationId, page = 1, limit = 20, search = '', event = '', start = '', end = '', type = '', template = '', status = '', isSilent = false) => {
    if (!activeClient || !integrationId) return;
    if (!isSilent) setLoadingDispatchHistory(true);
    try {
      const res = await fetchWithAuth(
        `${API_URL}/webhook-integrations/${integrationId}/dispatches?page=${page}&limit=${limit}&search=${search}&event_type=${event}&start_date=${start}&end_date=${end}&type=${type}&template_filter=${template}&status=${status}`,
        {},
        activeClient.id
      );
      if (res.ok) {
        const data = await res.json();
        setDispatchHistory(data.items || []);
        setDispatchTotal(data.total || 0);
        setDispatchStats(data.stats || null);
        setDistinctTemplates(data.distinct_templates || []);
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
        fetchDispatches(integrationId, dispatchPage, dispatchLimit, dispatchSearch, dispatchEventFilter, dispatchStartDate, dispatchEndDate, dispatchTypeFilter, dispatchTemplateFilter, dispatchStatusFilter, true);
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
      let method = 'DELETE';
      if (type === 'single') {
        url += `/${id}`;
      } else if (type === 'bulk') {
        url += `/bulk-delete`;
        method = 'POST';
      }

      const res = await fetchWithAuth(url, {
        method,
        body: type === 'bulk' ? JSON.stringify({ ids }) : undefined
      }, activeClient.id);

      if (res.ok) {
        toast.success(type === 'bulk' ? 'Disparos removidos com sucesso' : 'Disparo removido com sucesso');
        if (type === 'bulk') setSelectedDispatchIds([]);
        fetchDispatches(integrationId, dispatchPage, dispatchLimit, dispatchSearch, dispatchEventFilter, dispatchStartDate, dispatchEndDate, dispatchTypeFilter, dispatchTemplateFilter, dispatchStatusFilter);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.detail || 'Erro ao remover registro');
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
        fetchDispatches(integrationId, dispatchPage, dispatchLimit, dispatchSearch, dispatchEventFilter, dispatchStartDate, dispatchEndDate, dispatchTypeFilter, dispatchTemplateFilter, dispatchStatusFilter, true);
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

  const handleBlockDispatchContact = async (item) => {
    if (!item?.contact_phone) {
      toast.error('Telefone do contato inválido');
      return;
    }
    const cleanPhone = String(item.contact_phone).replace(/\D/g, '');
    setIsBlocking(prev => ({ ...prev, [item.id]: true }));
    try {
      const reason = item.failure_reason 
        ? `Falha no disparo (${item.failure_reason.slice(0, 100)})` 
        : 'Bloqueado após falha no disparo';

      const res = await fetchWithAuth(`${API_URL}/blocked/`, {
        method: 'POST',
        body: JSON.stringify({
          phone: cleanPhone,
          name: item.contact_name || cleanPhone,
          reason: reason
        })
      }, activeClient?.id);

      if (res.ok) {
        toast.success(`Contato ${item.contact_name || cleanPhone} bloqueado na Blacklist!`);
        setDispatchHistory(prev => prev.map(d => {
          const dPhone = String(d.contact_phone || '').replace(/\D/g, '');
          if (dPhone === cleanPhone || (cleanPhone.length >= 8 && dPhone.endsWith(cleanPhone.slice(-8)))) {
            return { ...d, is_contact_blocked: true };
          }
          return d;
        }));
      } else {
        const errorData = await res.json().catch(() => ({}));
        if (errorData.detail && errorData.detail.includes('já está bloqueado')) {
          toast.success('Contato já estava na lista de bloqueados.');
          setDispatchHistory(prev => prev.map(d => {
            const dPhone = String(d.contact_phone || '').replace(/\D/g, '');
            if (dPhone === cleanPhone || (cleanPhone.length >= 8 && dPhone.endsWith(cleanPhone.slice(-8)))) {
              return { ...d, is_contact_blocked: true };
            }
            return d;
          }));
        } else {
          toast.error(errorData.detail || 'Erro ao bloquear contato');
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão ao bloquear contato');
    } finally {
      setIsBlocking(prev => ({ ...prev, [item.id]: false }));
    }
  };

  const handleBulkBlockDispatchContacts = async () => {
    if (selectedDispatchIds.length === 0) return;
    setIsBulkBlocking(true);
    try {
      const selectedItems = dispatchHistory.filter(d => selectedDispatchIds.includes(d.id));
      const contactsToBlock = selectedItems
        .filter(d => d.contact_phone)
        .map(d => {
          const clean = String(d.contact_phone).replace(/\D/g, '');
          return {
            phone: clean,
            name: d.contact_name || clean,
            reason: d.failure_reason ? `Falha no disparo (${d.failure_reason.slice(0, 100)})` : 'Bloqueado após falha no disparo'
          };
        });

      if (contactsToBlock.length === 0) {
        toast.error('Nenhum contato válido para bloquear');
        setIsBulkBlocking(false);
        return;
      }

      const res = await fetchWithAuth(`${API_URL}/blocked/block_bulk`, {
        method: 'POST',
        body: JSON.stringify({ contacts: contactsToBlock })
      }, activeClient?.id);

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.success(`${data.success_count || contactsToBlock.length} contato(s) adicionado(s) à Blacklist!`);
        const blockedPhoneSet = new Set(contactsToBlock.map(c => c.phone.slice(-8)));
        setDispatchHistory(prev => prev.map(d => {
          const dPhone = String(d.contact_phone || '').replace(/\D/g, '');
          if (blockedPhoneSet.has(dPhone.slice(-8))) {
            return { ...d, is_contact_blocked: true };
          }
          return d;
        }));
        setSelectedDispatchIds([]);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.detail || 'Erro ao bloquear contatos selecionados');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão ao bloquear contatos');
    } finally {
      setIsBulkBlocking(false);
    }
  };

  const handleUnblockDispatchContact = async (item) => {
    if (!item?.contact_phone) {
      toast.error('Telefone do contato não encontrado');
      return;
    }
    const cleanPhone = String(item.contact_phone).replace(/\D/g, '');
    setIsBlocking(prev => ({ ...prev, [item.id]: true }));
    try {
      const res = await fetchWithAuth(`${API_URL}/blocked/by_phone/${cleanPhone}`, {
        method: 'DELETE'
      }, activeClient?.id);

      if (res.ok || res.status === 204) {
        toast.success(`Contato ${item.contact_name || cleanPhone} desbloqueado com sucesso!`);
        setDispatchHistory(prev => prev.map(d => {
          const dPhone = String(d.contact_phone || '').replace(/\D/g, '');
          if (dPhone === cleanPhone || (cleanPhone.length >= 8 && dPhone.endsWith(cleanPhone.slice(-8)))) {
            return { ...d, is_contact_blocked: false };
          }
          return d;
        }));
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.detail || 'Erro ao desbloquear contato');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão ao desbloquear contato');
    } finally {
      setIsBlocking(prev => ({ ...prev, [item.id]: false }));
    }
  };

  return {
    dispatchHistory,
    setDispatchHistory,
    loadingDispatchHistory,
    dispatchStats,
    isPlaying,
    isCancelling,
    dispatchSearch,
    setDispatchSearch,
    dispatchEventFilter,
    setDispatchEventFilter,
    dispatchTypeFilter,
    setDispatchTypeFilter,
    dispatchStatusFilter,
    setDispatchStatusFilter,
    dispatchTemplateFilter,
    setDispatchTemplateFilter,
    distinctTemplates,
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
    fetchChildren,
    handleBlockDispatchContact,
    handleUnblockDispatchContact,
    isBlocking,
    handleBulkBlockDispatchContacts,
    isBulkBlocking
  };
}
