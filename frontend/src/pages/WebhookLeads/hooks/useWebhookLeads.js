import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../../config';
import { fetchWithAuth } from '../../../AuthContext';

export function useWebhookLeads(activeClient) {
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [limit] = useState(20);
  
  // Filters
  const [search, setSearch] = useState('');
  const [eventType, setEventType] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [availableFilters, setAvailableFilters] = useState({ event_types: [], product_names: [], tags: [] });

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
    
    // Pegamos os valores atuais ou os sobrescritos (para evitar estado atrasado no useCallback)
    const currentSearch = overrides.search !== undefined ? overrides.search : search;
    const currentEventType = overrides.eventType !== undefined ? overrides.eventType : eventType;
    const currentTag = overrides.tag !== undefined ? overrides.tag : selectedTag;
    const currentPage = overrides.page !== undefined ? overrides.page : page;

    setLoading(true);
    try {
      let url = `${API_URL}/leads?skip=${currentPage * limit}&limit=${limit}`;
      if (currentSearch) url += `&search=${encodeURIComponent(currentSearch)}`;
      if (currentEventType) url += `&event_type=${encodeURIComponent(currentEventType)}`;
      if (currentTag) url += `&tag=${encodeURIComponent(currentTag)}`;

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
  }, [activeClient?.id, limit, search, eventType, selectedTag, page]);

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

  // Efeito para filtros instantâneos (ID, Página, Tipo, Tag)
  useEffect(() => {
    if (activeClient?.id) {
      fetchLeads();
      fetchFilters();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeClient?.id, page, eventType, selectedTag]);

  const lastSearch = useRef('');

  // Efeito exclusivo para Busca com Debounce
  useEffect(() => {
    // Se a busca não mudou (ex: apenas o activeClient atualizou), não faz nada
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
      let url = `${API_URL}/leads/export?`;
      if (search) url += `search=${encodeURIComponent(search)}&`;
      if (eventType) url += `event_type=${encodeURIComponent(eventType)}&`;
      if (selectedTag) url += `tag=${encodeURIComponent(selectedTag)}&`;

      const response = await fetchWithAuth(url, {}, activeClient.id);
      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        const filename = `leads_${new Date().toISOString().split('T')[0]}.csv`;
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
          toast.success(`${selectedLeads.length} leads excluídos com sucesso.`);
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
      setSelectedLeads(leads.map(lead => lead.id));
    } else {
      setSelectedLeads([]);
    }
  };

  const handleSelectLead = (leadId) => {
    setSelectedLeads(prev => 
      prev.includes(leadId) ? prev.filter(id => id !== leadId) : [...prev, leadId]
    );
  };

  return {
    leads, total, loading, page, setPage, limit,
    search, setSearch, eventType, setEventType, selectedTag, setSelectedTag, availableFilters,
    selectedLeads, setSelectedLeads, isDeleteModalOpen, setIsDeleteModalOpen, leadToDelete, setLeadToDelete, isDeleting,
    isImportModalOpen, setIsImportModalOpen, isCreateModalOpen, setIsCreateModalOpen,
    isEditModalOpen, setIsEditModalOpen, leadToEdit, setLeadToEdit,
    isCleaningTags, isCleanConfirmOpen, setIsCleanConfirmOpen,
    fetchLeads, fetchFilters, handleCleanTags, handleExport, executeDelete, handleSelectAll, handleSelectLead
  };
}
