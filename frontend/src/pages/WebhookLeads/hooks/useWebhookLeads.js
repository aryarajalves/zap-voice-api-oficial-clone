import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../../config';
import { fetchWithAuth } from '../../../AuthContext';

/**
 * Calcula date_from e date_to (string YYYY-MM-DD) com base em um preset de período.
 * @param {string} preset - 'custom' | 'last7' | 'last14' | 'last30' | 'this_month' | 'last_month' | 'YYYY-MM' (mês específico)
 * @param {string} customFrom - Usado quando preset === 'custom'
 * @param {string} customTo   - Usado quando preset === 'custom'
 */
function resolveDateRange(preset, customFrom, customTo) {
  if (!preset || preset === '') return { from: null, to: null };

  const today = new Date();
  const fmt = (d) => d.toISOString().split('T')[0];

  if (preset === 'custom') {
    return { from: customFrom || null, to: customTo || null };
  }

  if (preset === 'last7') {
    const from = new Date(today);
    from.setDate(from.getDate() - 6);
    return { from: fmt(from), to: fmt(today) };
  }

  if (preset === 'last14') {
    const from = new Date(today);
    from.setDate(from.getDate() - 13);
    return { from: fmt(from), to: fmt(today) };
  }

  if (preset === 'last30') {
    const from = new Date(today);
    from.setDate(from.getDate() - 29);
    return { from: fmt(from), to: fmt(today) };
  }

  if (preset === 'this_month') {
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: fmt(from), to: fmt(today) };
  }

  if (preset === 'last_month') {
    const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    return { from: fmt(firstDayLastMonth), to: fmt(lastDayLastMonth) };
  }

  // Formato YYYY-MM para mês específico
  if (/^\d{4}-\d{2}$/.test(preset)) {
    const [year, month] = preset.split('-').map(Number);
    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 0); // último dia do mês
    return { from: fmt(from), to: fmt(to) };
  }

  return { from: null, to: null };
}

