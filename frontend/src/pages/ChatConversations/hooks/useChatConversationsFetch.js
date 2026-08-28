import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { fetchWithAuth } from '../../../AuthContext';
import { API_URL } from '../../../config';

export function useChatConversationsFetch({
  activeClient,
  activeTab,
  statusFilter,
  searchQuery,
  selectedLabelFilter,
  filterBlockStatus,
  filterHasNote,
  filterStartDate,
  filterEndDate,
  filterUnread,
  filterWindowOpen,
  filterTemplate24h,
  filterUrgent,
  filterHasReplied,
  filterHasActiveFunnel,
  orderBy = 'recent',
  selectedConvo,
  setSelectedConvo
}) {
  const [conversations, setConversations] = useState([]);
  const [availableLabels, setAvailableLabels] = useState([]);
  const [availableLabelsDetails, setAvailableLabelsDetails] = useState([]);
  const [availableAgents, setAvailableAgents] = useState([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isLoadingConvos, setIsLoadingConvos] = useState(false);

  // Paginação
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalConvos, setTotalConvos] = useState(0);

  // Resetar para a página 1 ao alterar filtros
  useEffect(() => {
    setPage(1);
  }, [
    activeTab,
    statusFilter,
    searchQuery,
    selectedLabelFilter,
    filterBlockStatus,
    filterHasNote,
    filterStartDate,
    filterEndDate,
    activeClient,
    filterUnread,
    filterWindowOpen,
    filterTemplate24h,
    filterUrgent,
    filterHasReplied,
    filterHasActiveFunnel,
    orderBy
  ]);

  // Fetch Conversations
  const loadConversations = async (showLoading = false) => {
    if (!activeClient) return;
    if (showLoading) setIsLoadingConvos(true);
    try {
      const url = new URL(`${API_URL}/chat/conversations`);
      url.searchParams.append('tab', activeTab);
      url.searchParams.append('status', statusFilter);
      url.searchParams.append('page', page);
      url.searchParams.append('limit', limit);
      if (searchQuery) url.searchParams.append('search', searchQuery);
      if (selectedLabelFilter) url.searchParams.append('label', selectedLabelFilter);
      if (filterBlockStatus) url.searchParams.append('block_status', filterBlockStatus);
      if (filterHasNote) url.searchParams.append('has_note', 'true');
      if (filterStartDate) url.searchParams.append('start_date', filterStartDate);
      if (filterEndDate) url.searchParams.append('end_date', filterEndDate);
      if (filterUnread) url.searchParams.append('unread_only', 'true');
      if (filterWindowOpen) url.searchParams.append('window_open_only', 'true');
      if (filterTemplate24h) url.searchParams.append('template_sent_24h_only', 'true');
      if (filterUrgent) url.searchParams.append('urgent_only', 'true');
      if (filterHasReplied) url.searchParams.append('has_replied', 'true');
      if (filterHasActiveFunnel) url.searchParams.append('has_active_funnel', 'true');
      if (orderBy) url.searchParams.append('order_by', orderBy);

      const res = await fetchWithAuth(url.toString(), {}, activeClient.id);
      if (res.ok) {
        const data = await res.json();
        const convosList = data.conversations || [];
        setConversations(convosList);
        setTotalConvos(data.total_count || 0);

        // Sincronizar selectedConvo com dados frescos
        setSelectedConvo(prev => {
          if (!prev) return prev;
          const updated = convosList.find(c => c.id === prev.id);
          if (!updated) return prev;
          if (
            updated.last_contact_message_at !== prev.last_contact_message_at ||
            updated.last_message_content !== prev.last_message_content ||
            updated.status !== prev.status
          ) {
            return { ...prev, ...updated };
          }
          return prev;
        });
      }
    } catch (err) {
      console.error('Erro ao buscar conversas:', err);
    } finally {
      if (showLoading) setIsLoadingConvos(false);
    }
  };

  // Fetch Available Agents
  const loadAvailableAgents = async () => {
    if (!activeClient) return;
    try {
      const res = await fetchWithAuth(`${API_URL}/chat/agents`, {}, activeClient.id);
      if (res.ok) {
        const data = await res.json();
        setAvailableAgents(data || []);
      }
    } catch (err) {
      console.error('Erro ao buscar atendentes:', err);
    }
  };

  // Atribuir conversa
  const handleAssignConversation = async (userId) => {
    if (!selectedConvo) return;
    setIsAssigning(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/chat/conversations/${selectedConvo.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId || null })
      }, activeClient.id);

      if (res.ok) {
        const data = await res.json();
        setSelectedConvo(prev => prev ? { ...prev, assigned_user_id: data.assigned_user_id, assigned_user_name: data.assigned_user_name } : prev);
        setConversations(prev => prev.map(c =>
          c.id === selectedConvo.id ? { ...c, assigned_user_id: data.assigned_user_id, assigned_user_name: data.assigned_user_name } : c
        ));
        toast.success(data.assigned_user_id ? `Conversa atribuída a ${data.assigned_user_name}.` : 'Atribuição removida.');
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.detail || 'Erro ao atribuir conversa.');
      }
    } catch (err) {
      toast.error('Erro de conexão ao atribuir conversa.');
    } finally {
      setIsAssigning(false);
    }
  };

  // Fetch Available Labels
  const loadAvailableLabels = async () => {
    if (!activeClient) return;
    try {
      const res = await fetchWithAuth(`${API_URL}/chat/labels/details`, {}, activeClient.id);
      if (res.ok) {
        const data = await res.json();
        setAvailableLabelsDetails(data);
        setAvailableLabels(data.map(l => l.name));
      }
    } catch (err) {
      console.error('Erro ao buscar marcadores detalhados:', err);
    }
  };

  const getLabelColor = (labelName) => {
    if (!labelName) return '#3b82f6';
    const found = (availableLabelsDetails || []).find(
      l => l.name.toLowerCase() === labelName.toLowerCase()
    );
    return found && found.color ? found.color : '#3b82f6';
  };

  return {
    conversations,
    setConversations,
    availableLabels,
    availableLabelsDetails,
    availableAgents,
    isAssigning,
    isLoadingConvos,
    page,
    setPage,
    limit,
    setLimit,
    totalConvos,
    loadConversations,
    loadAvailableAgents,
    handleAssignConversation,
    loadAvailableLabels,
    getLabelColor
  };
}
