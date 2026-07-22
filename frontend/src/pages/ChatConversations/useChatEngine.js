import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { fetchWithAuth } from '../../AuthContext';
import { API_URL } from '../../config';

export function useChatEngine({ activeClient, activeTab, statusFilter, searchQuery, selectedLabelFilter, filterBlockStatus, filterHasNote, filterStartDate, filterEndDate, filterUnread, filterWindowOpen, filterUrgent, filterHasReplied, selectedConvo, setSelectedConvo }) {
    const [conversations, setConversations] = useState([]);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [availableLabels, setAvailableLabels] = useState([]);
    const [availableLabelsDetails, setAvailableLabelsDetails] = useState([]);
    const [availableAgents, setAvailableAgents] = useState([]);
    const [isAssigning, setIsAssigning] = useState(false);
    const [isLoadingConvos, setIsLoadingConvos] = useState(false);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [timeLeft24h, setTimeLeft24h] = useState('');
    const [shouldScrollToBottom, setShouldScrollToBottom] = useState(false);
    const [showScrollBtn, setShowScrollBtn] = useState(false);
    const [selectedConvoIds, setSelectedConvoIds] = useState([]);
    
    // Paginação
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [totalConvos, setTotalConvos] = useState(0);

    // Paginação de Mensagens no Chat
    const [hasMoreMessages, setHasMoreMessages] = useState(true);
    const [isLoadingMoreMessages, setIsLoadingMoreMessages] = useState(false);

    // Resetar para a página 1 ao alterar filtros
    useEffect(() => {
        setPage(1);
    }, [activeTab, statusFilter, searchQuery, selectedLabelFilter, filterBlockStatus, filterHasNote, filterStartDate, filterEndDate, activeClient, filterUnread, filterWindowOpen, filterUrgent, filterHasReplied]);
    
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

    const lastContactMessage = messages.filter(m => m.sender_type === 'contact').slice(-1)[0] || null;

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
            if (searchQuery) {
                url.searchParams.append('search', searchQuery);
            }
            if (selectedLabelFilter) {
                url.searchParams.append('label', selectedLabelFilter);
            }
            if (filterBlockStatus) {
                url.searchParams.append('block_status', filterBlockStatus);
            }
            if (filterHasNote) {
                url.searchParams.append('has_note', 'true');
            }
            if (filterStartDate) {
                url.searchParams.append('start_date', filterStartDate);
            }
            if (filterEndDate) {
                url.searchParams.append('end_date', filterEndDate);
            }
            if (filterUnread) {
                url.searchParams.append('unread_only', 'true');
            }
            if (filterWindowOpen) {
                url.searchParams.append('window_open_only', 'true');
            }
            if (filterUrgent) {
                url.searchParams.append('urgent_only', 'true');
            }
            if (filterHasReplied) {
                url.searchParams.append('has_replied', 'true');
            }
            const res = await fetchWithAuth(url.toString(), {}, activeClient.id);
            if (res.ok) {
                const data = await res.json();
                const convosList = data.conversations || [];
                setConversations(convosList);
                setTotalConvos(data.total_count || 0);

                // Sincronizar selectedConvo com dados frescos (atualiza cronômetro de 24h automaticamente)
                setSelectedConvo(prev => {
                    if (!prev) return prev;
                    const updated = convosList.find(c => c.id === prev.id);
                    if (!updated) return prev;
                    if (updated.last_contact_message_at !== prev.last_contact_message_at ||
                        updated.last_message_content !== prev.last_message_content ||
                        updated.status !== prev.status) {
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

    const loadMessages = async (convoId, showLoading = false) => {
        if (!activeClient || !convoId) return;
        if (showLoading) {
            setIsLoadingMessages(true);
            setHasMoreMessages(true);
        }
        try {
            const limitVal = 50;
            const res = await fetchWithAuth(`${API_URL}/chat/conversations/${convoId}/messages?limit=${limitVal}`, {}, activeClient.id);
            if (res.ok) {
                const data = await res.json();
                setMessages(data);
                if (data.length < limitVal) {
                    setHasMoreMessages(false);
                }
                if (showLoading) setShouldScrollToBottom(true);
            } else {
                setMessages([]);
            }
        } catch (err) {
            setMessages([]);
        } finally {
            if (showLoading) setIsLoadingMessages(false);
        }
    };

    const loadMoreMessages = async () => {
        if (!activeClient || !selectedConvo || isLoadingMoreMessages || !hasMoreMessages) return;
        if (messages.length === 0) return;
        
        setIsLoadingMoreMessages(true);
        try {
            const oldestMsgId = messages[0].id;
            const limitVal = 50;
            const res = await fetchWithAuth(
                `${API_URL}/chat/conversations/${selectedConvo.id}/messages?limit=${limitVal}&before_id=${oldestMsgId}`,
                {},
                activeClient.id
            );
            if (res.ok) {
                const data = await res.json();
                if (data.length > 0) {
                    setMessages(prev => [...data, ...prev]);
                }
                if (data.length < limitVal) {
                    setHasMoreMessages(false);
                }
            }
        } catch (err) {
            console.error("Erro ao carregar mais mensagens:", err);
        } finally {
            setIsLoadingMoreMessages(false);
        }
    };

    const handleSendMessage = async (e, options = {}) => {
        if (e) e.preventDefault();
        if (!newMessage.trim() || !selectedConvo || isSending) return;

        setIsSending(true);
        const textToSend = newMessage;
        setNewMessage('');

        try {
            if (selectedConvo.status === 'resolved') {
                await fetchWithAuth(`${API_URL}/chat/conversations/${selectedConvo.id}/status`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'open' })
                }, activeClient.id);
                setSelectedConvo(prev => ({ ...prev, status: 'open' }));
            }

            if (options?.splitLines) {
                // Quebrar por linhas/parágrafos e filtrar vazios
                const parts = textToSend.split('\n').map(p => p.trim()).filter(p => p !== '');
                if (parts.length === 0) {
                    setIsSending(false);
                    return;
                }

                // Enviar sequencialmente
                for (let i = 0; i < parts.length; i++) {
                    const contentPart = parts[i];
                    const res = await fetchWithAuth(`${API_URL}/chat/conversations/${selectedConvo.id}/messages`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ content: contentPart })
                    }, activeClient.id);

                    if (res.ok) {
                        const sentMsg = await res.json();
                        setMessages(prev => [...prev, sentMsg]);
                        setShouldScrollToBottom(true);
                        setConversations(prev => prev.map(c => 
                            c.id === selectedConvo.id 
                            ? { ...c, last_message_content: contentPart, last_message_at: new Date().toISOString(), status: 'open' } 
                            : c
                        ));
                        
                        // Pequeno atraso entre mensagens para garantir ordem de recebimento
                        if (i < parts.length - 1) {
                            await new Promise(resolve => setTimeout(resolve, 800));
                        }
                    } else {
                        const errData = await res.json();
                        toast.error(errData.detail || `Erro ao enviar parte ${i + 1} da mensagem.`);
                    }
                }
            } else {
                const res = await fetchWithAuth(`${API_URL}/chat/conversations/${selectedConvo.id}/messages`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content: textToSend })
                }, activeClient.id);

                if (res.ok) {
                    const sentMsg = await res.json();
                    setMessages(prev => [...prev, sentMsg]);
                    setShouldScrollToBottom(true);
                    setConversations(prev => prev.map(c => 
                        c.id === selectedConvo.id 
                        ? { ...c, last_message_content: textToSend, last_message_at: new Date().toISOString(), status: 'open' } 
                        : c
                    ));
                } else {
                    const errData = await res.json();
                    toast.error(errData.detail || 'Erro ao enviar mensagem.');
                    setNewMessage(textToSend);
                }
            }
        } catch (err) {
            toast.error('Erro de conexão ao enviar mensagem.');
            setNewMessage(textToSend);
        } finally {
            setIsSending(false);
        }
    };

    const handleToggleStatus = async () => {
        if (!selectedConvo) return;
        const newStatus = selectedConvo.status === 'open' ? 'resolved' : 'open';
        const loadingToast = toast.loading(newStatus === 'resolved' ? 'Resolvendo conversa...' : 'Reabrindo conversa...');
        try {
            const res = await fetchWithAuth(`${API_URL}/chat/conversations/${selectedConvo.id}/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            }, activeClient.id);

            if (res.ok) {
                toast.dismiss(loadingToast);
                toast.success(newStatus === 'resolved' ? 'Conversa resolvida!' : 'Conversa reaberta!');
                setSelectedConvo(prev => ({ ...prev, status: newStatus }));
                loadConversations();
            } else {
                throw new Error();
            }
        } catch (err) {
            toast.dismiss(loadingToast);
            toast.error('Falha ao atualizar status da conversa.');
        }
    };

    const handleTriggerFunnel = async (funnelId) => {
        if (!selectedConvo || isSending) return false;
        setIsSending(true);
        try {
            const res = await fetchWithAuth(`${API_URL}/chat/conversations/${selectedConvo.id}/funnel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ funnel_id: funnelId })
            }, activeClient.id);

            if (res.ok) {
                const data = await res.json();
                toast.success(`Funil "${data.funnel_name}" iniciado com sucesso!`);
                setSelectedConvo(prev => prev ? { 
                    ...prev, 
                    active_funnel: { id: data.funnel_id, name: data.funnel_name, status: data.trigger_status } 
                } : prev);
                await loadConversations();
                return true;
            } else {
                const errData = await res.json();
                toast.error(errData.detail || 'Erro ao iniciar funil.');
                return false;
            }
        } catch (err) {
            toast.error('Erro de conexão ao iniciar funil.');
            return false;
        } finally {
            setIsSending(false);
        }
    };

    return {
        conversations, setConversations,
        messages, setMessages,
        newMessage, setNewMessage,
        availableLabels,
        availableLabelsDetails,
        availableAgents,
        isAssigning,
        isLoadingConvos,
        isLoadingMessages,
        isSending,
        timeLeft24h, setTimeLeft24h,
        shouldScrollToBottom, setShouldScrollToBottom,
        showScrollBtn, setShowScrollBtn,
        selectedConvoIds, setSelectedConvoIds,
        mediaPreview, setMediaPreview,
        previewCaption, setPreviewCaption,
        isSendingMedia, setIsSendingMedia,
        tagSearchQuery, setTagSearchQuery,
        isTagDropdownOpen, setIsTagDropdownOpen,
        privateNote, setPrivateNote,
        isSavingNote, setIsSavingNote,
        confirmDeleteConvos, setConfirmDeleteConvos,
        deletingConvoId, setDeletingConvoId,
        confirmResendAgentflow, setConfirmResendAgentflow,
        isBlockModalOpen, setIsBlockModalOpen,
        isBlockingContact, setIsBlockingContact,
        isRecording, setIsRecording,
        audioSeconds, setAudioSeconds,
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
        page, setPage,
        limit, setLimit,
        totalConvos,
        hasMoreMessages,
        isLoadingMoreMessages,
        loadMoreMessages,
        handleTriggerFunnel
    };
}
