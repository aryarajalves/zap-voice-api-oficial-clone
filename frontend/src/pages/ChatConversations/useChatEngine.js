import { useState, useRef } from 'react';

// Sub-hooks Modulares
import { useChatConversationsFetch } from './hooks/useChatConversationsFetch';
import { useChatMessagesFetch } from './hooks/useChatMessagesFetch';
import { useChatFunnelAndStatus } from './hooks/useChatFunnelAndStatus';
import { useChatMediaAndDocs } from './hooks/useChatMediaAndDocs';
import { useChatWebSocketSync } from './hooks/useChatWebSocketSync';
import { useChatConversationOpen } from './hooks/useChatConversationOpen';

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
  orderBy = 'recent',
  selectedConvo,
  setSelectedConvo
}) {
  const [timeLeft24h, setTimeLeft24h] = useState('');
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [showScrollTopBtn, setShowScrollTopBtn] = useState(false);
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

  // Modais e confirmações
  const [confirmDeleteConvos, setConfirmDeleteConvos] = useState(null);
  const [deletingConvoId, setDeletingConvoId] = useState(null);
  const [isClearChatModalOpen, setIsClearChatModalOpen] = useState(false);
  const [isClearingChat, setIsClearingChat] = useState(false);
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
    chatLabels,
    contactLabels,
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
    orderBy,
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
    setIsLoadingMessages,
    isSending,
    hasMoreMessages,
    isLoadingMoreMessages,
    loadMessages,
    loadMoreMessages,
    loadAllMessagesAndScrollToTop,
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
    handleToggleArchive,
    handleBulkArchive,
    handleTriggerFunnel,
    handleCancelFunnel,
    handleClose24hWindow,
    isBulkFunnelModalOpen,
    setIsBulkFunnelModalOpen,
    isTriggeringBulkFunnel,
    handleBulkTriggerFunnel
  } = useChatFunnelAndStatus({
    activeClient,
    selectedConvo,
    setSelectedConvo,
    loadConversations,
    isSending,
    setIsSending: () => {},
    setTimeLeft24h
  });

  // 4. Sub-hook de Mídias, Docs e Anotações
  const {
    isMediaModalOpen,
    setIsMediaModalOpen,
    mediaData,
    setMediaData,
    isLoadingMedia,
    loadConversationMedia
  } = useChatMediaAndDocs({
    activeClient,
    selectedConvo,
    setPrivateNote
  });

  // 5. Sub-hook de WebSocket Realtime Sync
  useChatWebSocketSync({
    activeClient,
    selectedConvo,
    setSelectedConvo,
    setConversations,
    setMessages,
    setShouldScrollToBottom,
    loadConversationMedia
  });

  // 6. Sub-hook de Abertura de Conversa por ID
  const { openConversationById, openConversationByPhone } = useChatConversationOpen({
    activeClient,
    conversations,
    setConversations,
    setSelectedConvo
  });

  const lastContactMessage = messages.filter(m => m.sender_type === 'contact').slice(-1)[0] || null;

  return {
    openConversationById,
    openConversationByPhone,
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
    setIsLoadingMessages,
    isSending,
    timeLeft24h,
    setTimeLeft24h,
    shouldScrollToBottom,
    setShouldScrollToBottom,
    showScrollBtn,
    setShowScrollBtn,
    showScrollTopBtn,
    setShowScrollTopBtn,
    loadAllMessagesAndScrollToTop,
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
    chatLabels,
    contactLabels,
    getLabelColor,
    loadMessages,
    handleSendMessage,
    handleToggleStatus,
    handleToggleArchive,
    handleBulkArchive,
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
    handleClose24hWindow,
    isBulkFunnelModalOpen,
    setIsBulkFunnelModalOpen,
    isTriggeringBulkFunnel,
    handleBulkTriggerFunnel
  };
}
