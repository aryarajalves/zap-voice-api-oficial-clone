import { useState, useCallback, useEffect } from 'react';
import { API_URL } from '../../../config';
import { fetchWithAuth } from '../../../AuthContext';
import { toast } from 'react-hot-toast';

export function useWebhookHistory(activeClient) {
  const [webhookHistory, setWebhookHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isSyncing, setIsSyncing] = useState({});
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [selectedHistoryIds, setSelectedHistoryIds] = useState([]);
  const [historyPageSize, setHistoryPageSize] = useState(20);
  const [historyCurrentPage, setHistoryCurrentPage] = useState(1);
  const [webhookHistoryStatusFilter, setWebhookHistoryStatusFilter] = useState('');
  const [webhookHistorySearch, setWebhookHistorySearch] = useState('');
  const [isSavingJson, setIsSavingJson] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });

  // Prevenir F5 durante sincronização
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isSyncingAll) {
        e.preventDefault();
        e.returnValue = 'A sincronização está em andamento. Se você sair agora, o processo será interrompido.';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isSyncingAll]);

  const fetchHistory = useCallback(async (integrationId, status = '', search = '', isSilent = false) => {
    if (!activeClient || !integrationId) return;
    if (!isSilent) setLoadingHistory(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/webhook-integrations/${integrationId}/history?status=${status}&search=${search}`, {}, activeClient.id);
      if (res.ok) {
        setWebhookHistory(await res.json());
      }
    } catch (err) {
      console.error(err);
      if (!isSilent) toast.error('Erro ao carregar histórico');
    } finally {
      if (!isSilent) setLoadingHistory(false);
    }
  }, [activeClient]);

  const handleResendWebhook = async (historyId) => {
    setIsResending(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/webhook-integrations/history/${historyId}/resend`, { method: 'POST' }, activeClient.id);
      if (res.ok) {
        toast.success('Webhook reenviado para processamento');
        return true;
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao reenviar');
    } finally {
      setIsResending(false);
    }
    return false;
  };

  const handleSyncHistory = async (historyId) => {
    setIsSyncing(prev => ({ ...prev, [historyId]: true }));
    try {
      const res = await fetchWithAuth(`${API_URL}/webhook-integrations/history/${historyId}/sync`, { method: 'POST' }, activeClient.id);
      if (res.ok) {
        toast.success('Dados sincronizados com as novas regras');
        const updated = await res.json();
        setWebhookHistory(prev => prev.map(item => item.id === historyId ? updated : item));
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao sincronizar');
    } finally {
      setIsSyncing(prev => ({ ...prev, [historyId]: false }));
    }
  };

  const handleSyncAllHistory = async (integrationId) => {
    setIsSyncingAll(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/webhook-integrations/${integrationId}/history/sync-all`, { method: 'POST' }, activeClient.id);
      if (res.ok) {
        toast.success('Sincronização em massa iniciada');
        fetchHistory(integrationId, webhookHistoryStatusFilter, webhookHistorySearch, true);
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao sincronizar todos');
    } finally {
      setIsSyncingAll(false);
    }
  };

  const handleExportHistory = (integration) => {
    if (!webhookHistory.length) return toast.error("Não há dados para exportar");
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(webhookHistory, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", `history_${integration.name}_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportHistory = async (file, integrationId) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const json = JSON.parse(e.target.result);
        const res = await fetchWithAuth(`${API_URL}/webhook-integrations/${integrationId}/history/import`, {
          method: 'POST',
          body: JSON.stringify(json)
        }, activeClient.id);
        if (res.ok) {
          toast.success('Histórico importado com sucesso');
          fetchHistory(integrationId);
        }
      } catch (err) {
        toast.error('Erro ao importar arquivo JSON');
      }
    };
    reader.readAsText(file);
  };

  const handleDeleteHistory = async (integrationId, type, id = null, ids = []) => {
    try {
      let url = `${API_URL}/webhook-integrations/${integrationId}/history`;
      if (type === 'single') url += `/${id}`;
      else if (type === 'bulk') url += `/bulk-delete`;

      const res = await fetchWithAuth(url, {
        method: 'DELETE',
        body: type === 'bulk' ? JSON.stringify({ ids }) : undefined
      }, activeClient.id);

      if (res.ok) {
        toast.success('Registros removidos');
        if (type === 'bulk') setSelectedHistoryIds([]);
        fetchHistory(integrationId, webhookHistoryStatusFilter, webhookHistorySearch);
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao remover registros');
    }
  };

  const handleSaveJson = async (historyId, jsonData, integrationId) => {
    try {
      const parsed = JSON.parse(jsonData);
      setIsSavingJson(true);
      const res = await fetchWithAuth(`${API_URL}/webhook-integrations/history/${historyId}`, {
        method: 'PUT',
        body: JSON.stringify(parsed)
      }, activeClient.id);

      if (res.ok) {
        toast.success('Payload atualizado!');
        fetchHistory(integrationId, webhookHistoryStatusFilter, webhookHistorySearch, true);
        return true;
      }
    } catch (e) {
      toast.error("JSON Inválido!");
    } finally {
      setIsSavingJson(false);
    }
    return false;
  };

  return {
    webhookHistory,
    setWebhookHistory,
    loadingHistory,
    isResending,
    isSyncing,
    isSyncingAll,
    selectedHistoryIds,
    setSelectedHistoryIds,
    historyPageSize,
    setHistoryPageSize,
    historyCurrentPage,
    setHistoryCurrentPage,
    webhookHistoryStatusFilter,
    setWebhookHistoryStatusFilter,
    webhookHistorySearch,
    setWebhookHistorySearch,
    isSavingJson,
    syncProgress,
    fetchHistory,
    handleResendWebhook,
    handleSyncHistory,
    handleSyncAllHistory,
    handleExportHistory,
    handleImportHistory,
    handleDeleteHistory,
    handleSaveJson
  };
}
