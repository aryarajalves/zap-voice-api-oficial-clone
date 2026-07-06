import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../config';
import { fetchWithAuth } from '../../AuthContext';

export default function useInstagramAutomation(activeClient) {
  const [automations, setAutomations] = useState([]);
  const [funnels, setFunnels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Tabs & Logs State
  const [activeTab, setActiveTab] = useState('rules');
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotalPages, setLogsTotalPages] = useState(1);
  const [logsTotalItems, setLogsTotalItems] = useState(0);
  const [logsStatusFilter, setLogsStatusFilter] = useState(null);

  // Form State
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [triggerType, setTriggerType] = useState('keyword');
  const [keywords, setKeywords] = useState('');
  const [actionType, setActionType] = useState('both');
  const [replyComments, setReplyComments] = useState(['']);
  const [funnelId, setFunnelId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [selectedPostIds, setSelectedPostIds] = useState(['all']);

  // Settings State
  const [instaAccountID, setInstaAccountID] = useState('');
  const [instaAccessToken, setInstaAccessToken] = useState('');
  const [isConfiguringSettings, setIsConfiguringSettings] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [tokenJaConfigurado, setTokenJaConfigurado] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [revealingToken, setRevealingToken] = useState(false);
  const [tokenRevelado, setTokenRevelado] = useState('');
  const [webhookBaseUrl, setWebhookBaseUrl] = useState('');
  const [instaWebhookSlug, setInstaWebhookSlug] = useState('');

  // Confirm delete
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Instagram Posts state
  const [instagramPosts, setInstagramPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [postsError, setPostsError] = useState('');

  const fetchAutomations = async () => {
    if (!activeClient) return;
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/instagram/automations`, {}, activeClient.id);
      if (res.ok) {
        const data = await res.json();
        setAutomations(data);
      }
    } catch (err) {
      console.error("Erro ao buscar automações:", err);
      toast.error("Erro ao carregar automações do Instagram.");
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    if (!activeClient) return;
    setLogsLoading(true);
    try {
      let url = `${API_URL}/instagram/logs?page=${logsPage}&limit=10`;
      if (logsStatusFilter) url += `&status=${logsStatusFilter}`;
      const res = await fetchWithAuth(url, {}, activeClient.id);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setLogsTotalPages(data.pages || 1);
        setLogsTotalItems(data.total || 0);
      }
    } catch (err) {
      console.error("Erro ao buscar logs do Instagram:", err);
      toast.error("Erro ao carregar histórico.");
    } finally {
      setLogsLoading(false);
    }
  };

  const fetchFunnels = async () => {
    if (!activeClient) return;
    try {
      const res = await fetchWithAuth(`${API_URL}/funnels`, {}, activeClient.id);
      if (res.ok) {
        const data = await res.json();
        setFunnels(data);
      }
    } catch (err) {
      console.error("Erro ao buscar funis:", err);
    }
  };

  const fetchSettings = async () => {
    if (!activeClient) return;
    try {
      const res = await fetchWithAuth(`${API_URL}/settings/`, {}, activeClient.id);
      if (res.ok) {
        const data = await res.json();
        setInstaAccountID(data.INSTAGRAM_ACCOUNT_ID || '');
        setTokenJaConfigurado(!!(data.INSTAGRAM_ACCESS_TOKEN));
        setWebhookBaseUrl(data.WEBHOOK_BASE_URL || '');
        setInstaWebhookSlug(data.INSTAGRAM_WEBHOOK_SLUG || '');
        setTokenRevelado('');
        setShowToken(false);
        if (data.INSTAGRAM_ACCESS_TOKEN && data.INSTAGRAM_ACCOUNT_ID) {
          fetchInstagramPosts(true);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar configurações do Instagram:', err);
    }
  };

  const fetchInstagramPosts = async (forceHasToken = null) => {
    if (!activeClient) return;
    const hasToken = forceHasToken !== null ? forceHasToken : tokenJaConfigurado;
    if (!hasToken) return;
    setLoadingPosts(true);
    setPostsError('');
    try {
      const res = await fetchWithAuth(`${API_URL}/instagram/posts`, {}, activeClient.id);
      if (res.ok) {
        const data = await res.json();
        setInstagramPosts(data);
      } else {
        const err = await res.json();
        setPostsError(err.detail || "Não foi possível carregar os posts do Instagram.");
      }
    } catch (err) {
      console.error(err);
      setPostsError("Erro ao conectar ao servidor para buscar posts.");
    } finally {
      setLoadingPosts(false);
    }
  };

  const handleRevealToken = async () => {
    if (tokenRevelado) {
      setShowToken(prev => !prev);
      return;
    }
    if (!activeClient || !tokenJaConfigurado) return;
    setRevealingToken(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/settings/reveal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'INSTAGRAM_ACCESS_TOKEN' })
      }, activeClient.id);
      if (res.ok) {
        const data = await res.json();
        setTokenRevelado(data.value || '');
        setInstaAccessToken(data.value || '');
        setShowToken(true);
      } else {
        toast.error('Não foi possível revelar o token.');
      }
    } catch (err) {
      toast.error('Erro ao revelar o token.');
    } finally {
      setRevealingToken(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!activeClient) return;
    setIsConfiguringSettings(true);
    const loadingToast = toast.loading("Salvando configurações...");
    try {
      const settingsPayload = {
        INSTAGRAM_ACCOUNT_ID: instaAccountID,
        INSTAGRAM_WEBHOOK_SLUG: instaWebhookSlug,
      };
      if (instaAccessToken.trim()) {
        settingsPayload.INSTAGRAM_ACCESS_TOKEN = instaAccessToken;
      }
      const res = await fetchWithAuth(`${API_URL}/settings/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: settingsPayload })
      }, activeClient.id);
      if (res.ok) {
        toast.success("Configurações do Instagram salvas com sucesso!", { id: loadingToast });
        fetchSettings();
      } else {
        const err = await res.json();
        toast.error(err.detail || "Erro ao salvar configurações.", { id: loadingToast });
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro de conexão ao salvar configurações.", { id: loadingToast });
    } finally {
      setIsConfiguringSettings(false);
    }
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setName('');
    setSelectedPostIds(['all']);
    setTriggerType('keyword');
    setKeywords('');
    setActionType('both');
    setReplyComments(['']);
    setFunnelId('');
    setIsActive(true);
    setIsModalOpen(true);
    fetchInstagramPosts();
  };

  const handleOpenEdit = (item) => {
    setEditingId(item.id);
    setName(item.name);
    if (item.post_id === 'all') {
      setSelectedPostIds(['all']);
    } else {
      setSelectedPostIds(item.post_id.split(',').map(s => s.trim()));
    }
    setTriggerType(item.trigger_type);
    setKeywords(item.keywords || '');
    setActionType(item.action_type);
    setReplyComments(item.reply_comments || ['']);
    setFunnelId(item.funnel_id || '');
    setIsActive(item.is_active);
    setIsModalOpen(true);
    fetchInstagramPosts();
  };

  const handleAddReplyVariation = () => setReplyComments([...replyComments, '']);
  const handleRemoveReplyVariation = (index) => {
    if (replyComments.length <= 1) return;
    setReplyComments(replyComments.filter((_, i) => i !== index));
  };
  const handleReplyChange = (index, val) => {
    const newReplies = [...replyComments];
    newReplies[index] = val;
    setReplyComments(newReplies);
  };

  const handleSaveAutomation = async (e) => {
    e.preventDefault();
    if (!activeClient) return;

    const filteredReplies = replyComments.filter(r => r.trim());
    if (actionType !== 'send_dm' && filteredReplies.length === 0) {
      toast.error("Você precisa definir pelo menos uma resposta de comentário.");
      return;
    }

    setIsSaving(true);
    const payload = {
      name,
      post_id: selectedPostIds.includes('all') ? 'all' : selectedPostIds.join(','),
      trigger_type: triggerType,
      keywords: triggerType === 'keyword' ? keywords : null,
      action_type: actionType,
      reply_comments: filteredReplies,
      funnel_id: funnelId ? parseInt(funnelId) : null,
      is_active: isActive
    };

    try {
      const url = editingId
        ? `${API_URL}/instagram/automations/${editingId}`
        : `${API_URL}/instagram/automations`;
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }, activeClient.id);
      if (res.ok) {
        toast.success(editingId ? "Automação atualizada!" : "Automação criada!");
        setIsModalOpen(false);
        fetchAutomations();
      } else {
        const err = await res.json();
        toast.error(err.detail || "Erro ao salvar automação.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao conectar com o servidor.");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = (item) => {
    setDeleteTarget(item);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!activeClient || !deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetchWithAuth(
        `${API_URL}/instagram/automations/${deleteTarget.id}`,
        { method: 'DELETE' },
        activeClient.id
      );
      if (res.ok) {
        toast.success("Automação excluída com sucesso!");
        setDeleteModalOpen(false);
        fetchAutomations();
      } else {
        toast.error("Erro ao deletar automação.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro de conexão ao excluir.");
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    fetchAutomations();
    fetchFunnels();
    fetchSettings();
  }, [activeClient]);

  useEffect(() => {
    if (activeTab === 'logs') fetchLogs();
  }, [activeClient, activeTab, logsPage, logsStatusFilter]);

  return {
    // Lists
    automations, funnels, loading,
    // Modal state
    isModalOpen, setIsModalOpen,
    isPostModalOpen, setIsPostModalOpen,
    isDeleting, isSaving,
    // Tabs & Logs
    activeTab, setActiveTab,
    logs, logsLoading, logsPage, setLogsPage,
    logsTotalPages, logsTotalItems, logsStatusFilter, setLogsStatusFilter,
    // Form
    editingId, name, setName,
    triggerType, setTriggerType,
    keywords, setKeywords,
    actionType, setActionType,
    replyComments,
    funnelId, setFunnelId,
    isActive, setIsActive,
    selectedPostIds, setSelectedPostIds,
    // Settings
    instaAccountID, setInstaAccountID,
    instaAccessToken, setInstaAccessToken,
    isConfiguringSettings,
    isSettingsModalOpen, setIsSettingsModalOpen,
    tokenJaConfigurado, showToken,
    revealingToken, tokenRevelado,
    webhookBaseUrl, instaWebhookSlug, setInstaWebhookSlug,
    setTokenRevelado,
    // Delete
    deleteModalOpen, setDeleteModalOpen, deleteTarget,
    // Posts
    instagramPosts, loadingPosts, postsError,
    // Handlers
    handleOpenNew, handleOpenEdit,
    handleAddReplyVariation, handleRemoveReplyVariation, handleReplyChange,
    handleSaveAutomation, handleSaveSettings, handleRevealToken,
    confirmDelete, handleDelete, fetchSettings,
  };
}
