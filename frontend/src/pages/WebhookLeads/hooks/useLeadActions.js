import { toast } from 'react-hot-toast';
import { API_URL } from '../../../config';
import { fetchWithAuth } from '../../../AuthContext';
import { buildLeadsQueryParams, buildCommonFilterPayload } from './utils/leadsQueryHelpers';

export function useLeadActions({
  activeClient,
  getActiveFilterState,
  selectedLeads,
  setSelectedLeads,
  selectAllPages,
  setSelectAllPages,
  fetchLeads,
  fetchFilters,
  fetchDdiDddOptions,
  total,
  search,
  leadToDelete,
  setLeadToDelete,
  setIsDeleting,
  setIsDeleteModalOpen,
  setIsExportModalOpen,
  setIsExporting,
  setExportStatus,
  setExportError,
  setIsCleaningTags,
  setIsCleanConfirmOpen,
  setIsBulkTagging,
  setIsBulkTagModalOpen,
  blockTarget,
  closeBlockModal,
  setIsBlocking
}) {
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
        toast.error('Erro ao sincronizar contatos.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao sincronizar contatos.');
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

    setIsExportModalOpen(true);
    setIsExporting(true);
    setExportStatus('loading');
    setExportError(null);

    try {
      const filterState = {
        ...getActiveFilterState(),
        selectedLeads,
        selectAllPages,
        search
      };
      const queryString = buildLeadsQueryParams(filterState);
      const url = `${API_URL}/leads/export?${queryString}`;

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
        setExportStatus('success');
      } else {
        throw new Error("Não foi possível gerar a exportação dos contatos.");
      }
    } catch (err) {
      console.error(err);
      setExportError(err.message || "Erro ao exportar leads.");
      setExportStatus('error');
    } finally {
      setIsExporting(false);
    }
  };

  const executeDelete = async () => {
    if (!activeClient) return;
    setIsDeleting(true);
    try {
      if (leadToDelete === 'bulk') {
        if (selectAllPages) {
          const commonFilters = buildCommonFilterPayload(getActiveFilterState());
          const res = await fetchWithAuth(`${API_URL}/leads/bulk-delete-all`, {
            method: 'POST',
            body: JSON.stringify(commonFilters)
          }, activeClient.id);
          if (res.ok) {
            const data = await res.json();
            toast.success(data.message);
            setSelectedLeads([]);
            setSelectAllPages(false);
            fetchLeads();
          } else {
            toast.error("Erro ao excluir todos os contatos.");
          }
        } else {
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

  const handleBulkTag = async (tagValue, actionType = 'add') => {
    if (!activeClient || !tagValue) return;
    setIsBulkTagging(true);
    try {
      if (selectAllPages) {
        const commonFilters = buildCommonFilterPayload(getActiveFilterState());
        const endpoint = actionType === 'remove' ? `${API_URL}/leads/bulk-untag-all` : `${API_URL}/leads/bulk-tag-all`;
        const res = await fetchWithAuth(endpoint, {
          method: 'POST',
          body: JSON.stringify({ ...commonFilters, tag: tagValue })
        }, activeClient.id);
        if (res.ok) {
          const data = await res.json();
          toast.success(data.message);
          setSelectedLeads([]);
          setSelectAllPages(false);
          setIsBulkTagModalOpen(false);
          fetchLeads();
          fetchFilters();
        } else {
          toast.error("Erro ao alterar etiquetas de todos os contatos.");
        }
      } else {
        const endpoint = actionType === 'remove' ? `${API_URL}/leads/bulk-untag` : `${API_URL}/leads/bulk-tag`;
        const res = await fetchWithAuth(endpoint, {
          method: 'POST',
          body: JSON.stringify({ lead_ids: selectedLeads, tag: tagValue })
        }, activeClient.id);
        if (res.ok) {
          const data = await res.json();
          toast.success(data.message || `Etiqueta alterada em ${selectedLeads.length} contato(s).`);
          setSelectedLeads([]);
          setIsBulkTagModalOpen(false);
          fetchLeads();
          fetchFilters();
        } else {
          toast.error("Erro ao alterar etiquetas dos contatos selecionados.");
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao processar etiquetagem.");
    } finally {
      setIsBulkTagging(false);
    }
  };

  const handleConfirmBlock = async (type, hours) => {
    if (!activeClient || !blockTarget) return;
    const isSingle = blockTarget !== 'bulk';
    setIsBlocking(true);
    try {
      let res;
      if (isSingle) {
        const endpoint = type === 'resting' ? 'bulk-rest' : 'bulk-block';
        const body = type === 'resting'
          ? { lead_ids: [blockTarget.id], hours }
          : { lead_ids: [blockTarget.id] };
        res = await fetchWithAuth(`${API_URL}/leads/${endpoint}`, {
          method: 'POST',
          body: JSON.stringify(body)
        }, activeClient.id);
      } else if (selectAllPages) {
        const commonFilters = buildCommonFilterPayload(getActiveFilterState());
        const endpoint = type === 'resting' ? 'bulk-rest-all' : 'bulk-block-all';
        const body = type === 'resting' ? { ...commonFilters, hours } : commonFilters;
        res = await fetchWithAuth(`${API_URL}/leads/${endpoint}`, {
          method: 'POST',
          body: JSON.stringify(body)
        }, activeClient.id);
      } else {
        const endpoint = type === 'resting' ? 'bulk-rest' : 'bulk-block';
        const body = type === 'resting'
          ? { lead_ids: selectedLeads, hours }
          : { lead_ids: selectedLeads };
        res = await fetchWithAuth(`${API_URL}/leads/${endpoint}`, {
          method: 'POST',
          body: JSON.stringify(body)
        }, activeClient.id);
      }

      if (res.ok) {
        const data = await res.json();
        toast.success(data.message);
        if (!isSingle) {
          setSelectedLeads([]);
          setSelectAllPages(false);
        }
        closeBlockModal();
        fetchLeads();
        fetchDdiDddOptions();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.detail || "Erro ao bloquear contato(s).");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao processar bloqueio.");
    } finally {
      setIsBlocking(false);
    }
  };

  const handleUnblockSelected = async () => {
    if (!activeClient) return;
    if (selectedLeads.length === 0 && !selectAllPages) {
      toast.error("Nenhum contato selecionado para desbloquear.");
      return;
    }

    setIsBlocking(true);
    try {
      let res;
      if (selectAllPages) {
        const commonFilters = buildCommonFilterPayload(getActiveFilterState());
        res = await fetchWithAuth(`${API_URL}/leads/bulk-unblock-all`, {
          method: 'POST',
          body: JSON.stringify(commonFilters)
        }, activeClient.id);
      } else {
        res = await fetchWithAuth(`${API_URL}/leads/bulk-unblock`, {
          method: 'POST',
          body: JSON.stringify({ lead_ids: selectedLeads })
        }, activeClient.id);
      }

      if (res.ok) {
        const data = await res.json();
        toast.success(data.message);
        setSelectedLeads([]);
        setSelectAllPages(false);
        fetchLeads();
        fetchDdiDddOptions();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.detail || "Erro ao desbloquear contato(s).");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao processar desbloqueio.");
    } finally {
      setIsBlocking(false);
    }
  };

  const handleUnblockSingle = async (lead) => {
    if (!activeClient || !lead) return;
    setIsBlocking(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/leads/bulk-unblock`, {
        method: 'POST',
        body: JSON.stringify({ lead_ids: [lead.id] })
      }, activeClient.id);

      if (res.ok) {
        const data = await res.json();
        toast.success(data.message || "Contato desbloqueado com sucesso!");
        fetchLeads();
        fetchDdiDddOptions();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.detail || "Erro ao desbloquear contato.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao processar desbloqueio.");
    } finally {
      setIsBlocking(false);
    }
  };

  return {
    handleCleanTags,
    handleExport,
    executeDelete,
    handleBulkTag,
    handleConfirmBlock,
    handleUnblockSelected,
    handleUnblockSingle,
  };
}
