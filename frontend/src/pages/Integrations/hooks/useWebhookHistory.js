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
  const [webhookHistoryMappingFilter, setWebhookHistoryMappingFilter] = useState('');
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
    const loadingToast = toast.loading('Preparando reenvio...');
    try {
      const res = await fetchWithAuth(`${API_URL}/webhook-integrations/history/${historyId}/resend`, { method: 'POST' }, activeClient.id);
      if (res.ok) {
        toast.success('Webhook reenviado com sucesso!', { 
          id: loadingToast,
          icon: '🚀',
          duration: 4000 
        });
        return true;
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.detail || 'Falha ao reenviar webhook', { id: loadingToast });
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão ao tentar reenviar', { id: loadingToast });
    } finally {
      setIsResending(false);
    }
    return false;
  };

  const handleSyncHistory = async (historyId) => {
    setIsSyncing(prev => ({ ...prev, [historyId]: true }));
    const loadingToast = toast.loading('Sincronizando dados...');
    try {
      const res = await fetchWithAuth(`${API_URL}/webhook-integrations/history/${historyId}/sync`, { method: 'POST' }, activeClient.id);
      if (res.ok) {
        toast.success('Dados sincronizados!', { 
          id: loadingToast,
          icon: '🔄',
          duration: 4000 
        });
        const updated = await res.json();
        setWebhookHistory(prev => prev.map(item => item.id === historyId ? updated : item));
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.detail || 'Falha ao sincronizar dados', { id: loadingToast });
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão ao sincronizar', { id: loadingToast });
    } finally {
      setIsSyncing(prev => ({ ...prev, [historyId]: false }));
    }
  };

  const handleSyncAllHistory = async (integrationId) => {
    setIsSyncingAll(true);
    const loadingToast = toast.loading('Iniciando sincronização global...');
    try {
      const res = await fetchWithAuth(`${API_URL}/webhook-integrations/${integrationId}/history/sync-all`, { method: 'POST' }, activeClient.id);
      if (res.ok) {
        toast.success('Sincronização global iniciada!', { 
          id: loadingToast,
          icon: '🌐',
          duration: 4000 
        });
        fetchHistory(integrationId, webhookHistoryStatusFilter, webhookHistorySearch, true);
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.detail || 'Falha ao iniciar sincronização global', { id: loadingToast });
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão ao sincronizar todos', { id: loadingToast });
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

  const handleBulkResendHistory = async (integrationId, ids) => {
    const loadingToast = toast.loading('Iniciando reenvio em massa...');
    try {
      const res = await fetchWithAuth(`${API_URL}/webhook-integrations/history/bulk-resend`, {
        method: 'POST',
        body: JSON.stringify(ids)
      }, activeClient.id);

      if (res.ok) {
        toast.success('Reenvio em massa iniciado!', { 
          id: loadingToast,
          icon: '📤',
          duration: 4000 
        });
        setSelectedHistoryIds([]); // Limpa seleção após iniciar
        return true;
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.detail || 'Erro ao iniciar reenvio em massa', { id: loadingToast });
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão ao tentar reenviar', { id: loadingToast });
    }
    return false;
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
    webhookHistoryMappingFilter,
    setWebhookHistoryMappingFilter,
    webhookHistorySearch,
    setWebhookHistorySearch,
    isSavingJson,
    syncProgress,
    fetchHistory,
    handleResendWebhook,
    handleSyncHistory,
    handleSyncAllHistory,
    handleBulkResendHistory,
    handleExportHistory,
    handleImportHistory,
    handleDeleteHistory,
    handleSaveJson
  };
}