export function useWebhookLeads(activeClient) {
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(20);
  
  // Filtros base
  const [search, setSearch] = useState('');
  const [eventType, setEventType] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [availableFilters, setAvailableFilters] = useState({ event_types: [], product_names: [], tags: [] });

  // Filtros de data
  const [datePreset, setDatePreset] = useState(''); // 'last7', 'last14', 'last30', 'this_month', 'last_month', 'custom', ou YYYY-MM
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');

  // Selection & Deletion
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Edit Lead
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [leadToEdit, setLeadToEdit] = useState(null);

  // Clean corrupted tags
  const [isCleaningTags, setIsCleaningTags] = useState(false);
  const [isCleanConfirmOpen, setIsCleanConfirmOpen] = useState(false);

  const fetchLeads = useCallback(async (overrides = {}) => {
    if (!activeClient?.id) return;
    
    const currentSearch = overrides.search !== undefined ? overrides.search : search;
    const currentEventType = overrides.eventType !== undefined ? overrides.eventType : eventType;
    const currentTag = overrides.tag !== undefined ? overrides.tag : selectedTag;
    const currentPage = overrides.page !== undefined ? overrides.page : page;
    const currentDatePreset = overrides.datePreset !== undefined ? overrides.datePreset : datePreset;
    const currentCustomFrom = overrides.customDateFrom !== undefined ? overrides.customDateFrom : customDateFrom;
    const currentCustomTo = overrides.customDateTo !== undefined ? overrides.customDateTo : customDateTo;

    const { from, to } = resolveDateRange(currentDatePreset, currentCustomFrom, currentCustomTo);

    setLoading(true);
    try {
      let url = `${API_URL}/leads?skip=${currentPage * limit}&limit=${limit}`;
      if (currentSearch) url += `&search=${encodeURIComponent(currentSearch)}`;
      if (currentEventType) url += `&event_type=${encodeURIComponent(currentEventType)}`;
      if (currentTag) url += `&tag=${encodeURIComponent(currentTag)}`;
      if (from) url += `&date_from=${from}`;
      if (to) url += `&date_to=${to}`;

      const res = await fetchWithAuth(url, {}, activeClient.id);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.items || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar leads.");
    } finally {
      setLoading(false);
    }
  }, [activeClient?.id, limit, search, eventType, selectedTag, page, datePreset, customDateFrom, customDateTo]);

  const fetchFilters = useCallback(async () => {
    if (!activeClient?.id) return;
    try {
      const res = await fetchWithAuth(`${API_URL}/leads/filters`, {}, activeClient.id);
      if (res.ok) {
        const data = await res.json();
        setAvailableFilters(data);
      }
    } catch (err) {
      console.error(err);
    }
  }, [activeClient?.id]);

  // Efeito para filtros instantâneos
  useEffect(() => {
    if (activeClient?.id) {
      fetchLeads();
      fetchFilters();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeClient?.id, page, eventType, selectedTag, limit, datePreset, customDateFrom, customDateTo]);

  const lastSearch = useRef('');

  // Efeito exclusivo para Busca com Debounce
  useEffect(() => {
    if (search === lastSearch.current) return;
    
    const timer = setTimeout(() => {
      lastSearch.current = search;
      if (activeClient?.id) fetchLeads({ search });
    }, 600); 

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, activeClient?.id]);

  const handleCleanTags = async () => {
    if (!activeClient) return;
    setIsCleaningTags(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/leads/clean-corrupted-tags`, { method: 'POST' }, activeClient.id);
      if (res.ok) {
        const data = await res.json();
        toast.success(data.message);
        fetchLeads();
        fetchFilters();
      } else {
        toast.error('Erro ao limpar etiquetas.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao limpar etiquetas.');
    } finally {
      setIsCleaningTags(false);
      setIsCleanConfirmOpen(false);
    }
  };

  const handleExport = async () => {
    if (!activeClient || total === 0) {
      toast.error("Não há dados para exportar ainda.");
      return;
    }
    try {
      const { from, to } = resolveDateRange(datePreset, customDateFrom, customDateTo);
      let url = `${API_URL}/leads/export?`;

      if (selectedLeads.length > 0) {
        url += `ids=${selectedLeads.join(',')}&`;
      } else {
        if (search) url += `search=${encodeURIComponent(search)}&`;
        if (eventType) url += `event_type=${encodeURIComponent(eventType)}&`;
        if (selectedTag) url += `tag=${encodeURIComponent(selectedTag)}&`;
        if (from) url += `date_from=${from}&`;
        if (to) url += `date_to=${to}&`;
      }

      const response = await fetchWithAuth(url, {}, activeClient.id);
      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        const filename = selectedLeads.length > 0
          ? `leads_selecionados_${new Date().toISOString().split('T')[0]}.csv`
          : `leads_${new Date().toISOString().split('T')[0]}.csv`;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success("Exportação concluída!");
      } else {
        throw new Error("Erro na exportação");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao exportar leads.");
    }
  };

  const executeDelete = async () => {
    if (!activeClient) return;
    setIsDeleting(true);
    try {
      if (leadToDelete === 'bulk') {
        const res = await fetchWithAuth(`${API_URL}/leads/bulk-delete`, {
          method: 'POST',
          body: JSON.stringify({ lead_ids: selectedLeads })
        }, activeClient.id);
        
        if (res.ok) {
          const data = await res.json();
          toast.success(data.message || `${selectedLeads.length} leads excluídos com sucesso.`);
          setSelectedLeads([]);
          fetchLeads();
        } else {
          toast.error("Erro ao deletar leads selecionados.");
        }
      } else if (leadToDelete) {
        const res = await fetchWithAuth(`${API_URL}/leads/${leadToDelete.id}`, {
          method: 'DELETE'
        }, activeClient.id);
        
        if (res.ok) {
          toast.success("Lead excluído com sucesso.");
          setSelectedLeads(prev => prev.filter(id => id !== leadToDelete.id));
          fetchLeads();
        } else {
          toast.error("Erro ao deletar o lead.");
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao processar exclusão.");
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
      setLeadToDelete(null);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedLeads(leads.filter(lead => !lead.is_locked).map(lead => lead.id));
    } else {
      setSelectedLeads([]);
    }
  };

  const handleSelectLead = (leadId) => {
    const lead = leads.find(l => l.id === leadId);
    if (lead?.is_locked) return;
    setSelectedLeads(prev => 
      prev.includes(leadId) ? prev.filter(id => id !== leadId) : [...prev, leadId]
    );
  };

  // Reset de página ao mudar filtros de data
  const handleSetDatePreset = (val) => {
    setDatePreset(val);
    setPage(0);
  };

  const handleSetCustomDateFrom = (val) => {
    setCustomDateFrom(val);
    setPage(0);
  };

  const handleSetCustomDateTo = (val) => {
    setCustomDateTo(val);
    setPage(0);
  };

  const handleClearDateFilters = () => {
    setDatePreset('');
    setCustomDateFrom('');
    setCustomDateTo('');
    setPage(0);
  };

  return {
    leads, total, loading, page, setPage, limit, setLimit,
    search, setSearch, eventType, setEventType, selectedTag, setSelectedTag, availableFilters,
    // Filtros de data
    datePreset, setDatePreset: handleSetDatePreset,
    customDateFrom, setCustomDateFrom: handleSetCustomDateFrom,
    customDateTo, setCustomDateTo: handleSetCustomDateTo,
    handleClearDateFilters,
    // Seleção e deleção
    selectedLeads, setSelectedLeads, isDeleteModalOpen, setIsDeleteModalOpen, leadToDelete, setLeadToDelete, isDeleting,
    isImportModalOpen, setIsImportModalOpen, isCreateModalOpen, setIsCreateModalOpen,
    isEditModalOpen, setIsEditModalOpen, leadToEdit, setLeadToEdit,
    isCleaningTags, isCleanConfirmOpen, setIsCleanConfirmOpen,
    fetchLeads, fetchFilters, handleCleanTags, handleExport, executeDelete, handleSelectAll, handleSelectLead
  };
}
