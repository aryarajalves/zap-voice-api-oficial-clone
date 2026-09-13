import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../../config';
import { fetchWithAuth } from '../../../AuthContext';

export default function useInstagramAutomations(activeClient, onFetchPosts) {
  const [automations, setAutomations] = useState([]);
  const [funnels, setFunnels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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

  // Confirm delete
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchAutomations = useCallback(async () => {
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
  }, [activeClient]);

  const fetchFunnels = useCallback(async () => {
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
  }, [activeClient]);

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
    if (onFetchPosts) onFetchPosts();
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
    if (onFetchPosts) onFetchPosts();
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
    if (e && e.preventDefault) e.preventDefault();
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
  }, [fetchAutomations, fetchFunnels]);

  return {
    automations,
    funnels,
    loading,
    isModalOpen,
    setIsModalOpen,
    isPostModalOpen,
    setIsPostModalOpen,
    isDeleting,
    isSaving,
    deleteModalOpen,
    setDeleteModalOpen,
    deleteTarget,
    editingId,
    name,
    setName,
    triggerType,
    setTriggerType,
    keywords,
    setKeywords,
    actionType,
    setActionType,
    replyComments,
    funnelId,
    setFunnelId,
    isActive,
    setIsActive,
    selectedPostIds,
    setSelectedPostIds,
    fetchAutomations,
    handleOpenNew,
    handleOpenEdit,
    handleAddReplyVariation,
    handleRemoveReplyVariation,
    handleReplyChange,
    handleSaveAutomation,
    confirmDelete,
    handleDelete
  };
}
