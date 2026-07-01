import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { FiSearch, FiSend, FiUser, FiCheckCircle, FiRefreshCw, FiTag, FiX, FiInfo, FiMessageSquare, FiSidebar, FiPaperclip, FiArrowDown, FiMic, FiSquare, FiHome, FiClock, FiLayers, FiUsers, FiSlash } from 'react-icons/fi';
import { BsPinAngle, BsPinAngleFill, BsJournalText } from 'react-icons/bs';
import { fetchWithAuth } from '../AuthContext';
import { API_URL } from '../config';
import { useClient } from '../contexts/ClientContext';
import BlockContactModal from './WebhookLeads/components/BlockContactModal';

const NAV_SHORTCUTS = [
    { view: 'bulk_sender', label: 'Disparo em Massa', icon: FiHome },
    { view: 'history',     label: 'Histórico de Disparos', icon: FiClock },
    { view: 'funnels',     label: 'Funis', icon: FiLayers },
    { view: 'leads',       label: 'Contatos', icon: FiUsers },
];

export default function ChatConversations({ onClose, onNavigate }) {
    const { activeClient } = useClient();
    const [conversations, setConversations] = useState([]);
    const [selectedConvo, setSelectedConvo] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('todos'); // minha, nao_atribuida, todos
    const [statusFilter, setStatusFilter] = useState('open'); // open, resolved
    const [selectedLabelFilter, setSelectedLabelFilter] = useState(null); // filtro por etiqueta
    const [filterWindowOpen, setFilterWindowOpen] = useState(false); // só conversas com janela 24h aberta
    const [filterUnread, setFilterUnread] = useState(false); // só conversas com mensagem não lida
    const [availableLabels, setAvailableLabels] = useState([]); // todas as etiquetas do cliente
    const [availableLabelsDetails, setAvailableLabelsDetails] = useState([]); // detalhes com cor
    const [showRightSidebar, setShowRightSidebar] = useState(true); // fechar/abrir barra lateral direita
    const [isLoadingConvos, setIsLoadingConvos] = useState(false);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [newTagInput, setNewTagInput] = useState('');
    const [isCustomTag, setIsCustomTag] = useState(false);
    const [tagSearchQuery, setTagSearchQuery] = useState('');
    const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
    const [timeLeft24h, setTimeLeft24h] = useState('');
    const [shouldScrollToBottom, setShouldScrollToBottom] = useState(false);
    const [showScrollBtn, setShowScrollBtn] = useState(false);

    // Seleção e delete de conversas
    const [selectedConvoIds, setSelectedConvoIds] = useState([]);
    const [confirmDeleteConvos, setConfirmDeleteConvos] = useState(null); // null | 'single' | 'bulk'
    const [deletingConvoId, setDeletingConvoId] = useState(null); // id para delete individual

    // Preview de mídia antes do envio
    const [mediaPreview, setMediaPreview] = useState(null); // { file, fileUrl, localUrl, messageType, caption }
    const [previewCaption, setPreviewCaption] = useState('');
    const [isSendingMedia, setIsSendingMedia] = useState(false);

    // Notas privadas
    const [privateNote, setPrivateNote] = useState('');
    const [isSavingNote, setIsSavingNote] = useState(false);

    // Modal de confirmação de delete
    const [confirmDelete, setConfirmDelete] = useState(null); // { messageId } or null

    // Bloquear/colocar em repouso o contato ativo (não recebe mais disparos)
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

    // Fetch Conversations
    const loadConversations = async (showLoading = false) => {
        if (!activeClient) return;
        if (showLoading) setIsLoadingConvos(true);
        try {
            const url = new URL(`${API_URL}/chat/conversations`);
            url.searchParams.append('tab', activeTab);
            url.searchParams.append('status', statusFilter);
            if (searchQuery) {
                url.searchParams.append('search', searchQuery);
            }
            if (selectedLabelFilter) {
                url.searchParams.append('label', selectedLabelFilter);
            }

            const res = await fetchWithAuth(url.toString(), {}, activeClient.id);
            if (res.ok) {
                const data = await res.json();
                setConversations(data);

                // Sincronizar selectedConvo com dados frescos (atualiza cronômetro de 24h automaticamente)
                setSelectedConvo(prev => {
                    if (!prev) return prev;
                    const updated = data.find(c => c.id === prev.id);
                    if (!updated) return prev;
                    // Só atualiza se algum campo relevante mudou (evita re-renders desnecessários)
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
        if (showLoading) setIsLoadingMessages(true);
        try {
            const res = await fetchWithAuth(`${API_URL}/chat/conversations/${convoId}/messages`, {}, activeClient.id);
            if (res.ok) {
                const data = await res.json();
                setMessages(data);
                if (showLoading) setShouldScrollToBottom(true); // scroll após carregar as mensagens
            } else {
                setMessages([]);
                if (showLoading) console.warn('Erro ao carregar mensagens:', res.status);
            }
        } catch (err) {
            setMessages([]);
            console.error('Erro ao carregar mensagens:', err);
        } finally {
            if (showLoading) setIsLoadingMessages(false);
        }
    };

    // Helper to get media src URL (direct static upload vs Meta API Proxy)
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

    // Auto-scroll to bottom of messages only on explicit trigger or conversation switch
    useEffect(() => {
        if (shouldScrollToBottom) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            setShouldScrollToBottom(false);
        }
    }, [messages, shouldScrollToBottom]);

    // Detectar posição do scroll para mostrar/esconder o botão
    const handleScrollMessages = useCallback(() => {
        const container = messagesContainerRef.current;
        if (!container) return;
        const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
        setShowScrollBtn(distanceFromBottom > 80);
    }, []);

    // Funções de gravação de áudio
    const startRecording = async () => {
        if (timeLeft24h === 'Janela Fechada' || isSending) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioChunksRef.current = [];
            const recorder = new MediaRecorder(stream);
            recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
            recorder.start();
            mediaRecorderRef.current = recorder;
            setIsRecording(true);
            setAudioSeconds(0);
            audioTimerRef.current = setInterval(() => setAudioSeconds(s => s + 1), 1000);
        } catch (err) {
            toast.error('Permissão de microfone negada.');
        }
    };

    const stopRecordingAndSend = async () => {
        if (!mediaRecorderRef.current) return;
        clearInterval(audioTimerRef.current);
        setIsRecording(false);
        setAudioSeconds(0);

        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());

        mediaRecorderRef.current.onstop = async () => {
            const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
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
                    setMessages(prev => [...prev, sentMsg]);
                    setShouldScrollToBottom(true);
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
        if (!mediaRecorderRef.current) return;
        clearInterval(audioTimerRef.current);
        mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current = null;
        setIsRecording(false);
        setAudioSeconds(0);
        toast('Gravação cancelada.');
    };

    // Polling de conversas e mensagens
    useEffect(() => {
        loadConversations(true);
        loadAvailableLabels();

        const convoInterval = setInterval(() => {
            loadConversations(false);
            loadAvailableLabels();
        }, 5000);

        return () => clearInterval(convoInterval);
    }, [activeTab, statusFilter, searchQuery, selectedLabelFilter, activeClient]);

    useEffect(() => {
        if (!selectedConvo) return;
        setMessages([]); // Limpa mensagens da conversa anterior antes de carregar a nova
        loadMessages(selectedConvo.id, true); // scroll para o fim acontece dentro de loadMessages
        setPrivateNote(selectedConvo.private_note || '');

        const msgInterval = setInterval(() => {
            loadMessages(selectedConvo.id, false);
        }, 3000);

        return () => clearInterval(msgInterval);
    }, [selectedConvo?.id, activeClient]);

    // Timer regressivo da janela de 24 horas
    useEffect(() => {
        if (!selectedConvo || !selectedConvo.last_contact_message_at) {
            setTimeLeft24h('Janela Fechada');
            return;
        }

        const updateTimer = () => {
            const lastMsg = new Date(selectedConvo.last_contact_message_at);
            const expiry = new Date(lastMsg.getTime() + 24 * 60 * 60 * 1000);
            const now = new Date();
            const diff = expiry - now;

            if (diff <= 0) {
                setTimeLeft24h('Janela Fechada');
            } else {
                const hours = Math.floor(diff / 3600000);
                const minutes = Math.floor((diff % 3600000) / 60000);
                const seconds = Math.floor((diff % 60000) / 1000);
                
                const pad = (num) => String(num).padStart(2, '0');
                setTimeLeft24h(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);

        return () => clearInterval(interval);
    }, [selectedConvo?.last_contact_message_at, selectedConvo?.id]);

    // Enviar mensagem
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedConvo || isSending) return;

        setIsSending(true);
        const textToSend = newMessage;
        setNewMessage('');

        try {
            // Se a conversa estava resolvida, reabre automaticamente
            if (selectedConvo.status === 'resolved') {
                await fetchWithAuth(`${API_URL}/chat/conversations/${selectedConvo.id}/status`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'open' })
                }, activeClient.id);
                setSelectedConvo(prev => ({ ...prev, status: 'open' }));
            }

            const res = await fetchWithAuth(`${API_URL}/chat/conversations/${selectedConvo.id}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: textToSend })
            }, activeClient.id);

            if (res.ok) {
                const sentMsg = await res.json();
                setMessages(prev => [...prev, sentMsg]);
                setShouldScrollToBottom(true); // Scroll automático ao enviar
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
        } catch (err) {
            console.error('Erro ao enviar mensagem:', err);
            toast.error('Erro de conexão ao enviar mensagem.');
            setNewMessage(textToSend);
        } finally {
            setIsSending(false);
        }
    };

    // Upload de Mídia e envio no Chat
    // Ao selecionar o arquivo: se for imagem ou vídeo, abre o popup de preview
    const handleMediaUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !selectedConvo) return;
        e.target.value = null; // reset input para permitir selecionar o mesmo arquivo novamente

        let messageType = 'document';
        if (file.type.startsWith('image/')) messageType = 'image';
        else if (file.type.startsWith('video/')) messageType = 'video';
        else if (file.type.startsWith('audio/')) messageType = 'audio';

        // Imagem ou vídeo: mostra popup de preview com opção de legenda
        if (messageType === 'image' || messageType === 'video') {
            const localUrl = URL.createObjectURL(file);
            setMediaPreview({ file, localUrl, messageType, fileUrl: null });
            setPreviewCaption('');
            return;
        }

        // Áudio e documentos: envia diretamente (sem preview)
        await sendMedia(file, messageType, '');
    };

    // Envia mídia (upload + envio para WhatsApp)
    const sendMedia = async (file, messageType, caption) => {
        const formData = new FormData();
        formData.append('file', file);

        const toastId = toast.loading('Fazendo upload e enviando arquivo...');
        setIsSendingMedia(true);
        try {
            // 1. Upload para o servidor
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

            // 2. Enviar mídia pelo WhatsApp oficial
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
                setMessages(prev => [...prev, sentMsg]);
                setShouldScrollToBottom(true);
                toast.success('Mídia enviada com sucesso!', { id: toastId });
                loadConversations(false);
                setMediaPreview(null);
                setPreviewCaption('');
            } else {
                const errData = await sendRes.json();
                throw new Error(errData.detail || 'Erro ao enviar mídia.');
            }
        } catch (err) {
            console.error('Erro ao enviar mídia:', err);
            toast.error(err.message || 'Erro ao enviar arquivo.', { id: toastId });
        } finally {
            setIsSendingMedia(false);
        }
    };

    // Resolver / Reabrir conversa
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

    // Adicionar etiqueta
    const handleAddTag = async (e) => {
        e.preventDefault();
        if (!newTagInput.trim() || !selectedConvo) return;
        
        const currentTags = selectedConvo.labels || [];
        const cleanTag = newTagInput.trim().toLowerCase();
        
        if (currentTags.includes(cleanTag)) {
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
                setNewTagInput('');
                setIsCustomTag(false);
                loadConversations();
                loadAvailableLabels();
                toast.success('Etiqueta adicionada!');
            }
        } catch (err) {
            toast.error('Erro ao adicionar etiqueta.');
        }
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
                setTagSearchQuery('');
                loadConversations();
                loadAvailableLabels();
                toast.success('Etiqueta adicionada!');
            }
        } catch (err) {
            toast.error('Erro ao adicionar etiqueta.');
        }
    };

    // Remover etiqueta
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
                loadConversations();
                loadAvailableLabels();
                toast.success('Etiqueta removida.');
            }
        } catch (err) {
            toast.error('Erro ao remover etiqueta.');
        }
    };

    // Alternar status de fixado
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
                setConversations(prev => prev.map(c => c.id === selectedConvo.id ? { ...c, pinned: newPinned } : c));
                toast.success(newPinned ? 'Conversa fixada!' : 'Conversa desafixada.');
                loadConversations();
            }
        } catch (err) {
            toast.error('Erro ao fixar conversa.');
        }
    };

    // Bloquear (permanente) ou colocar em repouso (temporário) o contato da conversa ativa
    const handleConfirmBlockContact = async (type, hours) => {
        if (!selectedConvo || !activeClient) return;
        setIsBlockingContact(true);
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
                toast.success(type === 'resting' ? 'Contato colocado em repouso — não receberá disparos até o prazo terminar.' : 'Contato bloqueado — não receberá mais disparos.');
                setIsBlockModalOpen(false);
            } else {
                const err = await res.json().catch(() => ({}));
                toast.error(err.detail || 'Erro ao bloquear contato.');
            }
        } catch (err) {
            toast.error('Erro ao bloquear contato.');
        } finally {
            setIsBlockingContact(false);
        }
    };

    // Salvar nota privada
    const handleSaveNote = async () => {
        if (!selectedConvo) return;
        setIsSavingNote(true);
        try {
            const res = await fetchWithAuth(`${API_URL}/chat/conversations/${selectedConvo.id}/note`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ private_note: privateNote })
            }, activeClient.id);

            if (res.ok) {
                const data = await res.json();
                setSelectedConvo(prev => ({ ...prev, private_note: privateNote }));
                setConversations(prev => prev.map(c => c.id === selectedConvo.id ? { ...c, private_note: privateNote } : c));
                
                // Adiciona a nota privada na linha do tempo do chat localmente
                if (data.message) {
                    setMessages(prev => [...prev, data.message]);
                    setShouldScrollToBottom(true);
                }
                setPrivateNote(''); // Limpa a anotação privada após salvar
                toast.success('Anotação privada salva!');
            }
        } catch (err) {
            toast.error('Erro ao salvar anotação.');
        } finally {
            setIsSavingNote(false);
        }
    };

    // Delete de conversa individual
    const handleDeleteConversation = async (convoId) => {
        try {
            const res = await fetchWithAuth(`${API_URL}/chat/conversations/${convoId}`, { method: 'DELETE' }, activeClient?.id);
            if (res.ok) {
                setConversations(prev => prev.filter(c => c.id !== convoId));
                setSelectedConvoIds(prev => prev.filter(id => id !== convoId));
                if (selectedConvo?.id === convoId) setSelectedConvo(null);
                toast.success('Conversa deletada.');
            } else {
                toast.error('Erro ao deletar conversa.');
            }
        } catch {
            toast.error('Erro de conexão.');
        } finally {
            setConfirmDeleteConvos(null);
            setDeletingConvoId(null);
        }
    };

    // Delete em massa
    const handleDeleteSelectedConversations = async () => {
        if (!selectedConvoIds.length) return;
        try {
            const res = await fetchWithAuth(`${API_URL}/chat/conversations`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedConvoIds })
            }, activeClient?.id);
            if (res.ok) {
                const data = await res.json();
                setConversations(prev => prev.filter(c => !selectedConvoIds.includes(c.id)));
                if (selectedConvoIds.includes(selectedConvo?.id)) setSelectedConvo(null);
                setSelectedConvoIds([]);
                toast.success(`${data.deleted_count} conversa(s) deletada(s).`);
            } else {
                toast.error('Erro ao deletar conversas.');
            }
        } catch {
            toast.error('Erro de conexão.');
        } finally {
            setConfirmDeleteConvos(null);
        }
    };

    // Formatar data relativa
    const formatTime = (isoString) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Agora';
        if (diffMins < 60) return `${diffMins}m`;
        // Mais de 60 min: mostrar horário real (HH:MM)
        if (date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        }
        return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    };

    // Formatar data e hora amigável para mensagens
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

    // Conversas visíveis após aplicar filtros
    const visibleConversations = conversations.filter(c => {
        if (filterWindowOpen && !(c.last_contact_message_at && (Date.now() - new Date(c.last_contact_message_at).getTime()) < 24 * 60 * 60 * 1000)) return false;
        if (filterUnread && !(c.unread_count > 0)) return false;
        return true;
    });

    return (
        <>
        {/* Modal de Preview de Mídia com Legenda */}
        {mediaPreview && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                <div className="bg-[#1e293b] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                        <h3 className="text-white font-bold text-base flex items-center gap-2">
                            {mediaPreview.messageType === 'image' ? '🖼️ Enviar Imagem' : '🎬 Enviar Vídeo'}
                        </h3>
                        <button
                            type="button"
                            onClick={() => { setMediaPreview(null); setPreviewCaption(''); }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                        >
                            <FiX size={18} />
                        </button>
                    </div>

                    {/* Preview */}
                    <div className="p-5 flex justify-center bg-black/20">
                        {mediaPreview.messageType === 'image' ? (
                            <img
                                src={mediaPreview.localUrl}
                                alt="Preview"
                                className="max-h-80 max-w-full rounded-xl object-contain"
                            />
                        ) : (
                            <video
                                src={mediaPreview.localUrl}
                                controls
                                className="max-h-80 max-w-full rounded-xl"
                            />
                        )}
                    </div>

                    {/* Legenda */}
                    <div className="px-5 py-4 space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                                Legenda (opcional)
                            </label>
                            <input
                                type="text"
                                value={previewCaption}
                                onChange={(e) => setPreviewCaption(e.target.value)}
                                placeholder="Adicione uma legenda para a mídia..."
                                className="w-full px-4 py-2.5 bg-white/5 text-white text-sm rounded-xl border border-white/10 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-500"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !isSendingMedia) {
                                        sendMedia(mediaPreview.file, mediaPreview.messageType, previewCaption);
                                    }
                                }}
                                autoFocus
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => { setMediaPreview(null); setPreviewCaption(''); }}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 text-sm font-semibold transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                disabled={isSendingMedia}
                                onClick={() => sendMedia(mediaPreview.file, mediaPreview.messageType, previewCaption)}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isSendingMedia ? (
                                    <><FiRefreshCw className="animate-spin" size={14} /> Enviando...</>
                                ) : (
                                    <><FiSend size={14} /> Enviar</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Modal de confirmação de delete de conversa(s) */}
        {confirmDeleteConvos && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div className="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">
                        {confirmDeleteConvos === 'bulk' ? `Deletar ${selectedConvoIds.length} conversa(s)?` : 'Deletar conversa?'}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                        Esta ação é irreversível. Todas as mensagens da(s) conversa(s) serão apagadas permanentemente.
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={() => { setConfirmDeleteConvos(null); setDeletingConvoId(null); }}
                            className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-white/5 transition"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => confirmDeleteConvos === 'bulk' ? handleDeleteSelectedConversations() : handleDeleteConversation(deletingConvoId)}
                            className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition"
                        >
                            Deletar
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Modal de bloqueio / repouso do contato da conversa ativa */}
        <BlockContactModal
            isOpen={isBlockModalOpen}
            onClose={() => setIsBlockModalOpen(false)}
            onConfirm={handleConfirmBlockContact}
            isSaving={isBlockingContact}
            count={1}
            selectAllPages={false}
            targetLabel={selectedConvo ? `${selectedConvo.contact_name || selectedConvo.phone} (${selectedConvo.phone})` : null}
        />

        <div className="flex flex-col h-screen w-screen bg-[#0f172a] text-gray-100 overflow-hidden font-sans">
            {/* Header de Atendimento */}
            <div className="h-16 border-b border-gray-200 dark:border-white/5 flex items-center justify-between px-6 bg-white dark:bg-[#1e293b] shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                        <FiMessageSquare size={18} />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-gray-800 dark:text-white tracking-tight">Painel de Atendimento em Tempo Real</h2>
                        {activeClient && (
                            <p className="text-[10px] text-gray-500 dark:text-gray-400">Cliente ativo: {activeClient.name}</p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {NAV_SHORTCUTS.map((shortcut) => {
                        const Icon = shortcut.icon;
                        return (
                            <button
                                key={shortcut.view}
                                type="button"
                                onClick={() => (shortcut.view === 'bulk_sender' && onClose ? onClose() : onNavigate && onNavigate(shortcut.view))}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-white/5 hover:bg-blue-500/10 text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400 rounded-xl transition-all font-bold text-xs border border-gray-200 dark:border-white/10 hover:border-blue-500/30"
                            >
                                <Icon size={14} />
                                {shortcut.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Corpo do Chat */}
            <div className="flex flex-1 min-h-0 bg-white dark:bg-[#1e293b] overflow-hidden">
            
            {/* Coluna 1: Lista de Conversas (Esquerda) */}
            <div className="w-96 border-r border-gray-200 dark:border-white/5 flex flex-col h-full bg-gray-50/50 dark:bg-[#111827]/40 shrink-0">
                {/* Abas e Filtros */}
                <div className="p-4 border-b border-gray-200 dark:border-white/5 space-y-3">
                    <div className="flex gap-2">
                        {['minha', 'nao_atribuida', 'todos'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold tracking-wide capitalize transition-all ${
                                    activeTab === tab 
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                                    : 'bg-white dark:bg-[#1e293b] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-gray-800'
                                }`}
                            >
                                {tab === 'nao_atribuida' ? 'Não atrib.' : tab}
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-2">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-white dark:bg-[#1e293b] text-gray-700 dark:text-gray-300 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="open">Abertas</option>
                            <option value="resolved">Resolvidas</option>
                            <option value="all">Todas</option>
                        </select>

                        <div className="relative flex-1">
                            <FiSearch size={14} className="absolute left-3 top-2.5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Procurar conversas..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-[#1e293b] text-gray-700 dark:text-gray-300 text-xs rounded-lg border border-gray-200 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Marcadores para Filtrar (Dropdown) */}
                {availableLabels.length > 0 && (
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-white/5 space-y-2 bg-gray-50/10 dark:bg-black/10">
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center justify-between gap-1.5">
                            <div className="flex items-center gap-1.5">
                                <FiTag size={12} />
                                <span>Filtrar por Marcador</span>
                            </div>
                            <span className="bg-blue-500/20 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                {visibleConversations.length} contato{visibleConversations.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                        <select
                            value={selectedLabelFilter || ''}
                            onChange={(e) => setSelectedLabelFilter(e.target.value || null)}
                            className="bg-white dark:bg-[#1e293b] text-gray-700 dark:text-gray-300 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-blue-500 w-full cursor-pointer"
                        >
                            <option value="">Todos os marcadores</option>
                            {availableLabels.map(label => (
                                <option key={label} value={label}>{label}</option>
                            ))}
                        </select>

                        <div className="flex gap-2">
                            {/* Filtro: Janela 24h aberta */}
                            <button
                                onClick={() => setFilterWindowOpen(v => !v)}
                                className={`flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                                    filterWindowOpen
                                        ? 'bg-green-500/20 border-green-500/40 text-green-400'
                                        : 'bg-transparent border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-green-500/40 hover:text-green-400'
                                }`}
                            >
                                <span className={`w-2 h-2 rounded-full ${filterWindowOpen ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
                                Janela 24h aberta
                            </button>

                            {/* Filtro: Não lidas */}
                            <button
                                onClick={() => setFilterUnread(v => !v)}
                                className={`flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                                    filterUnread
                                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                                        : 'bg-transparent border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-emerald-500/40 hover:text-emerald-400'
                                }`}
                            >
                                <span className={`w-2 h-2 rounded-full ${filterUnread ? 'bg-emerald-400 animate-pulse' : 'bg-gray-400'}`} />
                                Não lidas
                            </button>
                        </div>
                    </div>
                )}

                {/* Barra de seleção em massa */}
                {visibleConversations.length > 0 && (
                    <div className="px-4 py-2 border-b border-gray-200 dark:border-white/5 flex items-center gap-2 bg-gray-50/30 dark:bg-black/10">
                        <button
                            onClick={() => {
                                const allIds = visibleConversations.map(c => c.id);
                                const allSelected = allIds.every(id => selectedConvoIds.includes(id));
                                setSelectedConvoIds(allSelected ? [] : allIds);
                            }}
                            className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 font-medium transition-colors"
                        >
                            <input
                                type="checkbox"
                                readOnly
                                checked={visibleConversations.length > 0 && visibleConversations.every(c => selectedConvoIds.includes(c.id))}
                                className="rounded border-gray-300 text-blue-600 pointer-events-none"
                            />
                            Selecionar todas
                        </button>
                        {selectedConvoIds.length > 0 && (
                            <button
                                onClick={() => setConfirmDeleteConvos('bulk')}
                                className="ml-auto flex items-center gap-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 dark:text-red-400 px-2.5 py-1 rounded-lg text-xs font-semibold transition border border-red-500/20"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                Deletar ({selectedConvoIds.length})
                            </button>
                        )}
                    </div>
                )}

                {/* Lista de Conversas */}
                <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-white/5">
                    {isLoadingConvos && conversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                            <FiRefreshCw className="animate-spin mb-2" size={24} />
                            <span className="text-xs">Buscando conversas...</span>
                        </div>
                    ) : conversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-gray-400 dark:text-gray-500">
                            <FiMessageSquare className="mb-2" size={24} />
                            <span className="text-xs">Nenhuma conversa encontrada</span>
                        </div>
                    ) : (
                        visibleConversations.map((convo) => {
                            const isSelected = selectedConvo?.id === convo.id;
                            const initials = (convo.contact_name || convo.phone || 'C')
                                .split(' ')
                                .map(w => w[0])
                                .slice(0, 2)
                                .join('')
                                .toUpperCase();

                            const isChecked = selectedConvoIds.includes(convo.id);
                            return (
                                <div
                                    key={convo.id}
                                    className={`relative group/convo p-4 cursor-pointer transition-all flex gap-3 items-center ${
                                        isSelected
                                        ? 'bg-blue-50/50 dark:bg-blue-900/10 border-l-4 border-blue-600'
                                        : isChecked
                                        ? 'bg-red-50/30 dark:bg-red-900/10 border-l-4 border-red-400'
                                        : 'hover:bg-gray-100/50 dark:hover:bg-gray-800/20'
                                    }`}
                                >
                                    {/* Checkbox de seleção */}
                                    <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) => {
                                            e.stopPropagation();
                                            setSelectedConvoIds(prev =>
                                                isChecked ? prev.filter(id => id !== convo.id) : [...prev, convo.id]
                                            );
                                        }}
                                        onClick={(e) => e.stopPropagation()}
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
                                            <div className="flex justify-between items-baseline mb-1">
                                                <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-200 truncate pr-2 flex items-center gap-1">
                                                    {convo.pinned && <BsPinAngleFill className="text-blue-500 rotate-45 shrink-0" size={12} />}
                                                    {convo.contact_name || convo.phone}
                                                </h4>
                                                <span className="text-[10px] text-gray-400 shrink-0">
                                                    {formatTime(convo.last_message_at)}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-1">
                                                {convo.last_message_content || 'Nenhuma mensagem'}
                                            </p>

                                            {/* Exibição de Marcadores/Etiquetas no Card */}
                                            {convo.labels && convo.labels.length > 0 && (
                                                <div className="flex flex-wrap gap-1">
                                                    {convo.labels.map(label => {
                                                        const labelColor = getLabelColor(label);
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
                                        {convo.unread_count > 0 && (
                                            <span className="bg-emerald-500 text-white font-bold text-[10px] px-2 py-0.5 rounded-full shrink-0">
                                                {convo.unread_count}
                                            </span>
                                        )}
                                    </div>

                                    {/* Botão delete individual (aparece no hover) */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setDeletingConvoId(convo.id);
                                            setConfirmDeleteConvos('single');
                                        }}
                                        className="opacity-0 group-hover/convo:opacity-100 shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                                        title="Deletar conversa"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Coluna 2: Chat Ativo (Centro) */}
            <div className="flex-1 flex flex-col h-full bg-white dark:bg-[#0f172a]">
                {selectedConvo ? (
                    <>
                        {/* Header do Chat */}
                        <div className="p-4 border-b border-gray-200 dark:border-white/5 flex justify-between items-center bg-gray-50/20 dark:bg-[#111827]/20">
                            <div>
                                <h3 className="font-bold text-gray-800 dark:text-white text-base">
                                    {selectedConvo.contact_name || selectedConvo.phone}
                                </h3>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        WhatsApp Oficial: {selectedConvo.phone}
                                    </span>
                                    {!showRightSidebar && (
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                            timeLeft24h === 'Janela Fechada'
                                            ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                        }`}>
                                            {timeLeft24h === 'Janela Fechada' ? '🔴 Janela Fechada' : `🟢 Janela 24h: ${timeLeft24h}`}
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
                                    onClick={() => setIsBlockModalOpen(true)}
                                    title="Bloquear ou colocar em repouso — impede que este contato receba disparos"
                                    className="p-2 rounded-xl border bg-white dark:bg-[#1e293b] border-gray-200 dark:border-white/5 text-gray-600 dark:text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:border-orange-200 dark:hover:border-orange-800/30 transition-all"
                                >
                                    <FiSlash size={16} />
                                </button>

                                <button
                                    onClick={handleToggleStatus}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                                        selectedConvo.status === 'resolved'
                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                        : 'bg-blue-600 text-white border-transparent hover:bg-blue-700'
                                    }`}
                                >
                                    <FiCheckCircle size={14} />
                                    {selectedConvo.status === 'resolved' ? 'Resolvida' : 'Resolver'}
                                </button>

                                {/* Botão para fechar/abrir a barra lateral direita */}
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

                        {/* Área de Mensagens */}
                        <div
                            ref={messagesContainerRef}
                            onScroll={handleScrollMessages}
                            className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f8fafc] dark:bg-[#0b0f19] relative"
                        >
                            {isLoadingMessages ? (
                                <div className="flex items-center justify-center h-full text-gray-400">
                                    <FiRefreshCw className="animate-spin mb-1" size={20} />
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 gap-2">
                                    <FiMessageSquare size={32} className="opacity-40" />
                                    <span className="text-xs">Nenhuma mensagem ainda</span>
                                </div>
                            ) : (
                                messages.map((msg) => {
                                    // Reações salvas como ChatMessage
                                    const isSystem = msg.sender_type === 'system';
                                    const isMe = msg.sender_type === 'user';

                                    if (isSystem) {
                                        return (
                                            <div
                                                key={msg.id}
                                                className="flex justify-center my-2"
                                            >
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
                                                                className="rounded-lg max-w-full h-auto max-h-60 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                                                                onClick={() => window.open(getMediaSrc(msg), '_blank')}
                                                            />
                                                        )}
                                                        {msg.message_type === 'sticker' && (
                                                            <img 
                                                                src={getMediaSrc(msg)} 
                                                                alt="Sticker" 
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

                                                <div className="flex justify-end mt-2">
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
                            )}
                            {/* Botão flutuante para descer scroll - só aparece quando não está no fim */}
                            {showScrollBtn && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                                        setShowScrollBtn(false);
                                    }}
                                    className="sticky bottom-4 float-right mr-2 bg-blue-600/90 dark:bg-blue-500/90 hover:bg-blue-700 dark:hover:bg-blue-600 text-white p-2.5 rounded-full shadow-lg transition-all hover:scale-110 active:scale-95 flex items-center justify-center z-10 border border-white/10"
                                    title="Ir para a última mensagem"
                                >
                                    <FiArrowDown size={16} />
                                </button>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
 
                        {/* Input de Envio */}
                        <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 dark:border-white/5 bg-gray-50/20 dark:bg-[#111827]/20 flex gap-2 relative">
                            {/* Upload de arquivos de mídia */}
                            <input
                                type="file"
                                id="chat-media-upload"
                                className="hidden"
                                onChange={handleMediaUpload}
                                accept="image/*,video/*,audio/*,application/pdf"
                                disabled={isSending || timeLeft24h === 'Janela Fechada'}
                            />
                            {!isRecording && (
                                <button
                                    type="button"
                                    onClick={() => document.getElementById('chat-media-upload').click()}
                                    disabled={isSending || timeLeft24h === 'Janela Fechada'}
                                    className="p-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 rounded-xl transition-all flex items-center justify-center shrink-0 disabled:opacity-50 disabled:pointer-events-none"
                                    title={timeLeft24h === 'Janela Fechada' ? "Janela Fechada" : "Enviar Mídia ou Documento"}
                                >
                                    <FiPaperclip size={18} />
                                </button>
                            )}

                            {isRecording ? (
                                /* Estado de gravação ativa */
                                <div className="flex-1 flex items-center gap-3 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-xl">
                                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                                    <span className="text-red-500 dark:text-red-400 text-sm font-medium flex-1">
                                        Gravando... {String(Math.floor(audioSeconds / 60)).padStart(2, '0')}:{String(audioSeconds % 60).padStart(2, '0')}
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
                                    placeholder={timeLeft24h === 'Janela Fechada' ? "Janela de 24h fechada. O cliente precisa enviar uma nova mensagem." : "Digite sua mensagem de resposta..."}
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    className="flex-1 px-4 py-2.5 bg-white dark:bg-[#1e293b] text-gray-700 dark:text-gray-200 text-sm rounded-xl border border-gray-200 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-55 disabled:bg-gray-100 dark:disabled:bg-gray-800"
                                    disabled={isSending || timeLeft24h === 'Janela Fechada'}
                                />
                            )}

                            {/* Botão de microfone / parar gravação */}
                            {!newMessage.trim() && (
                                <button
                                    type="button"
                                    onClick={isRecording ? stopRecordingAndSend : startRecording}
                                    disabled={isSending || timeLeft24h === 'Janela Fechada'}
                                    className={`p-2.5 rounded-xl transition-all flex items-center justify-center shrink-0 disabled:opacity-50 disabled:pointer-events-none ${
                                        isRecording
                                        ? 'bg-red-500 hover:bg-red-600 text-white'
                                        : 'bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300'
                                    }`}
                                    title={isRecording ? "Enviar áudio" : "Gravar áudio"}
                                >
                                    {isRecording ? <FiSquare size={18} /> : <FiMic size={18} />}
                                </button>
                            )}

                            {/* Botão enviar texto (só aparece quando há texto digitado) */}
                            {(newMessage.trim() || isRecording) && !isRecording && (
                                <button
                                    type="submit"
                                    disabled={isSending || !newMessage.trim() || timeLeft24h === 'Janela Fechada'}
                                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 flex items-center justify-center transition-all disabled:opacity-50"
                                >
                                    {isSending ? (
                                        <FiRefreshCw className="animate-spin" size={16} />
                                    ) : (
                                        <FiSend size={16} />
                                    )}
                                </button>
                            )}

                            {/* Botão enviar sempre visível quando não há texto nem gravação */}
                            {!newMessage.trim() && !isRecording && (
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
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
                        <FiMessageSquare className="mb-3 animate-pulse" size={48} />
                        <h3 className="font-semibold text-lg mb-1">Área de Atendimento</h3>
                        <p className="text-sm max-w-xs text-center leading-relaxed">
                            Selecione uma conversa da lista para iniciar a interação com o cliente em tempo real.
                        </p>
                    </div>
                )}
            </div>

            {/* Coluna 3: Detalhes e Marcadores (Direita) - Toggleable */}
            {selectedConvo && showRightSidebar && (
                <div className="w-80 border-l border-gray-200 dark:border-white/5 p-6 flex flex-col h-full overflow-y-auto bg-gray-50/50 dark:bg-[#111827]/40 space-y-6 shrink-0 animate-fade-in">
                    {/* Perfil do Contato */}
                    <div className="text-center space-y-2 pb-4 border-b border-gray-200 dark:border-white/5">
                        <div className="w-16 h-16 bg-blue-600 rounded-full mx-auto flex items-center justify-center text-white text-xl font-bold">
                            {selectedConvo.contact_name ? selectedConvo.contact_name[0].toUpperCase() : 'C'}
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-800 dark:text-white">
                                {selectedConvo.contact_name || 'Contato'}
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{selectedConvo.phone}</p>
                            <div className="flex justify-center pt-1.5">
                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 border transition-all ${
                                    timeLeft24h === 'Janela Fechada'
                                    ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
                                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                }`}>
                                    {timeLeft24h === 'Janela Fechada' ? '🔴 Janela Fechada' : `🟢 Janela 24h: ${timeLeft24h}`}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Marcadores / Etiquetas */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            <FiTag size={14} />
                            <span>Marcadores</span>
                        </div>

                        {/* Lista de etiquetas */}
                        <div className="flex flex-wrap gap-1.5">
                            {(selectedConvo.labels || []).map((tag) => {
                                const labelColor = getLabelColor(tag);
                                return (
                                    <span
                                        key={tag}
                                        style={{
                                            color: labelColor,
                                            borderColor: labelColor + '33',
                                            backgroundColor: labelColor + '15'
                                        }}
                                        className="text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5 border font-semibold"
                                    >
                                        {tag}
                                        <button
                                            onClick={() => handleRemoveTag(tag)}
                                            style={{ color: labelColor }}
                                            className="opacity-70 hover:opacity-100 hover:scale-110 transition-all"
                                        >
                                            <FiX size={12} />
                                        </button>
                                    </span>
                                );
                            })}
                            {(selectedConvo.labels || []).length === 0 && (
                                <span className="text-xs text-gray-400 dark:text-gray-500 italic">
                                    Nenhum marcador aplicado.
                                </span>
                            )}
                        </div>

                        {/* Dropdown com Busca / Filtro e Autocomplete Premium */}
                        <div className="relative mt-2">
                            <div className="flex gap-1.5">
                                <div className="relative flex-1">
                                    <input
                                        type="text"
                                        placeholder="Pesquisar ou criar marcador..."
                                        value={tagSearchQuery}
                                        onChange={(e) => {
                                            setTagSearchQuery(e.target.value);
                                            setIsTagDropdownOpen(true);
                                        }}
                                        onFocus={() => setIsTagDropdownOpen(true)}
                                        onBlur={() => {
                                            // Delay curto para permitir que o clique nos itens do dropdown seja registrado
                                            setTimeout(() => setIsTagDropdownOpen(false), 200);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                if (tagSearchQuery.trim()) {
                                                    handleAddTagWithName(tagSearchQuery.trim());
                                                }
                                            }
                                        }}
                                        className="w-full px-3 py-1.5 bg-white dark:bg-[#1e293b] text-gray-700 dark:text-gray-300 text-xs rounded-lg border border-gray-200 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                    {tagSearchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => setTagSearchQuery('')}
                                            className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                        >
                                            <FiX size={12} />
                                        </button>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (tagSearchQuery.trim()) {
                                            handleAddTagWithName(tagSearchQuery.trim());
                                        }
                                    }}
                                    disabled={!tagSearchQuery.trim()}
                                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm shrink-0"
                                >
                                    Adicionar
                                </button>
                            </div>

                            {/* Dropdown flutuante com as opções */}
                            {isTagDropdownOpen && (
                                <div className="absolute z-20 w-full mt-1 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-white/10 rounded-lg shadow-lg max-h-48 overflow-y-auto custom-scrollbar py-1">
                                    {/* Opções filtradas */}
                                    {(availableLabels || [])
                                        .filter(label => 
                                            // Filtrar marcadores que já estão na conversa
                                            !(selectedConvo.labels || []).map(l => l.toLowerCase()).includes(label.toLowerCase()) &&
                                            // E que contenham o texto digitado na busca
                                            label.toLowerCase().includes(tagSearchQuery.toLowerCase())
                                        )
                                        .map(label => {
                                            const labelColor = getLabelColor(label);
                                            return (
                                                <button
                                                    key={label}
                                                    type="button"
                                                    onMouseDown={() => {
                                                        handleAddTagWithName(label);
                                                    }}
                                                    className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium"
                                                >
                                                    <span 
                                                        className="w-2 h-2 rounded-full shrink-0" 
                                                        style={{ backgroundColor: labelColor }}
                                                    />
                                                    {label}
                                                </button>
                                            );
                                        })
                                    }

                                    {/* Opção de criar novo se o texto não existir identicamente na lista */}
                                    {tagSearchQuery.trim() && !(availableLabels || []).map(l => l.toLowerCase()).includes(tagSearchQuery.trim().toLowerCase()) && (
                                        <button
                                            type="button"
                                            onMouseDown={() => {
                                                handleAddTagWithName(tagSearchQuery.trim());
                                            }}
                                            className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold border-t border-gray-100 dark:border-white/5 flex items-center gap-1.5"
                                        >
                                            <span>+ Criar novo marcador:</span>
                                            <span className="italic pr-2 truncate">"{tagSearchQuery.trim()}"</span>
                                        </button>
                                    )}

                                    {/* Caso não tenha nenhuma sugestão e não tenha nada digitado */}
                                    {!tagSearchQuery.trim() && (availableLabels || []).filter(label => !(selectedConvo.labels || []).map(l => l.toLowerCase()).includes(label.toLowerCase())).length === 0 && (
                                        <div className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500 italic text-center">
                                            Nenhum outro marcador disponível.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Notas Privadas */}
                    <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-white/5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            <BsJournalText size={14} />
                            <span>Anotação Privada</span>
                        </div>
                        <div className="space-y-2">
                            <textarea
                                value={privateNote}
                                onChange={(e) => setPrivateNote(e.target.value)}
                                placeholder="Escreva uma anotação sobre este contato que só você verá..."
                                className="w-full h-24 px-3 py-2 bg-white dark:bg-[#1e293b] text-gray-700 dark:text-gray-300 text-xs rounded-lg border border-gray-200 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-400 resize-none"
                            />
                            <button
                                onClick={handleSaveNote}
                                disabled={isSavingNote}
                                className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold transition-all flex items-center justify-center gap-1"
                            >
                                {isSavingNote ? <FiRefreshCw className="animate-spin" size={12} /> : null}
                                Salvar Anotação
                            </button>
                        </div>
                    </div>

                </div>
            )}

            </div>
        </div>
        </>
    );
}
