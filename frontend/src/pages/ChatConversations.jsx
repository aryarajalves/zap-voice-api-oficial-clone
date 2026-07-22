import React, { useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { FiSearch, FiSend, FiUser, FiCheckCircle, FiRefreshCw, FiTag, FiX, FiMessageSquare, FiSidebar, FiPaperclip, FiArrowDown, FiMic, FiSquare, FiHome, FiClock, FiLayers, FiUsers, FiSlash, FiCalendar, FiGlobe, FiMaximize2 } from 'react-icons/fi';
import { BsPinAngle, BsPinAngleFill, BsJournalText, BsExclamationCircle, BsExclamationCircleFill } from 'react-icons/bs';
import { fetchWithAuth } from '../AuthContext';
import { API_URL } from '../config';
import { useClient } from '../contexts/ClientContext';
import BlockContactModal from './WebhookLeads/components/BlockContactModal';
import { getFirstName } from '../utils/nameFormatter';

// Subcomponentes modularizados
import MediaPreviewModal from './ChatConversations/MediaPreviewModal';
import MaximizedInputModal from './ChatConversations/MaximizedInputModal';
import TriggerFunnelModal from './ChatConversations/TriggerFunnelModal';
import DeleteConvoModal from './ChatConversations/DeleteConvoModal';
import ResendAgentflowModal from './ChatConversations/ResendAgentflowModal';
import SendTemplateModal from './ChatConversations/SendTemplateModal';
import ChatContactSidebar from './ChatConversations/ChatContactSidebar';
import { useChatEngine } from './ChatConversations/useChatEngine';

const NAV_SHORTCUTS = [
    { view: 'webhook_integrations', label: 'Integração Webhook', icon: FiGlobe },
    { view: 'bulk_sender', label: 'Disparo em Massa', icon: FiHome },
    { view: 'history',     label: 'Histórico de Disparos', icon: FiClock },
    { view: 'funnels',     label: 'Funis', icon: FiLayers },
    { view: 'leads',       label: 'Contatos', icon: FiUsers },
];

export default function ChatConversations({ onClose, onNavigate }) {
    const { activeClient } = useClient();
    const [selectedConvo, setSelectedConvo] = React.useState(null);
    const [activeTab, setActiveTab] = React.useState('todos'); // minha, nao_atribuida, todos
    const [statusFilter, setStatusFilter] = React.useState('open'); // open, resolved
    const [searchQuery, setSearchQuery] = React.useState('');
    const [selectedLabelFilter, setSelectedLabelFilter] = React.useState(null); // filtro por etiqueta
    const [filterWindowOpen, setFilterWindowOpen] = React.useState(false); // só conversas com janela 24h aberta
    const [filterUnread, setFilterUnread] = React.useState(false); // só conversas com mensagem não lida
    const [filterHasNote, setFilterHasNote] = React.useState(false); // só conversas com anotação privada preenchida
    const [filterUrgent, setFilterUrgent] = React.useState(false); // só conversas com marcação de urgência
    const [filterHasReplied, setFilterHasReplied] = React.useState(false); // só contatos que enviaram pelo menos 1 mensagem
    const [filterBlockStatus, setFilterBlockStatus] = React.useState(null); // null | 'blocked' | 'resting'
    const [filterStartDate, setFilterStartDate] = React.useState('');
    const [filterEndDate, setFilterEndDate] = React.useState('');
    const [activeFilterTab, setActiveFilterTab] = React.useState(null); // null | 'marcador' | 'status' | 'bloqueio'
    const [showRightSidebar, setShowRightSidebar] = React.useState(true); // fechar/abrir barra lateral direita
    const [showTemplateModal, setShowTemplateModal] = React.useState(false);
    const [isMaximizedInputOpen, setIsMaximizedInputOpen] = React.useState(false);
    const [showFunnelModal, setShowFunnelModal] = React.useState(false);
    const [selectAllPages, setSelectAllPages] = React.useState(false);

    const engine = useChatEngine({
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
        filterUrgent,
        filterHasReplied,
        selectedConvo,
        setSelectedConvo
    });

    React.useEffect(() => {
        if (engine.selectedConvoIds.length === 0) {
            setSelectAllPages(false);
        }
    }, [engine.selectedConvoIds]);

    React.useEffect(() => {
        setSelectAllPages(false);
    }, [activeTab, statusFilter, searchQuery, selectedLabelFilter, filterBlockStatus, filterHasNote, filterStartDate, filterEndDate, filterUnread, filterWindowOpen]);

    const formatTime = (isoString) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Agora';
        if (diffMins < 60) return `${diffMins}m`;
        if (date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        }
        return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    };

    const formatMessageTimestamp = (isoString) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        const now = new Date();
        
        const isToday = date.toDateString() === now.toDateString();
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        const isYesterday = date.toDateString() === yesterday.toDateString();
        
        const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        
        if (isToday) {
            return `Hoje às ${timeStr}`;
        } else if (isYesterday) {
            return `Ontem às ${timeStr}`;
        } else {
            const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
            return `${dateStr} às ${timeStr}`;
        }
    };

    const getMediaSrc = (msg) => {
        if (!msg.media_url) return '';
        if (msg.media_url.startsWith('http') || msg.media_url.startsWith('/static')) {
            return msg.media_url;
        }
        if (msg.media_url.includes(':')) {
            const parts = msg.media_url.split(':');
            return `${API_URL}/chat/media/${parts[1]}?token=${localStorage.getItem('token')}&client_id=${activeClient?.id}`;
        }
        return `${API_URL}/chat/media/${msg.media_url}?token=${localStorage.getItem('token')}&client_id=${activeClient?.id}`;
    };

    // Auto-scroll to bottom
    useEffect(() => {
        if (engine.shouldScrollToBottom) {
            // Rola imediatamente
            const container = engine.messagesContainerRef.current;
            if (container) {
                container.scrollTop = container.scrollHeight;
            }
            
            // Força a rolagem após renderização completa dos componentes e imagens
            const timer = setTimeout(() => {
                engine.messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);

            engine.setShouldScrollToBottom(false);
            return () => clearTimeout(timer);
        }
    }, [engine.messages, engine.shouldScrollToBottom]);


    const handleScrollMessages = useCallback(() => {
        const container = engine.messagesContainerRef.current;
        if (!container) return;
        const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
        engine.setShowScrollBtn(distanceFromBottom > 80);

        if (container.scrollTop <= 5 && engine.hasMoreMessages && !engine.isLoadingMoreMessages) {
            const prevScrollHeight = container.scrollHeight;
            engine.loadMoreMessages().then(() => {
                setTimeout(() => {
                    if (container) {
                        container.scrollTop = container.scrollHeight - prevScrollHeight;
                    }
                }, 50);
            });
        }
    }, [engine]);

    // Limites de tamanho por tipo (em bytes) — regras da API Oficial do WhatsApp
    const MEDIA_SIZE_LIMITS = {
        image:    5  * 1024 * 1024,  // 5 MB
        video:    16 * 1024 * 1024,  // 16 MB
        audio:    16 * 1024 * 1024,  // 16 MB
        document: 100 * 1024 * 1024, // 100 MB
    };
    const MEDIA_SIZE_LABELS = {
        image: '5 MB', video: '16 MB', audio: '16 MB', document: '100 MB',
    };

    const handleMediaUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !selectedConvo) return;
        e.target.value = null;

        let messageType = 'document';
        if (file.type.startsWith('image/')) messageType = 'image';
        else if (file.type.startsWith('video/')) messageType = 'video';
        else if (file.type.startsWith('audio/')) messageType = 'audio';

        // ⚠️ Validação de tamanho antes de qualquer upload
        const sizeLimit = MEDIA_SIZE_LIMITS[messageType];
        if (file.size > sizeLimit) {
            const label = MEDIA_SIZE_LABELS[messageType];
            const fileMB = (file.size / 1024 / 1024).toFixed(1);
            toast.error(
                `Arquivo muito grande (${fileMB} MB). O WhatsApp aceita ${messageType === 'image' ? 'imagens' : messageType === 'video' ? 'vídeos' : messageType === 'audio' ? 'áudios' : 'documentos'} de até ${label}.`,
                { duration: 5000 }
            );
            return;
        }

        if (messageType === 'image' || messageType === 'video') {
            const localUrl = URL.createObjectURL(file);
            engine.setMediaPreview({ file, localUrl, messageType, fileUrl: null });
            engine.setPreviewCaption('');
            return;
        }

        await sendMedia(file, messageType, '');
    };

    const sendMedia = async (file, messageType, caption) => {
        const formData = new FormData();
        formData.append('file', file);

        const toastId = toast.loading('Fazendo upload e enviando arquivo...');
        engine.setIsSendingMedia(true);
        try {
            const uploadRes = await fetch(`${API_URL}/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'X-Client-ID': String(activeClient.id)
                },
                body: formData
            });

            if (!uploadRes.ok) {
                const errData = await uploadRes.json();
                throw new Error(errData.detail || 'Falha no upload do arquivo.');
            }

            const uploadResult = await uploadRes.json();
            const fileUrl = uploadResult.url;

            const sendRes = await fetchWithAuth(`${API_URL}/chat/conversations/${selectedConvo.id}/media`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    media_url: fileUrl,
                    message_type: messageType,
                    caption: caption || ''
                })
            }, activeClient.id);

            if (sendRes.ok) {
                const sentMsg = await sendRes.json();
                engine.setMessages(prev => [...prev, sentMsg]);
                engine.setShouldScrollToBottom(true);
                toast.success('Mídia enviada com sucesso!', { id: toastId });
                engine.loadConversations(false);
                engine.setMediaPreview(null);
                engine.setPreviewCaption('');
            } else {
                const errData = await sendRes.json();
                throw new Error(errData.detail || 'Erro ao enviar mídia.');
            }
        } catch (err) {
            toast.error(err.message || 'Erro ao enviar arquivo.', { id: toastId });
        } finally {
            engine.setIsSendingMedia(false);
        }
    };

    const startRecording = async () => {
        if (engine.timeLeft24h === 'Janela Fechada' || engine.isSending) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            engine.audioChunksRef.current = [];
            const recorder = new MediaRecorder(stream);
            recorder.ondataavailable = (e) => { if (e.data.size > 0) engine.audioChunksRef.current.push(e.data); };
            recorder.start();
            engine.mediaRecorderRef.current = recorder;
            engine.setIsRecording(true);
            engine.setAudioSeconds(0);
            engine.audioTimerRef.current = setInterval(() => engine.setAudioSeconds(s => s + 1), 1000);
        } catch (err) {
            toast.error('Permissão de microfone negada.');
        }
    };

    const stopRecordingAndSend = async () => {
        if (!engine.mediaRecorderRef.current) return;
        clearInterval(engine.audioTimerRef.current);
        engine.setIsRecording(false);
        engine.setAudioSeconds(0);

        engine.mediaRecorderRef.current.stop();
        engine.mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());

        engine.mediaRecorderRef.current.onstop = async () => {
            const blob = new Blob(engine.audioChunksRef.current, { type: 'audio/webm' });
            const file = new File([blob], `audio_${Date.now()}.webm`, { type: 'audio/webm' });
            const formData = new FormData();
            formData.append('file', file);

            const toastId = toast.loading('Enviando áudio...');
            try {
                const uploadRes = await fetch(`${API_URL}/upload`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'X-Client-ID': String(activeClient.id)
                    },
                    body: formData
                });
                if (!uploadRes.ok) throw new Error('Falha no upload do áudio.');
                const { url: fileUrl } = await uploadRes.json();

                const sendRes = await fetchWithAuth(`${API_URL}/chat/conversations/${selectedConvo.id}/media`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ media_url: fileUrl, message_type: 'audio' })
                }, activeClient.id);

                if (sendRes.ok) {
                    const sentMsg = await sendRes.json();
                    engine.setMessages(prev => [...prev, sentMsg]);
                    engine.setShouldScrollToBottom(true);
                    toast.success('Áudio enviado!', { id: toastId });
                } else {
                    const err = await sendRes.json();
                    throw new Error(err.detail || 'Erro ao enviar áudio.');
                }
            } catch (err) {
                toast.error(err.message, { id: toastId });
            }
        };
    };

    const cancelRecording = () => {
        if (!engine.mediaRecorderRef.current) return;
        clearInterval(engine.audioTimerRef.current);
        engine.mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
        engine.mediaRecorderRef.current.onstop = null;
        engine.mediaRecorderRef.current.stop();
        engine.mediaRecorderRef.current = null;
        engine.setIsRecording(false);
        engine.setAudioSeconds(0);
        toast('Gravação cancelada.');
    };

    const handleAddTagWithName = async (tagName) => {
        if (!tagName.trim() || !selectedConvo) return;
        const currentTags = selectedConvo.labels || [];
        const cleanTag = tagName.trim();
        
        if (currentTags.map(t => t.toLowerCase()).includes(cleanTag.toLowerCase())) {
            toast.error('Esta etiqueta já foi adicionada.');
            return;
        }

        const updatedTags = [...currentTags, cleanTag];
        try {
            const res = await fetchWithAuth(`${API_URL}/chat/conversations/${selectedConvo.id}/labels`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ labels: updatedTags })
            }, activeClient.id);

            if (res.ok) {
                setSelectedConvo(prev => ({ ...prev, labels: updatedTags }));
                engine.setTagSearchQuery('');
                engine.loadConversations();
                engine.loadAvailableLabels();
                toast.success('Etiqueta adicionada!');
            }
        } catch (err) {
            toast.error('Erro ao adicionar etiqueta.');
        }
    };

    const handleRemoveTag = async (tagToRemove) => {
        if (!selectedConvo) return;
        const updatedTags = (selectedConvo.labels || []).filter(t => t !== tagToRemove);
        try {
            const res = await fetchWithAuth(`${API_URL}/chat/conversations/${selectedConvo.id}/labels`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ labels: updatedTags })
            }, activeClient.id);

            if (res.ok) {
                setSelectedConvo(prev => ({ ...prev, labels: updatedTags }));
                engine.loadConversations();
                engine.loadAvailableLabels();
                toast.success('Etiqueta removida.');
            }
        } catch (err) {
            toast.error('Erro ao remover etiqueta.');
        }
    };

    const handleTogglePin = async () => {
        if (!selectedConvo) return;
        const newPinned = !selectedConvo.pinned;
        try {
            const res = await fetchWithAuth(`${API_URL}/chat/conversations/${selectedConvo.id}/pin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pinned: newPinned })
            }, activeClient.id);

            if (res.ok) {
                setSelectedConvo(prev => ({ ...prev, pinned: newPinned }));
                engine.setConversations(prev => prev.map(c => c.id === selectedConvo.id ? { ...c, pinned: newPinned } : c));
                toast.success(newPinned ? 'Conversa fixada!' : 'Conversa desafixada.');
                engine.loadConversations();
            }
        } catch (err) {
            toast.error('Erro ao fixar conversa.');
        }
    };

    const handleToggleUrgent = async () => {
        if (!selectedConvo) return;
        const newUrgent = !selectedConvo.urgent;
        try {
            const res = await fetchWithAuth(`${API_URL}/chat/conversations/${selectedConvo.id}/urgent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ urgent: newUrgent })
            }, activeClient.id);

            if (res.ok) {
                setSelectedConvo(prev => ({ ...prev, urgent: newUrgent }));
                engine.setConversations(prev => prev.map(c => c.id === selectedConvo.id ? { ...c, urgent: newUrgent } : c));
                toast.success(newUrgent ? 'Contato marcado como urgente!' : 'Marcação de urgência removida.');
                engine.loadConversations();
            }
        } catch (err) {
            toast.error('Erro ao atualizar marcação de urgência.');
        }
    };

    const handleResendToAgentFlow = async (messageId, editedContent) => {
        if (!activeClient) return;
        try {
            const res = await fetchWithAuth(`${API_URL}/chat/messages/${messageId}/resend-agentflow`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content: editedContent })
            }, activeClient.id);
            if (res.ok) {
                toast.success('Reenvio ao AgentFlow iniciado!');
            } else {
                const errData = await res.json();
                toast.error(errData.detail || 'Erro ao reenviar ao AgentFlow.');
            }
        } catch (err) {
            toast.error('Falha de rede ao reenviar mensagem.');
        }
    };

    const handleConfirmBlockContact = async (type, hours) => {
        if (!selectedConvo || !activeClient) return;
        engine.setIsBlockingContact(true);
        try {
            const endpoint = type === 'resting' ? `${API_URL}/resting/` : `${API_URL}/blocked/`;
            const body = type === 'resting'
                ? { phone: selectedConvo.phone, name: selectedConvo.contact_name, reason: 'Bloqueado via Atendimento', hours }
                : { phone: selectedConvo.phone, name: selectedConvo.contact_name, reason: 'Bloqueado via Atendimento' };

            const res = await fetchWithAuth(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            }, activeClient.id);

            if (res.ok) {
                toast.success(type === 'resting' ? 'Contato em repouso.' : 'Contato bloqueado.');
                engine.setIsBlockModalOpen(false);
                setSelectedConvo(prev => prev ? { ...prev, block_status: type === 'resting' ? 'resting' : 'blocked' } : prev);
                engine.setConversations(prev => prev.map(c => c.id === selectedConvo.id ? { ...c, block_status: type === 'resting' ? 'resting' : 'blocked' } : c));
                engine.loadConversations(false);
            }
        } catch (err) {
            toast.error('Erro ao bloquear contato.');
        } finally {
            engine.setIsBlockingContact(false);
        }
    };

    const handleUnblockContact = async () => {
        if (!selectedConvo || !activeClient) return;
        const currentStatus = selectedConvo.block_status;
        if (!currentStatus || currentStatus === 'none') return;

        const isResting = currentStatus === 'resting';
        const endpoint = isResting 
            ? `${API_URL}/resting/by_phone/${selectedConvo.phone}`
            : `${API_URL}/blocked/by_phone/${selectedConvo.phone}`;

        const loadingToast = toast.loading(isResting ? 'Removendo do repouso...' : 'Desbloqueando contato...');
        try {
            const res = await fetchWithAuth(endpoint, {
                method: 'DELETE'
            }, activeClient.id);

            if (res.ok) {
                toast.dismiss(loadingToast);
                toast.success(isResting ? 'Contato removido do repouso!' : 'Contato desbloqueado!');
                setSelectedConvo(prev => prev ? { ...prev, block_status: null } : prev);
                engine.setConversations(prev => prev.map(c => c.id === selectedConvo.id ? { ...c, block_status: null } : c));
                engine.loadConversations(false);
            } else {
                throw new Error();
            }
        } catch (err) {
            toast.dismiss(loadingToast);
            toast.error('Falha ao desbloquear o contato.');
        }
    };


    const handleSaveNote = async () => {
        if (!selectedConvo) return;
        engine.setIsSavingNote(true);
        try {
            const res = await fetchWithAuth(`${API_URL}/chat/conversations/${selectedConvo.id}/note`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ private_note: engine.privateNote })
            }, activeClient.id);

            if (res.ok) {
                const data = await res.json();
                setSelectedConvo(prev => ({ ...prev, private_note: engine.privateNote }));
                engine.setConversations(prev => prev.map(c => c.id === selectedConvo.id ? { ...c, private_note: engine.privateNote } : c));
                if (data.message) {
                    engine.setMessages(prev => [...prev, data.message]);
                    engine.setShouldScrollToBottom(true);
                }
                engine.setPrivateNote('');
                toast.success('Anotação privada salva!');
            }
        } catch (err) {
            toast.error('Erro ao salvar anotação.');
        } finally {
            engine.setIsSavingNote(false);
        }
    };

    const handleDeleteConversation = async (convoId) => {
        try {
            const res = await fetchWithAuth(`${API_URL}/chat/conversations/${convoId}`, { method: 'DELETE' }, activeClient?.id);
            if (res.ok) {
                engine.setConversations(prev => prev.filter(c => c.id !== convoId));
                engine.setSelectedConvoIds(prev => prev.filter(id => id !== convoId));
                if (selectedConvo?.id === convoId) setSelectedConvo(null);
                toast.success('Conversa deletada.');
            }
        } catch {
            toast.error('Erro ao deletar.');
        } finally {
            engine.setConfirmDeleteConvos(null);
            engine.setDeletingConvoId(null);
        }
    };

    const handleDeleteSelectedConversations = async () => {
        if (!engine.selectedConvoIds.length && !selectAllPages) return;
        
        const payload = selectAllPages ? {
            select_all_pages: true,
            tab: activeTab,
            status: statusFilter,
            search: searchQuery || undefined,
            label: selectedLabelFilter || undefined,
            block_status: filterBlockStatus || undefined,
            has_note: filterHasNote || undefined,
            start_date: filterStartDate || undefined,
            end_date: filterEndDate || undefined,
            unread_only: filterUnread || undefined,
            window_open_only: filterWindowOpen || undefined,
            has_replied: filterHasReplied || undefined
        } : {
            ids: engine.selectedConvoIds
        };

        const toastId = toast.loading(selectAllPages ? 'Deletando todas as conversas selecionadas...' : 'Deletando conversas selecionadas...');
        try {
            const res = await fetchWithAuth(`${API_URL}/chat/conversations`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }, activeClient?.id);
            if (res.ok) {
                if (selectAllPages) {
                    engine.setConversations([]);
                    setSelectedConvo(null);
                    engine.setSelectedConvoIds([]);
                    setSelectAllPages(false);
                    engine.loadConversations(true);
                } else {
                    engine.setConversations(prev => prev.filter(c => !engine.selectedConvoIds.includes(c.id)));
                    if (engine.selectedConvoIds.includes(selectedConvo?.id)) setSelectedConvo(null);
                    engine.setSelectedConvoIds([]);
                }
                toast.success('Conversas deletadas com sucesso!', { id: toastId });
            } else {
                const errData = await res.json();
                toast.error(errData.detail || 'Erro ao deletar conversas.', { id: toastId });
            }
        } catch {
            toast.error('Erro ao deletar.', { id: toastId });
        } finally {
            engine.setConfirmDeleteConvos(null);
        }
    };

    // Polling and timers
    useEffect(() => {
        engine.loadConversations(true);
        engine.loadAvailableLabels();
        const convoInterval = setInterval(() => {
            engine.loadConversations(false);
            engine.loadAvailableLabels();
        }, 5000);
        return () => clearInterval(convoInterval);
    }, [activeTab, statusFilter, searchQuery, selectedLabelFilter, filterBlockStatus, filterHasNote, filterStartDate, filterEndDate, activeClient, engine.page, engine.limit, filterUnread, filterWindowOpen, filterUrgent, filterHasReplied]);

    useEffect(() => {
        if (!selectedConvo) return;
        engine.setMessages([]);
        engine.setShouldScrollToBottom(true);
        engine.loadMessages(selectedConvo.id, true);
        engine.setPrivateNote(selectedConvo.private_note || '');


        const msgInterval = setInterval(() => {
            engine.loadMessages(selectedConvo.id, false);
        }, 3000);
        return () => clearInterval(msgInterval);
    }, [selectedConvo?.id, activeClient]);

    useEffect(() => {
        engine.loadAvailableAgents();
    }, [activeClient]);

    useEffect(() => {
        const handleSelectConvo = (event) => {
            const convo = event.detail;
            if (convo) {
                setSelectedConvo(convo);
            }
        };
        window.addEventListener('select-chat-convo', handleSelectConvo);
        return () => window.removeEventListener('select-chat-convo', handleSelectConvo);
    }, []);

    useEffect(() => {
        if (!selectedConvo || !selectedConvo.last_contact_message_at) {
            engine.setTimeLeft24h('Janela Fechada');
            return;
        }
        const updateTimer = () => {
            const lastMsg = new Date(selectedConvo.last_contact_message_at);
            const expiry = new Date(lastMsg.getTime() + 24 * 60 * 60 * 1000);
            const now = new Date();
            const diff = expiry - now;

            if (diff <= 0) {
                engine.setTimeLeft24h('Janela Fechada');
            } else {
                const hours = Math.floor(diff / 3600000);
                const minutes = Math.floor((diff % 3600000) / 60000);
                const seconds = Math.floor((diff % 60000) / 1000);
                engine.setTimeLeft24h(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
            }
        };
        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [selectedConvo?.last_contact_message_at, selectedConvo?.id]);

    const visibleConversations = engine.conversations;

    return (
        <>
        <MediaPreviewModal
            mediaPreview={engine.mediaPreview}
            previewCaption={engine.previewCaption}
            setPreviewCaption={engine.setPreviewCaption}
            isSendingMedia={engine.isSendingMedia}
            onClose={() => { engine.setMediaPreview(null); engine.setPreviewCaption(''); }}
            onSend={() => sendMedia(engine.mediaPreview.file, engine.mediaPreview.messageType, engine.previewCaption)}
        />

        <DeleteConvoModal
            isOpen={!!engine.confirmDeleteConvos}
            isBulk={engine.confirmDeleteConvos === 'bulk'}
            selectedCount={selectAllPages ? engine.totalConvos : engine.selectedConvoIds.length}
            selectAllPages={selectAllPages}
            onClose={() => { engine.setConfirmDeleteConvos(null); engine.setDeletingConvoId(null); }}
            onConfirm={engine.confirmDeleteConvos === 'bulk' ? handleDeleteSelectedConversations : () => handleDeleteConversation(engine.deletingConvoId)}
        />

        <BlockContactModal
            isOpen={engine.isBlockModalOpen}
            onClose={() => engine.setIsBlockModalOpen(false)}
            onConfirm={handleConfirmBlockContact}
            isSaving={engine.isBlockingContact}
            count={1}
            selectAllPages={false}
            targetLabel={selectedConvo ? `${selectedConvo.contact_name || selectedConvo.phone} (${selectedConvo.phone})` : null}
        />

        <ResendAgentflowModal
            isOpen={engine.confirmResendAgentflow !== null}
            onClose={() => engine.setConfirmResendAgentflow(null)}
            onConfirm={async (editedContent) => {
                const msgId = engine.confirmResendAgentflow;
                engine.setConfirmResendAgentflow(null);
                await handleResendToAgentFlow(msgId, editedContent);
            }}
            initialContent={engine.messages?.find(m => m.id === engine.confirmResendAgentflow)?.content || ""}
        />

        <SendTemplateModal
            isOpen={showTemplateModal}
            onClose={() => setShowTemplateModal(false)}
            activeClient={activeClient}
            selectedConvo={selectedConvo}
            onSendSuccess={(sentMsg) => {
                engine.setMessages(prev => [...prev, sentMsg]);
                engine.setShouldScrollToBottom(true);
            }}
        />

        <div className="flex flex-col h-screen w-screen bg-[#0f172a] text-gray-100 overflow-hidden font-sans">
            {/* Header */}
            <div className="h-16 border-b border-gray-200 dark:border-white/5 flex items-center justify-between px-6 bg-white dark:bg-[#1e293b] shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 animate-pulse">
                        <FiMessageSquare size={18} />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-gray-800 dark:text-white tracking-tight">Painel de Atendimento</h2>
                        {activeClient && <p className="text-[10px] text-gray-500">Cliente: {activeClient.name}</p>}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {NAV_SHORTCUTS.map(s => {
                        const Icon = s.icon;
                        return (
                            <button
                                key={s.view}
                                onClick={() => {
                                    if (s.view === 'bulk_sender' && onClose) {
                                        onClose();
                                    } else if (onNavigate) {
                                        onNavigate(s.view);
                                    }
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-white/5 hover:bg-blue-500/10 text-gray-600 dark:text-gray-300 hover:text-blue-500 rounded-xl transition text-xs font-semibold"
                            >
                                <Icon size={14} /> {s.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content */}
            <div className="flex flex-1 min-h-0 bg-white dark:bg-[#1e293b] overflow-hidden">
                {/* Listagem */}
                <div className="w-96 border-r border-gray-200 dark:border-white/5 flex flex-col h-full bg-gray-50/50 dark:bg-[#111827]/40 shrink-0">
                    <div className="p-4 border-b border-gray-200 dark:border-white/5 space-y-3">
                        <div className="flex gap-2">
                            {['minha', 'nao_atribuida', 'todos'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                                        activeTab === tab ? 'bg-blue-600 text-white shadow-md' : 'bg-white dark:bg-[#1e293b] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-white/5'
                                    }`}
                                >
                                    {tab === 'nao_atribuida' ? 'Não atrib.' : tab}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <select
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value)}
                                className="bg-white dark:bg-[#1e293b] text-gray-700 dark:text-gray-300 text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/5"
                            >
                                <option value="open">Abertas</option>
                                <option value="resolved">Resolvidas</option>
                                <option value="all">Todas</option>
                            </select>
                            <div className="relative flex-1">
                                <FiSearch size={14} className="absolute left-3 top-2.5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Procurar..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-[#1e293b] text-gray-700 dark:text-gray-300 text-xs rounded-lg border border-gray-200 dark:border-white/5"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Filtros extra */}
                    <div className="border-b border-gray-200 dark:border-white/5 bg-gray-50/10 dark:bg-black/10">
                        <div className="flex items-center px-4 py-2 gap-1.5">
                            {[
                                { key: 'marcador', label: 'Marcador', icon: FiTag, active: !!selectedLabelFilter },
                                { key: 'status', label: 'Status', icon: FiRefreshCw, active: filterWindowOpen || filterUnread || filterHasNote || filterUrgent || filterHasReplied },
                                { key: 'bloqueio', label: 'Bloqueio', icon: FiSlash, active: !!filterBlockStatus },
                                { key: 'data', label: 'Data', icon: FiCalendar, active: !!filterStartDate || !!filterEndDate }
                            ].map(f => (
                                <button
                                    key={f.key}
                                    onClick={() => setActiveFilterTab(prev => prev === f.key ? null : f.key)}
                                    className={`relative flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-semibold border ${
                                        activeFilterTab === f.key ? 'bg-blue-600 text-white' : 'bg-white dark:bg-[#1e293b] text-gray-500 dark:text-gray-400 border-gray-200 dark:border-white/5'
                                    }`}
                                >
                                    <f.icon size={12} /> {f.label}
                                    {f.active && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-blue-400 ring-2 ring-white" />}
                                </button>
                            ))}
                            <span className="ml-1 shrink-0 bg-blue-500/20 text-blue-400 text-[10px] font-bold px-2 py-1 rounded-full">
                                {visibleConversations.length}
                            </span>
                        </div>

                        {activeFilterTab === 'marcador' && (
                            <div className="px-4 pb-3">
                                <select
                                    value={selectedLabelFilter || ''}
                                    onChange={e => setSelectedLabelFilter(e.target.value || null)}
                                    className="bg-white dark:bg-[#1e293b] text-gray-700 dark:text-gray-300 text-xs w-full py-1.5 rounded-lg border"
                                >
                                    <option value="">Todos</option>
                                    {engine.availableLabels.map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                            </div>
                        )}

                        {activeFilterTab === 'status' && (
                             <div className="px-4 pb-3 flex gap-1 flex-wrap">
                                 <button
                                     onClick={() => setFilterWindowOpen(!filterWindowOpen)}
                                     className={`flex-1 py-1.5 px-1 rounded-lg border text-[10px] font-semibold truncate ${filterWindowOpen ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'text-gray-400 border-gray-200 dark:border-white/5 bg-white dark:bg-[#1e293b]'}`}
                                 >
                                     Janela 24h
                                 </button>
                                 <button
                                     onClick={() => setFilterUnread(!filterUnread)}
                                     className={`flex-1 py-1.5 px-1 rounded-lg border text-[10px] font-semibold truncate ${filterUnread ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'text-gray-400 border-gray-200 dark:border-white/5 bg-white dark:bg-[#1e293b]'}`}
                                 >
                                     Não lidas
                                 </button>
                                 <button
                                     onClick={() => setFilterHasNote(!filterHasNote)}
                                     className={`flex-1 py-1.5 px-1 rounded-lg border text-[10px] font-semibold truncate ${filterHasNote ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' : 'text-gray-400 border-gray-200 dark:border-white/5 bg-white dark:bg-[#1e293b]'}`}
                                 >
                                     Anotações
                                 </button>
                                 <button
                                     onClick={() => setFilterUrgent(!filterUrgent)}
                                     className={`flex-1 py-1.5 px-1 rounded-lg border text-[10px] font-semibold truncate ${filterUrgent ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'text-gray-400 border-gray-200 dark:border-white/5 bg-white dark:bg-[#1e293b]'}`}
                                 >
                                     Urgentes
                                 </button>
                                 <button
                                     onClick={() => setFilterHasReplied(!filterHasReplied)}
                                     className={`flex-1 py-1.5 px-1 rounded-lg border text-[10px] font-semibold truncate ${filterHasReplied ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' : 'text-gray-400 border-gray-200 dark:border-white/5 bg-white dark:bg-[#1e293b]'}`}
                                     title="Filtrar contatos que enviaram pelo menos 1 mensagem"
                                 >
                                     Respondeu
                                 </button>
                             </div>
                         )}

                         {activeFilterTab === 'bloqueio' && (
                             <div className="px-4 pb-3 flex gap-2">
                                 <button
                                     onClick={() => setFilterBlockStatus(v => v === 'blocked' ? null : 'blocked')}
                                     className={`flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                                         filterBlockStatus === 'blocked'
                                             ? 'bg-red-500/20 border-red-500/40 text-red-400'
                                             : 'bg-transparent border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-red-500/40 hover:text-red-400'
                                     }`}
                                 >
                                     <FiSlash size={12} />
                                     Bloqueados
                                 </button>

                                 <button
                                     onClick={() => setFilterBlockStatus(v => v === 'resting' ? null : 'resting')}
                                     className={`flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                                         filterBlockStatus === 'resting'
                                             ? 'bg-orange-500/20 border-orange-500/40 text-orange-400'
                                             : 'bg-transparent border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-orange-500/40 hover:text-orange-400'
                                     }`}
                                 >
                                     <FiClock size={12} />
                                     Em repouso
                                 </button>
                             </div>
                         )}

                         {activeFilterTab === 'data' && (
                             <div className="px-4 pb-3 space-y-2">
                                 <div className="flex gap-2">
                                     <div className="flex-1">
                                         <label className="text-[9px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500 block mb-1">De</label>
                                         <input
                                             type="date"
                                             value={filterStartDate}
                                             onChange={(e) => setFilterStartDate(e.target.value)}
                                             className="w-full bg-white dark:bg-[#1e293b] text-gray-700 dark:text-gray-300 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-white/5 focus:outline-none"
                                         />
                                     </div>
                                     <div className="flex-1">
                                         <label className="text-[9px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500 block mb-1">Até</label>
                                         <input
                                             type="date"
                                             value={filterEndDate}
                                             onChange={(e) => setFilterEndDate(e.target.value)}
                                             className="w-full bg-white dark:bg-[#1e293b] text-gray-700 dark:text-gray-300 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-white/5 focus:outline-none"
                                         />
                                     </div>
                                 </div>
                                 {(filterStartDate || filterEndDate) && (
                                     <button
                                         onClick={() => {
                                             setFilterStartDate('');
                                             setFilterEndDate('');
                                         }}
                                         className="text-left text-[11px] text-red-500 hover:text-red-600 font-semibold mt-1 block"
                                     >
                                         Limpar Filtro de Data
                                     </button>
                                 )}
                             </div>
                         )}
                    </div>
                    {/* Barra de seleção em massa */}
                     {visibleConversations.length > 0 && (
                         <div className="px-4 py-2 border-b border-gray-200 dark:border-white/5 flex items-center gap-2 bg-gray-50/30 dark:bg-black/10">
                             <button
                                 onClick={() => {
                                     const allIds = visibleConversations.map(c => c.id);
                                     const allSelected = allIds.every(id => engine.selectedConvoIds.includes(id));
                                     if (allSelected) {
                                         engine.setSelectedConvoIds(prev => prev.filter(id => !allIds.includes(id)));
                                         setSelectAllPages(false);
                                     } else {
                                         engine.setSelectedConvoIds(prev => [...new Set([...prev, ...allIds])]);
                                     }
                                 }}
                                 className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 font-medium transition-colors"
                             >
                                 <input
                                     type="checkbox"
                                     readOnly
                                     checked={visibleConversations.length > 0 && (selectAllPages || visibleConversations.every(c => engine.selectedConvoIds.includes(c.id)))}
                                     className="rounded border-gray-300 text-blue-600 pointer-events-none"
                                 />
                                 Selecionar todas
                             </button>
                             {(selectAllPages || engine.selectedConvoIds.length > 0) && (
                                 <button
                                     onClick={() => engine.setConfirmDeleteConvos('bulk')}
                                     className="ml-auto flex items-center gap-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 dark:text-red-400 px-2.5 py-1 rounded-lg text-xs font-semibold transition border border-red-500/20"
                                 >
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                     Deletar ({selectAllPages ? engine.totalConvos : engine.selectedConvoIds.length})
                                 </button>
                             )}
                         </div>
                     )}
                      {visibleConversations.length > 0 && (selectAllPages || visibleConversations.every(c => engine.selectedConvoIds.includes(c.id))) && engine.totalConvos > visibleConversations.length && (
                         <div className="px-4 py-2 border-b border-blue-500/20 bg-blue-500/10 dark:bg-blue-500/5 text-xs text-gray-700 dark:text-gray-300 flex items-center justify-between shrink-0">
                             {selectAllPages ? (
                                 <span>Todos os <strong>{engine.totalConvos}</strong> contatos de todas as páginas estão selecionados.</span>
                             ) : (
                                 <span>Todos os <strong>{visibleConversations.length}</strong> contatos desta página estão selecionados.</span>
                             )}
                             <button
                                 onClick={() => {
                                     if (selectAllPages) {
                                         engine.setSelectedConvoIds([]);
                                         setSelectAllPages(false);
                                     } else {
                                         setSelectAllPages(true);
                                     }
                                 }}
                                 className="text-blue-500 hover:text-blue-600 font-semibold transition"
                             >
                                 {selectAllPages ? `Deselecionar todos os ${engine.totalConvos} contatos` : `Selecionar todos os ${engine.totalConvos} contatos`}
                             </button>
                         </div>
                     )}

                     {/* Lista */}
                     <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-white/5">
                         {visibleConversations.map(convo => {
                             const isSelected = selectedConvo?.id === convo.id;
                             const isChecked = selectAllPages || engine.selectedConvoIds.includes(convo.id);
                             const initials = (convo.contact_name || convo.phone || 'C')
                                 .split(' ')
                                 .map(w => w[0])
                                 .slice(0, 2)
                                 .join('')
                                 .toUpperCase();

                             return (
                                 <div
                                     key={convo.id}
                                     className={`relative group/convo p-4 cursor-pointer transition-all flex gap-3 items-center ${
                                         isSelected
                                         ? 'bg-blue-50/50 dark:bg-blue-900/10 border-l-4 border-blue-600'
                                         : isChecked
                                         ? 'bg-red-50/30 dark:bg-red-900/10 border-l-4 border-red-400'
                                         : 'hover:bg-gray-100/50 dark:hover:bg-white/5'
                                     }`}
                                 >
                                     <input
                                         type="checkbox"
                                         checked={isChecked}
                                         onChange={e => {
                                             e.stopPropagation();
                                             if (selectAllPages) {
                                                 setSelectAllPages(false);
                                                 const pageIdsExceptThis = visibleConversations.map(c => c.id).filter(id => id !== convo.id);
                                                 engine.setSelectedConvoIds(pageIdsExceptThis);
                                             } else {
                                                 engine.setSelectedConvoIds(prev => isChecked ? prev.filter(id => id !== convo.id) : [...prev, convo.id]);
                                             }
                                         }}
                                         onClick={e => e.stopPropagation()}
                                         className="rounded border-gray-300 text-blue-600 shrink-0 cursor-pointer"
                                     />
                                     <div
                                         className="flex flex-1 gap-3 items-center min-w-0"
                                         onClick={() => setSelectedConvo(convo)}
                                     >
                                         <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm tracking-wide shrink-0">
                                             {initials}
                                         </div>
                                         <div className="flex-1 min-w-0">
                                             <div className="flex justify-between items-baseline mb-1 pr-8">
                                                 <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-200 truncate pr-2 flex items-center gap-1.5">
                                                     {convo.pinned && <BsPinAngleFill className="text-blue-500 rotate-45 shrink-0" size={12} title="Fixada" />}
                                                     {convo.urgent && <BsExclamationCircleFill className="text-red-500 shrink-0 animate-pulse" size={12} title="Urgente" />}
                                                     {convo.contact_name ? getFirstName(convo.contact_name) : convo.phone}
                                                 </h4>
                                                 <span className="text-[10px] text-gray-400 shrink-0">{formatTime(convo.last_message_at)}</span>
                                             </div>
                                             <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-1">{convo.last_message_content || 'Nenhuma mensagem'}</p>
                                             
                                             {/* Badges de bloqueio/repouso e atendente atribuído */}
                                             {(convo.block_status || convo.assigned_user_name) && (
                                                 <div className="mb-1 flex flex-wrap gap-1">
                                                     {convo.block_status === 'blocked' && (
                                                         <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border text-red-400 border-red-500/30 bg-red-500/10">
                                                             <FiSlash size={9} /> Bloqueado
                                                         </span>
                                                     )}
                                                     {convo.block_status === 'resting' && (
                                                         <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border text-orange-400 border-orange-500/30 bg-orange-500/10">
                                                             <FiClock size={9} /> Repouso
                                                         </span>
                                                     )}
                                                     {convo.assigned_user_name && (
                                                         <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border text-blue-400 border-blue-500/30 bg-blue-500/10">
                                                             <FiUser size={9} /> {convo.assigned_user_name}
                                                         </span>
                                                     )}
                                                 </div>
                                             )}

                                             {/* Marcadores/Etiquetas coloridas do card */}
                                             {convo.labels && convo.labels.length > 0 && (
                                                 <div className="flex flex-wrap gap-1">
                                                     {convo.labels.map(label => {
                                                         const labelColor = engine.getLabelColor(label);
                                                         return (
                                                             <span
                                                                 key={label}
                                                                 style={{
                                                                     color: labelColor,
                                                                     borderColor: labelColor + '33',
                                                                     backgroundColor: labelColor + '15'
                                                                 }}
                                                                 className="text-[9px] font-bold px-1.5 py-0.5 rounded border"
                                                             >
                                                                 {label}
                                                             </span>
                                                         );
                                                     })}
                                                 </div>
                                             )}
                                         </div>
                                         {convo.unread_count > 0 && <span className="bg-emerald-500 text-white font-bold text-[10px] px-2 py-0.5 rounded-full shrink-0">{convo.unread_count}</span>}
                                     </div>

                                     {/* Botão delete individual (aparece no hover, cinza, centralizado verticalmente) */}
                                     <button
                                         onClick={(e) => {
                                             e.stopPropagation();
                                             engine.setDeletingConvoId(convo.id);
                                             engine.setConfirmDeleteConvos('single');
                                         }}
                                         className="absolute right-2 inset-y-0 my-auto h-fit opacity-0 group-hover/convo:opacity-100 p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-600 dark:bg-red-500/20 dark:hover:bg-red-500/30 dark:text-red-400 dark:hover:text-red-300 rounded-lg transition"
                                     >
                                         <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                     </button>
                                 </div>
                             );
                         })}
                     </div>

                     {/* Paginação */}
                     <div className="px-4 py-3 border-t border-gray-200 dark:border-white/5 flex items-center justify-between bg-gray-50/50 dark:bg-black/10 text-xs text-gray-500 dark:text-gray-400 shrink-0 select-none">
                         <div className="flex items-center gap-1.5">
                             <span>Exibir:</span>
                             <select
                                 value={engine.limit}
                                 onChange={(e) => {
                                     engine.setLimit(Number(e.target.value));
                                     engine.setPage(1);
                                 }}
                                 className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-white/10 rounded px-1.5 py-0.5 text-xs text-gray-700 dark:text-gray-200 outline-none focus:border-blue-500"
                             >
                                 <option value={20}>20</option>
                                 <option value={50}>50</option>
                                 <option value={100}>100</option>
                                 <option value={200}>200</option>
                             </select>
                         </div>
                         
                         <div className="flex items-center gap-2">
                             <button
                                 disabled={engine.page <= 1}
                                 onClick={() => engine.setPage(prev => Math.max(prev - 1, 1))}
                                 className="p-1.5 rounded-lg border border-gray-300 dark:border-white/10 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-white/5 transition"
                             >
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                             </button>
                             
                             <span className="font-medium">
                                 {engine.page} / {Math.ceil(engine.totalConvos / engine.limit) || 1}
                             </span>
                             
                             <button
                                 disabled={engine.page >= Math.ceil(engine.totalConvos / engine.limit)}
                                 onClick={() => engine.setPage(prev => prev + 1)}
                                 className="p-1.5 rounded-lg border border-gray-300 dark:border-white/10 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-white/5 transition"
                             >
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                             </button>
                         </div>
                     </div>

                </div>

                {/* Chat Ativo */}
                <div className="flex-1 flex flex-col h-full bg-white dark:bg-[#0f172a]">
                    {selectedConvo ? (
                        <>
                            {/* Header do Chat */}
                            <div className="p-4 border-b border-gray-200 dark:border-white/5 flex justify-between items-center bg-gray-50/20 dark:bg-[#111827]/20">
                                <div>
                                    <h3 className="font-bold text-gray-800 dark:text-white text-base flex items-center gap-2">
                                        {selectedConvo.contact_name ? getFirstName(selectedConvo.contact_name) : selectedConvo.phone}
                                        <span className="text-xs font-semibold px-2 py-0.5 bg-gray-200/60 dark:bg-slate-800/80 text-gray-600 dark:text-gray-400 rounded-lg">
                                            ID: {selectedConvo.id}
                                        </span>
                                    </h3>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {selectedConvo.phone}
                                        </span>
                                        {!showRightSidebar && (
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                                engine.timeLeft24h === 'Janela Fechada'
                                                ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                                                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                            }`}>
                                                {engine.timeLeft24h === 'Janela Fechada' ? '🔴 Janela Fechada' : `🟢 Janela 24h: ${engine.timeLeft24h}`}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleTogglePin}
                                        title={selectedConvo.pinned ? "Desafixar conversa" : "Fixar conversa"}
                                        className={`p-2 rounded-xl border transition-all ${
                                            selectedConvo.pinned
                                            ? 'bg-blue-600 text-white border-transparent'
                                            : 'bg-white dark:bg-[#1e293b] border-gray-200 dark:border-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                                        }`}
                                    >
                                        {selectedConvo.pinned ? <BsPinAngleFill size={16} /> : <BsPinAngle size={16} />}
                                    </button>

                                    <button
                                        onClick={handleToggleUrgent}
                                        title={selectedConvo.urgent ? "Remover urgência" : "Marcar como urgente"}
                                        className={`p-2 rounded-xl border transition-all ${
                                            selectedConvo.urgent
                                            ? 'bg-red-600 text-white border-transparent'
                                            : 'bg-white dark:bg-[#1e293b] border-gray-200 dark:border-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                                        }`}
                                    >
                                        {selectedConvo.urgent ? <BsExclamationCircleFill size={16} /> : <BsExclamationCircle size={16} />}
                                    </button>

                                    {engine.timeLeft24h !== 'Janela Fechada' && (
                                        <button
                                            onClick={() => setShowFunnelModal(true)}
                                            title="Disparar Funil"
                                            className="p-2 rounded-xl border bg-white dark:bg-[#1e293b] border-gray-200 dark:border-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                                        >
                                            <FiLayers size={16} />
                                        </button>
                                    )}

                                    <button
                                        onClick={() => {
                                            if (selectedConvo.block_status === 'blocked' || selectedConvo.block_status === 'resting') {
                                                handleUnblockContact();
                                            } else {
                                                engine.setIsBlockModalOpen(true);
                                            }
                                        }}
                                        title={
                                            selectedConvo.block_status === 'blocked'
                                                ? 'Contato bloqueado permanentemente — clique para desbloquear'
                                                : selectedConvo.block_status === 'resting'
                                                ? 'Contato em repouso temporário — clique para remover do repouso'
                                                : 'Bloquear ou colocar em repouso'
                                        }
                                        className={`p-2 rounded-xl border transition-all ${
                                            selectedConvo.block_status === 'blocked'
                                                ? 'bg-red-500/10 border-red-500/30 text-red-500'
                                                : selectedConvo.block_status === 'resting'
                                                ? 'bg-orange-500/10 border-orange-500/30 text-orange-500'
                                                : 'bg-white dark:bg-[#1e293b] border-gray-200 dark:border-white/5 text-gray-600 dark:text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:border-orange-200 dark:hover:border-orange-800/30'
                                        }`}
                                    >
                                        <FiSlash size={16} />
                                    </button>

                                    <button
                                        onClick={engine.handleToggleStatus}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                                            selectedConvo.status === 'resolved'
                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                            : 'bg-blue-600 text-white border-transparent hover:bg-blue-700'
                                        }`}
                                    >
                                        <FiCheckCircle size={14} />
                                        {selectedConvo.status === 'resolved' ? 'Resolvida' : 'Resolver'}
                                    </button>

                                    <button
                                        onClick={() => setShowRightSidebar(!showRightSidebar)}
                                        title={showRightSidebar ? "Fechar detalhes" : "Abrir detalhes"}
                                        className={`p-2 rounded-xl border transition-all ${
                                            showRightSidebar
                                            ? 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400'
                                            : 'bg-white dark:bg-[#1e293b] border-gray-200 dark:border-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                                        }`}
                                    >
                                        <FiSidebar size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Banner do Funil Ativo */}
                            {selectedConvo.active_funnel && (
                                <div className="bg-blue-600/10 border-b border-blue-500/20 px-6 py-2.5 flex items-center justify-between text-xs text-blue-400 font-medium">
                                    <div className="flex items-center gap-2">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                        </span>
                                        <span>
                                            Funil em execução para este contato: <strong>{selectedConvo.active_funnel.name}</strong> 
                                            <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/20 text-blue-300 uppercase">
                                                {selectedConvo.active_funnel.status === 'queued' ? 'Aguardando' : 
                                                 selectedConvo.active_funnel.status === 'processing' ? 'Processando' : 
                                                 selectedConvo.active_funnel.status === 'suspended' ? 'Pausado (Aguardando resposta)' : 
                                                 selectedConvo.active_funnel.status === 'paused_waiting_delivery' ? 'Aguardando entrega' : 
                                                 selectedConvo.active_funnel.status}
                                            </span>
                                        </span>
                                    </div>
                                    <div className="text-[10px] text-gray-400">
                                        Atualiza automaticamente
                                    </div>
                                </div>
                            )}

                            {/* Mensagens */}
                            <div
                                ref={engine.messagesContainerRef}
                                onScroll={handleScrollMessages}
                                className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f8fafc] dark:bg-[#0b0f19] relative"
                            >
                                {/* Modal de Carregamento Premium Centralizado */}
                                {engine.isLoadingMessages && (
                                    <div className="absolute inset-0 bg-[#0b0f19]/70 backdrop-blur-[2px] z-50 flex items-center justify-center transition-all duration-200">
                                        <div className="bg-[#1e293b]/90 border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-3 max-w-[240px] text-center">
                                            <div className="relative flex items-center justify-center w-12 h-12">
                                                <div className="absolute inset-0 rounded-full border-2 border-white/5"></div>
                                                <div className="absolute inset-0 rounded-full border-2 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
                                                <FiRefreshCw className="text-blue-500 animate-pulse" size={16} />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-semibold text-white">Carregando conversa</h4>
                                                <p className="text-[11px] text-gray-400 mt-1">Buscando mensagens...</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {engine.messages.map(msg => {
                                        const isSystem = msg.sender_type === 'system';
                                        const isMe = msg.sender_type === 'user';

                                        if (isSystem) {
                                            const isPrivateNote = msg.content && msg.content.startsWith("🔒 Anotação Privada:");
                                            if (isPrivateNote) {
                                                return (
                                                    <div key={msg.id} className="flex justify-center my-2">
                                                        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 rounded-xl px-4 py-2.5 shadow-sm text-xs max-w-lg w-full">
                                                            <div className="flex items-center gap-1.5 font-bold mb-1 uppercase tracking-wider text-[10px] text-amber-600 dark:text-amber-400">
                                                                <BsJournalText size={12} />
                                                                <span>Anotação Interna / Nota Privada</span>
                                                            </div>
                                                            <p className="whitespace-pre-wrap leading-relaxed font-sans">{msg.content.replace("🔒 Anotação Privada: ", "")}</p>
                                                            <div className="flex justify-end mt-1 text-[9px] opacity-75 font-medium tracking-wide">
                                                                {formatMessageTimestamp(msg.timestamp)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            } else {
                                                // Mensagem normal do sistema (ex: etiqueta adicionada, conversa atribuída)
                                                return (
                                                    <div key={msg.id} className="flex justify-center my-2 animate-in fade-in duration-300">
                                                        <div className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/5 text-gray-600 dark:text-gray-400 rounded-lg px-3 py-1.5 shadow-sm text-[11px] max-w-md text-center">
                                                            <p className="font-medium font-sans leading-relaxed">{msg.content}</p>
                                                            <div className="text-[9px] opacity-60 mt-0.5">
                                                                {formatMessageTimestamp(msg.timestamp)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                        }

                                        const isTemplate = msg.meta_data && msg.meta_data.is_template;
                                         
                                        return (
                                            <div
                                                key={msg.id}
                                                className={`flex ${isMe ? 'justify-end' : 'justify-start'} group/msg ${msg.meta_data?.reactions?.length > 0 ? 'mb-4' : ''}`}
                                            >
                                                <div
                                                    className={`relative max-w-lg rounded-2xl px-4 py-2.5 shadow-sm text-sm ${
                                                        isTemplate
                                                        ? 'bg-gradient-to-br from-[#1e1b4b] to-[#1e293b] text-gray-100 border border-indigo-500/30 rounded-tr-none'
                                                        : isMe
                                                        ? 'bg-blue-600 text-white rounded-tr-none'
                                                        : 'bg-white dark:bg-[#1e293b] text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-white/5 rounded-tl-none'
                                                    }`}
                                                >
                                                    {/* Se for template, exibe badge superior exclusivo */}
                                                    {isTemplate && (
                                                        <div className="flex items-center gap-1.5 text-[9px] uppercase font-bold tracking-wider text-indigo-300 mb-2 bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-500/20 w-fit">
                                                            <BsJournalText size={11} className="text-indigo-400" />
                                                            <span>WhatsApp Template: {msg.meta_data.template_name}</span>
                                                        </div>
                                                    )}

                                                    {/* Se for template e contiver mídia no cabeçalho */}
                                                    {isTemplate && msg.meta_data.header && msg.meta_data.header.format !== 'TEXT' && (
                                                        <div className="mb-2 p-2 bg-black/35 rounded-lg flex flex-col gap-2 text-xs text-indigo-200 border border-white/5 overflow-hidden">
                                                            {msg.media_url ? (
                                                                <div className="w-full">
                                                                    {msg.meta_data.header.format === 'IMAGE' && (
                                                                        <img 
                                                                            src={getMediaSrc(msg)} 
                                                                            alt="Template Header" 
                                                                            loading="lazy"
                                                                            className="rounded-lg max-w-full h-auto max-h-60 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                                                                            onClick={() => window.open(getMediaSrc(msg), '_blank')}
                                                                        />
                                                                    )}
                                                                    {msg.meta_data.header.format === 'VIDEO' && (
                                                                        <video 
                                                                            src={getMediaSrc(msg)} 
                                                                            controls 
                                                                            className="rounded-lg max-w-full max-h-60"
                                                                        />
                                                                    )}
                                                                    {msg.meta_data.header.format === 'DOCUMENT' && (
                                                                        <a 
                                                                            href={getMediaSrc(msg)} 
                                                                            target="_blank" 
                                                                            rel="noopener noreferrer"
                                                                            className="flex items-center gap-2 p-2 bg-indigo-950/60 hover:bg-indigo-900/40 text-indigo-200 rounded-lg transition"
                                                                        >
                                                                            <span>📄 Baixar Documento</span>
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-2">
                                                                    {msg.meta_data.header.format === 'IMAGE' && <span>🖼️ Mídia de Cabeçalho: [Imagem vinculada]</span>}
                                                                    {msg.meta_data.header.format === 'VIDEO' && <span>🎥 Mídia de Cabeçalho: [Vídeo vinculado]</span>}
                                                                    {msg.meta_data.header.format === 'DOCUMENT' && <span>📄 Mídia de Cabeçalho: [Documento vinculado]</span>}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Renderizador de Mídias Normais (Não-Template) */}
                                                    {msg.media_url && !isTemplate ? (
                                                        <div className="space-y-1.5 font-sans">
                                                            {msg.message_type === 'image' && (
                                                                <img 
                                                                    src={getMediaSrc(msg)} 
                                                                    alt="Imagem" 
                                                                    loading="lazy"
                                                                    className="rounded-lg max-w-full h-auto max-h-60 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                                                                    onClick={() => window.open(getMediaSrc(msg), '_blank')}
                                                                />
                                                            )}
                                                            {msg.message_type === 'sticker' && (
                                                                <img 
                                                                    src={getMediaSrc(msg)} 
                                                                    alt="Sticker" 
                                                                    loading="lazy"
                                                                    className="w-32 h-32 object-contain"
                                                                />
                                                            )}
                                                            {msg.message_type === 'video' && (
                                                                <video 
                                                                    src={getMediaSrc(msg)} 
                                                                    controls 
                                                                    className="rounded-lg max-w-full max-h-60"
                                                                />
                                                            )}
                                                            {(msg.message_type === 'audio' || msg.message_type === 'voice') && (
                                                                <audio 
                                                                    src={getMediaSrc(msg)} 
                                                                    controls 
                                                                    className="max-w-full"
                                                                />
                                                            )}
                                                            {msg.message_type === 'document' && (
                                                                <a 
                                                                    href={getMediaSrc(msg)} 
                                                                    target="_blank" 
                                                                    rel="noopener noreferrer"
                                                                    className="flex items-center gap-2 text-xs font-bold underline bg-gray-100 dark:bg-black/20 p-2.5 rounded-lg text-blue-600 dark:text-blue-400"
                                                                >
                                                                    📎 Baixar Documento
                                                                </a>
                                                            )}
                                                            {/* Legenda opcional */}
                                                            {msg.content && msg.content !== "📷 Imagem recebida" && msg.content !== "📷 Imagem enviada" && msg.content !== "🎥 Vídeo recebido" && msg.content !== "🎥 Vídeo enviado" && msg.content !== "📄 Documento recebido" && msg.content !== "📄 Documento enviado" && msg.content !== "🎵 Áudio recebido" && msg.content !== "🎵 Áudio enviado" && msg.content !== "✨ Sticker recebido" && (
                                                                <p className="whitespace-pre-wrap leading-relaxed mt-1.5">{msg.content}</p>
                                                            )}
                                                        </div>
                                                    ) : isTemplate && msg.content && msg.content.startsWith("[Template:") ? (
                                                        <div className="space-y-1">
                                                            <p className="whitespace-pre-wrap leading-relaxed font-semibold text-indigo-200">
                                                                📢 Template enviado: {msg.meta_data?.template_name || msg.content.replace("[Template: ", "").replace("]", "")}
                                                            </p>
                                                            <p className="text-[10px] text-gray-400 dark:text-gray-500 italic mt-0.5 leading-snug">
                                                                Sincronize os templates nas configurações para carregar o vídeo e texto desta mensagem no painel.
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                                    )}
                                                    
                                                    {/* Se for template e contiver botões interativos */}
                                                    {isTemplate && msg.meta_data.buttons && msg.meta_data.buttons.length > 0 && (
                                                        <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-2.5 border-t border-white/10">
                                                            {msg.meta_data.buttons.map((btnText, i) => (
                                                                <div key={i} className="bg-white/5 hover:bg-white/10 border border-white/10 text-white/90 text-center py-1.5 px-3 rounded-lg text-xs font-medium cursor-not-allowed select-none flex items-center justify-center gap-1.5 transition-all">
                                                                    <span>{btnText}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                     <div className="flex justify-between items-center mt-2 gap-3">
                                                         <div>
                                                             {msg.id === engine.lastContactMessage?.id && (
                                                                 <button
                                                                     onClick={() => engine.setConfirmResendAgentflow(msg.id)}
                                                                     title="Reenviar esta última mensagem para o Webhook de Integração (AgentFlow)"
                                                                     className="text-[10px] text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-bold flex items-center gap-1 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full transition border border-blue-200 dark:border-blue-800/40"
                                                                 >
                                                                     <FiSend size={10} /> Reenviar ao AgentFlow
                                                                 </button>
                                                             )}
                                                         </div>
                                                        <span className="text-[9px] opacity-75 font-medium tracking-wide">
                                                            {formatMessageTimestamp(msg.timestamp)}
                                                        </span>
                                                    </div>

                                                    {/* Badge de reação — dentro do div relative da bolha */}
                                                    {msg.meta_data?.reactions?.length > 0 && (
                                                        <div className={`absolute -bottom-3 ${isMe ? 'left-2' : 'right-2'} flex gap-0.5`}>
                                                            {msg.meta_data.reactions.map((r, i) => (
                                                                <span
                                                                    key={i}
                                                                    className="text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-full px-1.5 py-0.5 shadow-sm leading-none"
                                                                    title={r.sender === 'contact' ? 'Contato reagiu' : 'Você reagiu'}
                                                                >
                                                                    {r.emoji}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                }
                                <div ref={engine.messagesEndRef} />

                            </div>

                            {/* Input de Envio */}
                            <form onSubmit={engine.handleSendMessage} className="p-4 border-t border-gray-200 dark:border-white/5 bg-gray-50/20 dark:bg-[#111827]/20 flex gap-2 relative">
                                {/* Upload de arquivos de mídia */}
                                <input
                                    type="file"
                                    id="chat-media-upload"
                                    className="hidden"
                                    onChange={handleMediaUpload}
                                    accept="image/*,video/*,audio/*,application/pdf"
                                    disabled={engine.isSending || engine.timeLeft24h === 'Janela Fechada'}
                                />
                                {!engine.isRecording && (
                                    <button
                                        type="button"
                                        onClick={() => document.getElementById('chat-media-upload').click()}
                                        disabled={engine.isSending || engine.timeLeft24h === 'Janela Fechada'}
                                        className="p-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 rounded-xl transition-all flex items-center justify-center shrink-0 disabled:opacity-50 disabled:pointer-events-none"
                                        title={engine.timeLeft24h === 'Janela Fechada' ? "Janela Fechada" : "Enviar Mídia ou Documento"}
                                    >
                                        <FiPaperclip size={18} />
                                    </button>
                                )}

                                {!engine.isRecording && (
                                    <button
                                        type="button"
                                        onClick={() => setShowTemplateModal(true)}
                                        disabled={engine.isSending}
                                        className="p-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 rounded-xl transition-all flex items-center justify-center shrink-0 disabled:opacity-50 disabled:pointer-events-none"
                                        title="Enviar Template (WhatsApp)"
                                    >
                                        <BsJournalText size={18} />
                                    </button>
                                )}

                                {!engine.isRecording && (
                                    <button
                                        type="button"
                                        onClick={() => setIsMaximizedInputOpen(true)}
                                        disabled={engine.isSending || engine.timeLeft24h === 'Janela Fechada'}
                                        className="p-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 rounded-xl transition-all flex items-center justify-center shrink-0 disabled:opacity-50 disabled:pointer-events-none"
                                        title="Maximizar campo de texto"
                                    >
                                        <FiMaximize2 size={18} />
                                    </button>
                                )}

                                {engine.isRecording ? (
                                    /* Estado de gravação ativa */
                                    <div className="flex-1 flex items-center gap-3 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-xl">
                                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                                        <span className="text-red-500 dark:text-red-400 text-sm font-medium flex-1">
                                            Gravando... {String(Math.floor(engine.audioSeconds / 60)).padStart(2, '0')}:{String(engine.audioSeconds % 60).padStart(2, '0')}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={cancelRecording}
                                            className="text-gray-500 hover:text-red-500 transition-colors text-xs font-medium px-2"
                                            title="Cancelar gravação"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                ) : (
                                    <input
                                        type="text"
                                        placeholder={engine.timeLeft24h === 'Janela Fechada' ? "Janela de 24h fechada. O cliente precisa enviar uma nova mensagem." : "Digite sua mensagem de resposta..."}
                                        value={engine.newMessage}
                                        onChange={(e) => engine.setNewMessage(e.target.value)}
                                        className="flex-1 px-4 py-2.5 bg-white dark:bg-[#1e293b] text-gray-700 dark:text-gray-200 text-sm rounded-xl border border-gray-200 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-55 disabled:bg-gray-100 dark:disabled:bg-gray-800"
                                        disabled={engine.isSending || engine.timeLeft24h === 'Janela Fechada'}
                                    />
                                )}

                                {/* Botão de microfone / parar gravação */}
                                {!engine.newMessage.trim() && (
                                    <button
                                        type="button"
                                        onClick={engine.isRecording ? stopRecordingAndSend : startRecording}
                                        disabled={engine.isSending || engine.timeLeft24h === 'Janela Fechada'}
                                        className={`p-2.5 rounded-xl transition-all flex items-center justify-center shrink-0 disabled:opacity-50 disabled:pointer-events-none ${
                                            engine.isRecording
                                            ? 'bg-red-500 hover:bg-red-600 text-white'
                                            : 'bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300'
                                        }`}
                                        title={engine.isRecording ? "Enviar áudio" : "Gravar áudio"}
                                    >
                                        {engine.isRecording ? <FiSquare size={18} /> : <FiMic size={18} />}
                                    </button>
                                )}

                                {/* Botão enviar texto (aparece quando há texto digitado) */}
                                {engine.newMessage.trim() && !engine.isRecording && (
                                    <button
                                        type="submit"
                                        disabled={engine.isSending || !engine.newMessage.trim() || engine.timeLeft24h === 'Janela Fechada'}
                                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 flex items-center justify-center transition-all disabled:opacity-50"
                                    >
                                        {engine.isSending ? (
                                            <FiRefreshCw className="animate-spin" size={16} />
                                        ) : (
                                            <FiSend size={16} />
                                        )}
                                    </button>
                                )}

                                {/* Botão enviar sempre visível quando não há texto nem gravação */}
                                {!engine.newMessage.trim() && !engine.isRecording && (
                                    <button
                                        type="submit"
                                        disabled={true}
                                        className="bg-blue-600/50 text-white rounded-xl px-4 flex items-center justify-center transition-all opacity-40 cursor-not-allowed"
                                    >
                                        <FiSend size={16} />
                                    </button>
                                )}
                            </form>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <FiMessageSquare className="mb-3 animate-pulse" size={48} />
                            <h3 className="font-semibold text-lg">Área de Atendimento</h3>
                            <p className="text-sm">Selecione uma conversa para iniciar.</p>
                        </div>
                    )}
                </div>

                {/* Sidebar Direito */}
                {selectedConvo && showRightSidebar && (
                    <ChatContactSidebar
                        selectedConvo={selectedConvo}
                        timeLeft24h={engine.timeLeft24h}
                        isAssigning={engine.isAssigning}
                        availableAgents={engine.availableAgents}
                        handleAssignConversation={engine.handleAssignConversation}
                        availableLabels={engine.availableLabels}
                        getLabelColor={engine.getLabelColor}
                        handleRemoveTag={handleRemoveTag}
                        tagSearchQuery={engine.tagSearchQuery}
                        setTagSearchQuery={engine.setTagSearchQuery}
                        isTagDropdownOpen={engine.isTagDropdownOpen}
                        setIsTagDropdownOpen={engine.setIsTagDropdownOpen}
                        handleAddTagWithName={handleAddTagWithName}
                        privateNote={engine.privateNote}
                        setPrivateNote={engine.setPrivateNote}
                        isSavingNote={engine.isSavingNote}
                        handleSaveNote={handleSaveNote}
                        getFirstName={getFirstName}
                    />
                )}
            </div>

            {/* Modal Maximizado */}
            {selectedConvo && (
                <MaximizedInputModal
                    isOpen={isMaximizedInputOpen}
                    onClose={() => setIsMaximizedInputOpen(false)}
                    value={engine.newMessage}
                    onChange={engine.setNewMessage}
                    onSend={async (e, options) => {
                        if (!engine.newMessage.trim() || engine.isSending) return;
                        await engine.handleSendMessage(e, options);
                        setIsMaximizedInputOpen(false);
                    }}
                    isSending={engine.isSending}
                    contactName={selectedConvo.contact_name || selectedConvo.phone}
                />
            )}
            {/* Modal de Disparo de Funil */}
            {selectedConvo && (
                <TriggerFunnelModal
                    isOpen={showFunnelModal}
                    onClose={() => setShowFunnelModal(false)}
                    onTrigger={async (funnelId) => {
                        const success = await engine.handleTriggerFunnel(funnelId);
                        if (success) setShowFunnelModal(false);
                    }}
                    isTriggering={engine.isSending}
                />
            )}
        </div>
    </>
);
}
