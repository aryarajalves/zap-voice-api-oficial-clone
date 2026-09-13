import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../config';
import { fetchWithAuth } from '../../AuthContext';

export function useAppFunnels(activeClient) {
  // Funnel States
  const [funnels, setFunnels] = useState([]);
  const [showBuilder, setShowBuilder] = useState(false);
  const [selectedFunnel, setSelectedFunnel] = useState(null);
  const [editingFunnel, setEditingFunnel] = useState(null);
  const [isArchivedTab, setIsArchivedTab] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);

  // Modal & Selection States
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [funnelToDelete, setFunnelToDelete] = useState(null);
  const [selectedFunnelIds, setSelectedFunnelIds] = useState([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [funnelForTag, setFunnelForTag] = useState(null);

  const fetchFunnels = useCallback(async () => {
    if (!activeClient) return;
    try {
      const res = await fetchWithAuth(`${API_URL}/funnels?is_archived=${isArchivedTab}`, {}, activeClient.id);
      const data = await res.json();
      if (Array.isArray(data)) {
        setFunnels(data);
        setCurrentPage(1);
      } else {
        console.error("Formato inesperado de funis:", data);
        setFunnels([]);
      }
    } catch (err) {
      console.error("Erro ao buscar funis:", err);
      toast.error("Erro ao carregar funis.");
    }
  }, [activeClient, isArchivedTab]);

  const resetFunnelState = () => {
    setShowBuilder(false);
    setEditingFunnel(null);
  };

  const handleCreateFunnel = async () => {
    const loadingToast = toast.loading("Criando novo funil...");
    try {
      const now = new Date();
      const localeStr = now.toLocaleString('pt-BR');
      const colonCount = (localeStr.match(/:/g) || []).length;
      const formattedDate = colonCount === 2 ? localeStr.replace(/:\d{2}$/, '') : localeStr;

      const res = await fetchWithAuth(`${API_URL}/funnels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Novo Funil ${formattedDate}`,
          description: "Criado via Visual Builder",
          steps: []
        })
      }, activeClient?.id);

      if (res.ok) {
        const newFunnel = await res.json();
        setEditingFunnel(newFunnel);
        setShowBuilder(true);
        toast.dismiss(loadingToast);
        toast.success("Funil criado! Pode editar.");
      } else {
        throw new Error("Erro ao criar funil inicial");
      }
    } catch (e) {
      console.error(e);
      toast.dismiss(loadingToast);
      toast.error("Erro ao iniciar novo funil");
    }
  };

  const handleEdit = (funnel, e) => {
    if (e) e.stopPropagation();
    setEditingFunnel(funnel);
    setShowBuilder(true);
    setSelectedFunnel(null);
  };

  const confirmDelete = (funnelId, e) => {
    if (e) e.stopPropagation();
    setFunnelToDelete(funnelId);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!funnelToDelete) return;
    const loadingToast = toast.loading("Excluindo funil...");
    try {
      const res = await fetchWithAuth(`${API_URL}/funnels/${funnelToDelete}`, {
        method: 'DELETE'
      }, activeClient?.id);
      if (res.ok) {
        fetchFunnels();
        if (selectedFunnel?.id === funnelToDelete) setSelectedFunnel(null);
        if (editingFunnel?.id === funnelToDelete) {
          setEditingFunnel(null);
          setShowBuilder(false);
        }
        setIsDeleteModalOpen(false);
        toast.dismiss(loadingToast);
        toast.success("Funil excluído.");
      } else {
        throw new Error("Erro ao excluir");
      }
    } catch (err) {
      console.error("Erro ao excluir funil:", err);
      toast.dismiss(loadingToast);
      toast.error("Erro ao excluir funil.");
    }
  };

  const toggleFunnelSelection = (funnelId, e) => {
    if (e) e.stopPropagation();
    setSelectedFunnelIds(prev =>
      prev.includes(funnelId)
        ? prev.filter(id => id !== funnelId)
        : [...prev, funnelId]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedFunnelIds.length === 0) return;
    const loadingToast = toast.loading(`Excluindo ${selectedFunnelIds.length} funis...`);
    try {
      const res = await fetchWithAuth(`${API_URL}/funnels/bulk`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ funnel_ids: selectedFunnelIds }),
      }, activeClient?.id);

      if (res.ok) {
        fetchFunnels();
        const deletedIds = new Set(selectedFunnelIds);
        if (selectedFunnel && deletedIds.has(selectedFunnel.id)) setSelectedFunnel(null);
        if (editingFunnel && deletedIds.has(editingFunnel.id)) {
          setEditingFunnel(null);
          setShowBuilder(false);
        }
        setSelectedFunnelIds([]);
        setIsBulkDeleteModalOpen(false);
        toast.dismiss(loadingToast);
        toast.success("Funis excluídos com sucesso.");
      } else {
        throw new Error("Erro ao excluir funis");
      }
    } catch (err) {
      console.error("Erro ao excluir funis:", err);
      toast.dismiss(loadingToast);
      toast.error("Erro ao excluir funis.");
    }
  };

  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedFunnelIds(funnels.map(f => f.id));
    } else {
      setSelectedFunnelIds([]);
    }
  };

  const handleArchiveFunnel = async (funnelId, archiveStatus) => {
    const loadingToast = toast.loading(archiveStatus ? "Arquivando funil..." : "Desarquivando funil...");
    try {
      const res = await fetchWithAuth(`${API_URL}/funnels/${funnelId}/archive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_archived: archiveStatus })
      }, activeClient?.id);
      
      if (res.ok) {
        toast.dismiss(loadingToast);
        toast.success(archiveStatus ? "Funil arquivado!" : "Funil desarquivado!");
        fetchFunnels();
        setSelectedFunnelIds(prev => prev.filter(id => id !== funnelId));
      } else {
        throw new Error("Erro ao arquivar/desarquivar");
      }
    } catch (e) {
      console.error(e);
      toast.dismiss(loadingToast);
      toast.error("Erro ao alterar estado de arquivamento");
    }
  };

  const handleTagFunnel = async (funnelId, tagValue) => {
    const loadingToast = toast.loading("Salvando etiqueta...");
    try {
      const res = await fetchWithAuth(`${API_URL}/funnels/${funnelId}/tag`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: tagValue || null })
      }, activeClient?.id);
      
      if (res.ok) {
        toast.dismiss(loadingToast);
        toast.success("Etiqueta atualizada com sucesso!");
        fetchFunnels();
      } else {
        throw new Error("Erro ao salvar etiqueta");
      }
    } catch (e) {
      console.error(e);
      toast.dismiss(loadingToast);
      toast.error("Erro ao salvar etiqueta");
    }
  };

  const handlePinFunnel = async (funnelId, pinStatus) => {
    const loadingToast = toast.loading(pinStatus ? "Fixando funil no topo..." : "Desafixando funil...");
    try {
      const res = await fetchWithAuth(`${API_URL}/funnels/${funnelId}/pin`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_pinned: pinStatus })
      }, activeClient?.id);
      
      if (res.ok) {
        toast.dismiss(loadingToast);
        toast.success(pinStatus ? "Funil fixado no topo!" : "Funil desafixado do topo!");
        fetchFunnels();
      } else {
        const errData = await res.json();
        throw new Error(errData.detail || "Erro ao alterar estado de fixação");
      }
    } catch (e) {
      console.error(e);
      toast.dismiss(loadingToast);
      toast.error(e.message || "Erro ao alterar estado de fixação");
    }
  };

  const handleBulkArchive = async (archiveStatus) => {
    if (selectedFunnelIds.length === 0) return;
    const loadingToast = toast.loading(archiveStatus ? "Arquivando funis selecionados..." : "Desarquivando funis...");
    try {
      const res = await fetchWithAuth(`${API_URL}/funnels/bulk/archive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ funnel_ids: selectedFunnelIds, is_archived: archiveStatus })
      }, activeClient?.id);
      
      if (res.ok) {
        toast.dismiss(loadingToast);
        toast.success(archiveStatus ? "Funis arquivados!" : "Funis desarquivados!");
        fetchFunnels();
        setSelectedFunnelIds([]);
      } else {
        const errData = await res.json();
        throw new Error(errData.detail || "Erro ao arquivar/desarquivar em lote");
      }
    } catch (e) {
      console.error(e);
      toast.dismiss(loadingToast);
      toast.error(e.message || "Erro ao alterar estado de arquivamento em lote");
    }
  };

  const handleBulkTagConfirm = async (id, tagValue) => {
    if (selectedFunnelIds.length === 0) return;
    const loadingToast = toast.loading("Salvando etiqueta em lote...");
    try {
      const res = await fetchWithAuth(`${API_URL}/funnels/bulk/tag`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ funnel_ids: selectedFunnelIds, tag: tagValue || null })
      }, activeClient?.id);
      
      if (res.ok) {
        toast.dismiss(loadingToast);
        toast.success("Etiquetas em lote updated!");
        fetchFunnels();
        setSelectedFunnelIds([]);
      } else {
        throw new Error("Erro ao salvar etiquetas em lote");
      }
    } catch (e) {
      console.error(e);
      toast.dismiss(loadingToast);
      toast.error("Erro ao salvar etiquetas em lote");
    }
  };

  const handleDuplicateFunnel = async (funnelId, e) => {
    if (e) e.stopPropagation();
    const loadingToast = toast.loading("Duplicando funil...");
    try {
      const res = await fetchWithAuth(`${API_URL}/funnels/${funnelId}/duplicate`, {
        method: 'POST'
      }, activeClient?.id);
      
      if (res.ok) {
        toast.dismiss(loadingToast);
        toast.success("Funil duplicado com sucesso!");
        fetchFunnels();
      } else {
        const errData = await res.json();
        throw new Error(errData.detail || "Erro ao duplicar funil");
      }
    } catch (e) {
      console.error(e);
      toast.dismiss(loadingToast);
      toast.error(e.message || "Erro ao duplicar funil");
    }
  };

  return {
    funnels,
    setFunnels,
    showBuilder,
    setShowBuilder,
    selectedFunnel,
    setSelectedFunnel,
    editingFunnel,
    setEditingFunnel,
    isArchivedTab,
    setIsArchivedTab,
    itemsPerPage,
    setItemsPerPage,
    currentPage,
    setCurrentPage,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    funnelToDelete,
    setFunnelToDelete,
    selectedFunnelIds,
    setSelectedFunnelIds,
    isBulkDeleteModalOpen,
    setIsBulkDeleteModalOpen,
    isTagModalOpen,
    setIsTagModalOpen,
    funnelForTag,
    setFunnelForTag,
    fetchFunnels,
    resetFunnelState,
    handleCreateFunnel,
    handleEdit,
    confirmDelete,
    handleDelete,
    toggleFunnelSelection,
    handleBulkDelete,
    toggleSelectAll,
    handleArchiveFunnel,
    handleTagFunnel,
    handlePinFunnel,
    handleBulkArchive,
    handleBulkTagConfirm,
    handleDuplicateFunnel,
  };
}
