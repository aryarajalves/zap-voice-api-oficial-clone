import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { API_URL, WS_URL } from '../../config';
import { fetchWithAuth } from '../../AuthContext';
import { appendOrUpdateMessage } from './utils/messageDeduplicator';

// Sub-hooks Modulares
import { useChatConversationsFetch } from './hooks/useChatConversationsFetch';
import { useChatMessagesFetch } from './hooks/useChatMessagesFetch';
import { useChatFunnelAndStatus } from './hooks/useChatFunnelAndStatus';

export function useChatEngine({
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
  selectedConvo,
  setSelectedConvo
}) {
  const [timeLeft24h, setTimeLeft24h] = useState('');
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [selectedConvoIds, setSelectedConvoIds] = useState([]);

  // Preview de mídia antes do envio
  const [mediaPreview, setMediaPreview] = useState(null);
  const [previewCaption, setPreviewCaption] = useState('');
  const [isSendingMedia, setIsSendingMedia] = useState(false);

  // Tags dropdown e busca
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);

  // Notas privadas
  const [privateNote, setPrivateNote] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Modais
  const [confirmDeleteConvos, setConfirmDeleteConvos] = useState(null);
  const [deletingConvoId, setDeletingConvoId] = useState(null);
  const [isClearChatModalOpen, setIsClearChatModalOpen] = useState(false);
  const [isClearingChat, setIsClearingChat] = useState(false);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [mediaData, setMediaData] = useState({ total_media: 0, total_docs: 0, total_links: 0, total_all: 0, media: [], docs: [], links: [] });
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);

  const loadConversationMedia = async (convoId) => {
    if (!activeClient || !convoId) return;
    setIsLoadingMedia(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/chat/conversations/${convoId}/media-and-docs`, {}, activeClient.id);
      if (res.ok) {
        const data = await res.json();
        setMediaData(data);
      } else {
        setMediaData({ total_media: 0, total_docs: 0, total_links: 0, total_all: 0, media: [], docs: [], links: [] });
      }
    } catch (err) {
      setMediaData({ total_media: 0, total_docs: 0, total_links: 0, total_all: 0, media: [], docs: [], links: [] });
    } finally {
      setIsLoadingMedia(false);
    }
  };

  useEffect(() => {
    setPrivateNote('');
    if (selectedConvo?.id) {
      loadConversationMedia(selectedConvo.id);
    } else {
      setMediaData({ total_media: 0, total_docs: 0, total_links: 0, total_all: 0, media: [], docs: [], links: [] });
    }
  }, [selectedConvo?.id]);
  const [confirmResendAgentflow, setConfirmResendAgentflow] = useState(null);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [isBlockingContact, setIsBlockingContact] = useState(false);

  // Gravação de áudio
  const [isRecording, setIsRecording] = useState(false);
  const [audioSeconds, setAudioSeconds] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioTimerRef = useRef(null);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // 1. Sub-hook de Conversas e Listagens
  const {
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
  } = useChatConversationsFetch({
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
    selectedConvo,
    setSelectedConvo
  });

  // 2. Sub-hook de Mensagens
  const {
    messages,
    setMessages,
    newMessage,
    setNewMessage,
    isLoadingMessages,
    isSending,
    hasMoreMessages,
    isLoadingMoreMessages,
    loadMessages,
    loadMoreMessages,
    handleSendMessage,
    sendReaction
  } = useChatMessagesFetch({
    activeClient,
    selectedConvo,
    setSelectedConvo,
    setConversations,
    setShouldScrollToBottom
  });

  // 3. Sub-hook de Funil, Status e Janela de 24h
  const {
    handleToggleStatus,
    handleTriggerFunnel,
    handleCancelFunnel,
    handleClose24hWindow
  } = useChatFunnelAndStatus({
    activeClient,
    selectedConvo,
    setSelectedConvo,
    loadConversations,
    isSending,
    setIsSending: () => {},
    setTimeLeft24h
  });

  const lastContactMessage = messages.filter(m => m.sender_type === 'contact').slice(-1)[0] || null;

  // WebSocket Realtime Sync para Mensagens, Mídias, Links e Docs
  useEffect(() => {
    if (!activeClient?.id) return;

    let ws = null;
    let reconnectTimeout = null;

    const connectWs = () => {
      try {
        const wsBase = WS_URL.endsWith('/ws') ? WS_URL : `${WS_URL}/ws`;
        const token = localStorage.getItem('token') || '';
        const wsUrl = token ? `${wsBase}?token=${token}` : wsBase;

        ws = new WebSocket(wsUrl);

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            const evtName = data.event || data.type;
            const payload = data.data || data.payload || data;

            if (payload?.client_id && String(payload.client_id) !== String(activeClient.id)) {
              return;
            }

            if (evtName === 'new_message' || data.event === 'new_message') {
              const msg = payload.id ? payload : (data.payload || data);
              const convoId = Number(msg.conversation_id);

              // 1. Atualiza lista de conversas
              setConversations(prev => {
                const index = prev.findIndex(c => Number(c.id) === convoId);
                if (index !== -1) {
                  const updated = [...prev];
                  const target = { ...updated[index] };
                  target.last_message_content = msg.content || (msg.media_url ? '[Mídia]' : '');
                  target.last_message_at = msg.timestamp || new Date().toISOString();
                  if (Number(selectedConvo?.id) !== convoId && msg.sender_type === 'contact') {
                    target.unread_count = (target.unread_count || 0) + 1;
                  }
                  updated.splice(index, 1);
                  return [target, ...updated];
                }
                return prev;
              });

              // 2. Se a conversa recebida for a selecionada atualmente
              if (selectedConvo?.id && Number(selectedConvo.id) === convoId) {
                setMessages(prev => appendOrUpdateMessage(prev, msg));
                setShouldScrollToBottom(true);

                // SE tiver mídia, link ou documento, atualiza mediaData na hora!
                const isMediaMsg = msg.media_url ||
                  ['image', 'video', 'document', 'audio', 'voice'].includes(msg.message_type) ||
                  (typeof msg.content === 'string' && (msg.content.includes('http://') || msg.content.includes('https://') || msg.content.includes('www.'))) ||
                  (msg.meta_data && msg.meta_data.header);

                if (isMediaMsg) {
                  loadConversationMedia(selectedConvo.id);
                }
              }
            }
          } catch (err) {
            console.error('Erro ao processar mensagem do WebSocket no Chat:', err);
          }
        };

        ws.onclose = () => {
          reconnectTimeout = setTimeout(connectWs, 3000);
        };

        ws.onerror = () => {
          if (ws) ws.close();
        };
      } catch (err) {
        console.error('Falha ao conectar WebSocket no Chat:', err);
      }
    };

    connectWs();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, [activeClient?.id, selectedConvo?.id]);

  const openConversationById = async (convoId) => {
    if (!convoId || !activeClient?.id) return;
    const targetId = Number(convoId);

    // 1. Procura na lista local em memória
    const existing = conversations.find(c => Number(c.id) === targetId);
    if (existing) {
      setSelectedConvo(existing);
      const name = existing.contact_name || existing.phone || `#${targetId}`;
      toast.success(`Abrindo conversa de ${name}`);
      return;
    }

    // 2. Se não estiver na lista visível, busca via API
    try {
      const res = await fetchWithAuth(`${API_URL}/chat/conversations/${targetId}`, {}, activeClient.id);
      if (res.ok) {
        const convoData = await res.json();
        setConversations(prev => [convoData, ...prev.filter(c => Number(c.id) !== targetId)]);
        setSelectedConvo(convoData);
        const name = convoData.contact_name || convoData.phone || `#${targetId}`;
        toast.success(`Abrindo conversa de ${name}`);
      } else {
        toast.error(`Conversa #${targetId} não encontrada.`);
      }
    } catch (err) {
      toast.error('Erro ao abrir conversa mencionada.');
    }
  };

  return {
    openConversationById,
    sendReaction,
    conversations,
    setConversations,
    messages,
    setMessages,
    newMessage,
    setNewMessage,
    availableLabels,
    availableLabelsDetails,
    availableAgents,
    isAssigning,
    isLoadingConvos,
    isLoadingMessages,
    isSending,
    timeLeft24h,
    setTimeLeft24h,
    shouldScrollToBottom,
    setShouldScrollToBottom,
    showScrollBtn,
    setShowScrollBtn,
    selectedConvoIds,
    setSelectedConvoIds,
    mediaPreview,
    setMediaPreview,
    previewCaption,
    setPreviewCaption,
    isSendingMedia,
    setIsSendingMedia,
    tagSearchQuery,
    setTagSearchQuery,
    isTagDropdownOpen,
    setIsTagDropdownOpen,
    privateNote,
    setPrivateNote,
    isSavingNote,
    setIsSavingNote,
    confirmDeleteConvos,
    setConfirmDeleteConvos,
    deletingConvoId,
    setDeletingConvoId,
    isClearChatModalOpen,
    setIsClearChatModalOpen,
    isClearingChat,
    setIsClearingChat,
    isMediaModalOpen,
    setIsMediaModalOpen,
    mediaData,
    setMediaData,
    isLoadingMedia,
    loadConversationMedia,
    confirmResendAgentflow,
    setConfirmResendAgentflow,
    isBlockModalOpen,
    setIsBlockModalOpen,
    isBlockingContact,
    setIsBlockingContact,
    isRecording,
    setIsRecording,
    audioSeconds,
    setAudioSeconds,
    mediaRecorderRef,
    audioChunksRef,
    audioTimerRef,
    messagesEndRef,
    messagesContainerRef,
    lastContactMessage,
    loadConversations,
    loadAvailableAgents,
    handleAssignConversation,
    loadAvailableLabels,
    getLabelColor,
    loadMessages,
    handleSendMessage,
    handleToggleStatus,
    page,
    setPage,
    limit,
    setLimit,
    totalConvos,
    hasMoreMessages,
    isLoadingMoreMessages,
    loadMoreMessages,
    handleTriggerFunnel,
    handleCancelFunnel,
    handleClose24hWindow
  };
}
