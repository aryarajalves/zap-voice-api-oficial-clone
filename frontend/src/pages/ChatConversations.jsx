import React, { useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { FiSearch, FiSend, FiUser, FiCheckCircle, FiRefreshCw, FiTag, FiX, FiMessageSquare, FiSidebar, FiPaperclip, FiArrowDown, FiMic, FiSquare, FiHome, FiClock, FiLayers, FiUsers, FiSlash, FiCalendar, FiGlobe, FiMaximize2, FiUploadCloud, FiFileText, FiEdit2, FiCheck, FiTrash2, FiCpu, FiCornerUpLeft, FiZap } from 'react-icons/fi';
import { BsPinAngle, BsPinAngleFill, BsJournalText, BsExclamationCircle, BsExclamationCircleFill, BsStars } from 'react-icons/bs';
import { fetchWithAuth } from '../AuthContext';
import { useAuth } from '../AuthContext';
import { API_URL } from '../config';
import { useClient } from '../contexts/ClientContext';
import BlockContactModal from './WebhookLeads/components/BlockContactModal';
import { getFirstName } from '../utils/nameFormatter';

const getReactionsList = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.filter(r => r && r.emoji);
    if (typeof raw === 'object') {
        return Object.entries(raw).map(([sender, val]) => {
            if (typeof val === 'object' && val !== null && val.emoji) return val;
            if (typeof val === 'string' && val) return { sender, emoji: val };
            return null;
        }).filter(Boolean);
    }
    return [];
};

// Subcomponentes modularizados
import MediaPreviewModal from './ChatConversations/MediaPreviewModal';
import MaximizedInputModal from './ChatConversations/MaximizedInputModal';
import TriggerFunnelModal from './ChatConversations/TriggerFunnelModal';
import DeleteConvoModal from './ChatConversations/DeleteConvoModal';
import ResendAgentflowModal from './ChatConversations/ResendAgentflowModal';
import SendTemplateModal from './ChatConversations/SendTemplateModal';
import ChatContactSidebar from './ChatConversations/ChatContactSidebar';
import AutomationPipelineModal from '../components/TriggerHistory/components/AutomationPipelineModal';
import { useChatEngine } from './ChatConversations/useChatEngine';
import { exportConversationToDoc } from './ChatConversations/exportConversationToDoc';

const NAV_SHORTCUTS = [
    { view: 'webhook_integrations', label: 'Integração Webhook', icon: FiGlobe },
    { view: 'bulk_sender', label: 'Disparo em Massa', icon: FiHome },
    { view: 'history',     label: 'Histórico de Disparos', icon: FiClock },
    { view: 'funnels',     label: 'Funis', icon: FiLayers },
    { view: 'leads',       label: 'Contatos', icon: FiUsers },
];

export default function ChatConversations({ onClose, onNavigate }) {
    const { activeClient } = useClient();
    const { user } = useAuth();
    const [selectedConvo, setSelectedConvo] = React.useState(null);
    const [activeTab, setActiveTab] = React.useState('todos'); // minha, nao_atribuida, todos
    const [statusFilter, setStatusFilter] = React.useState('open'); // open, resolved
    const [searchQuery, setSearchQuery] = React.useState('');
    const [selectedLabelFilter, setSelectedLabelFilter] = React.useState(null); // filtro por etiqueta
    const [filterWindowOpen, setFilterWindowOpen] = React.useState(false); // só conversas com janela 24h aberta
    const [filterTemplate24h, setFilterTemplate24h] = React.useState(false); // só conversas que receberam template nas últimas 24h
    const [filterUnread, setFilterUnread] = React.useState(false); // só conversas com mensagem não lida
    const [filterHasNote, setFilterHasNote] = React.useState(false); // só conversas com anotação privada preenchida
    const [filterUrgent, setFilterUrgent] = React.useState(false); // só conversas com marcação de urgência
    const [filterHasReplied, setFilterHasReplied] = React.useState(false); // só contatos que enviaram pelo menos 1 mensagem
    const [filterHasActiveFunnel, setFilterHasActiveFunnel] = React.useState(false); // só contatos com funil ativo em execução
    const [filterBlockStatus, setFilterBlockStatus] = React.useState(null); // null | 'blocked' | 'resting'
    const [filterStartDate, setFilterStartDate] = React.useState('');
    const [filterEndDate, setFilterEndDate] = React.useState('');
    const [activeFilterTab, setActiveFilterTab] = React.useState(null); // null | 'marcador' | 'status' | 'bloqueio'
    const [showRightSidebar, setShowRightSidebar] = React.useState(true); // fechar/abrir barra lateral direita
    const [showTemplateModal, setShowTemplateModal] = React.useState(false);
    const [isMaximizedInputOpen, setIsMaximizedInputOpen] = React.useState(false);
    const [showFunnelModal, setShowFunnelModal] = React.useState(false);
    const [selectAllPages, setSelectAllPages] = React.useState(false);
    const [isBulkTagModalOpen, setIsBulkTagModalOpen] = React.useState(false);
    const [selectedBulkTag, setSelectedBulkTag] = React.useState('');
    const [customBulkTag, setCustomBulkTag] = React.useState('');
    const [isApplyingBulkTag, setIsApplyingBulkTag] = React.useState(false);
    const [replyingTo, setReplyingTo] = React.useState(null); // { id, content, sender_type, wa_message_id }
    const [isCancelFunnelModalOpen, setIsCancelFunnelModalOpen] = React.useState(false);
    const [isCancelingFunnel, setIsCancelingFunnel] = React.useState(false);
    const [pipelineTrigger, setPipelineTrigger] = React.useState(null);
    const [isLoadingPipeline, setIsLoadingPipeline] = React.useState(false);
    const chatInputRef = React.useRef(null);
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
        filterTemplate24h,
        filterUrgent,
        filterHasReplied,
        filterHasActiveFunnel,
        selectedConvo,
        setSelectedConvo
    });

    React.useEffect(() => {
        if (!engine?.newMessage && chatInputRef.current) {
            chatInputRef.current.style.height = 'auto';
        }
    }, [engine?.newMessage]);

    React.useEffect(() => {
        if (engine.selectedConvoIds.length === 0) {
            setSelectAllPages(false);
        }
    }, [engine.selectedConvoIds]);

    React.useEffect(() => {
        setSelectAllPages(false);
    }, [activeTab, statusFilter, searchQuery, selectedLabelFilter, filterBlockStatus, filterHasNote, filterStartDate, filterEndDate, filterUnread, filterWindowOpen, filterTemplate24h, filterUrgent, filterHasReplied, filterHasActiveFunnel]);

    const handleOpenActiveFunnelPipeline = async () => {
        if (!selectedConvo?.active_funnel) return;
        const triggerId = selectedConvo.active_funnel.trigger_id;
        setIsLoadingPipeline(true);
        try {
            if (triggerId) {
                const res = await fetchWithAuth(`${API_URL}/triggers/${triggerId}`, {}, activeClient?.id);
                if (res.ok) {
                    const data = await res.json();
                    setPipelineTrigger(data);
                    return;
                }
            }

            // Fallback: buscar o trigger ativo do contato pelo telefone
            const phoneDigits = (selectedConvo.phone || "").replace(/\D/g, '');
            const searchParam = phoneDigits.length >= 8 ? phoneDigits.slice(-8) : phoneDigits;
            const resSearch = await fetchWithAuth(`${API_URL}/triggers?search=${encodeURIComponent(searchParam)}&limit=10`, {}, activeClient?.id);
            if (resSearch.ok) {
                const listData = await resSearch.json();
                const triggers = listData.triggers || listData.items || listData || [];
                const activeTrig = Array.isArray(triggers) ? triggers.find(t => 
                    ['queued', 'processing', 'paused_waiting_delivery', 'suspended'].includes(t.status)
                ) || triggers[0] : null;

                if (activeTrig) {
                    const fullRes = await fetchWithAuth(`${API_URL}/triggers/${activeTrig.id}`, {}, activeClient?.id);
                    if (fullRes.ok) {
                        const fullData = await fullRes.json();
                        setPipelineTrigger(fullData);
                        return;
                    }
                    setPipelineTrigger(activeTrig);
                    return;
                }
            }
            toast.error("Não foi possível carregar o pipeline do funil ativo.");
        } catch (err) {
            console.error("Erro ao carregar pipeline:", err);
            toast.error("Erro de conexão ao carregar pipeline.");
        } finally {
            setIsLoadingPipeline(false);
        }
    };

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

    const [isDraggingFile, setIsDraggingFile] = React.useState(false);
    const dragCounter = React.useRef(0);

    const [editingNoteId, setEditingNoteId] = React.useState(null);
    const [editingNoteText, setEditingNoteText] = React.useState('');
    const [isSavingNoteMsg, setIsSavingNoteMsg] = React.useState(false);
    const [isNoteModalMaximized, setIsNoteModalMaximized] = React.useState(false);

    const handleSaveEditedNote = async (msgId) => {
        if (!editingNoteText.trim() || !selectedConvo) return;
        setIsSavingNoteMsg(true);
        try {
            const res = await fetchWithAuth(
                `${API_URL}/chat/conversations/${selectedConvo.id}/notes/${msgId}`,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ private_note: editingNoteText.trim() })
                },
                activeClient?.id
            );

            if (res.ok) {
                const data = await res.json();
                const updatedContent = data.message?.content || `🔒 Anotação Privada: ${editingNoteText.trim()}`;

                engine.setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: updatedContent } : m));
                setSelectedConvo(prev => ({ ...prev, private_note: editingNoteText.trim() }));
                engine.setConversations(prev => prev.map(c => c.id === selectedConvo.id ? { ...c, private_note: editingNoteText.trim() } : c));
                engine.setPrivateNote(editingNoteText.trim());

                toast.success('Anotação privada atualizada!');
                setEditingNoteId(null);
                setEditingNoteText('');
            } else {
                const err = await res.json();
                throw new Error(err.detail || 'Erro ao atualizar anotação.');
            }
        } catch (err) {
            toast.error(err.message || 'Erro ao salvar anotação.');
        } finally {
            setIsSavingNoteMsg(false);
        }
    };

    const [deleteNoteConfirmMsgId, setDeleteNoteConfirmMsgId] = React.useState(null);
    const [isDeletingNoteMsg, setIsDeletingNoteMsg] = React.useState(false);

    const handleDeleteNoteMsg = async (msgId) => {
        if (!msgId || !selectedConvo) return;
        setIsDeletingNoteMsg(true);
        try {
            const res = await fetchWithAuth(
                `${API_URL}/chat/conversations/${selectedConvo.id}/messages/${msgId}`,
                { method: 'DELETE' },
                activeClient?.id
            );

            if (res.ok) {
                engine.setMessages(prev => prev.filter(m => m.id !== msgId));

                const remainingNotes = engine.messages.filter(m => m.id !== msgId && m.sender_type === 'system' && m.content?.startsWith('🔒 Anotação Privada:'));
                const newestNote = remainingNotes.length > 0 ? remainingNotes[remainingNotes.length - 1].content.replace('🔒 Anotação Privada: ', '') : '';

                setSelectedConvo(prev => ({ ...prev, private_note: newestNote }));
                engine.setConversations(prev => prev.map(c => c.id === selectedConvo.id ? { ...c, private_note: newestNote } : c));
                engine.setPrivateNote(newestNote);

                toast.success('Anotação privada excluída!');
                setDeleteNoteConfirmMsgId(null);
            } else {
                const err = await res.json();
                throw new Error(err.detail || 'Erro ao excluir anotação.');
            }
        } catch (err) {
            toast.error(err.message || 'Erro ao excluir anotação.');
        } finally {
            setIsDeletingNoteMsg(false);
        }
    };

    const [isOpenAiConfigured, setIsOpenAiConfigured] = React.useState(false);
    const [isAnalyzingAi, setIsAnalyzingAi] = React.useState(false);
    const [aiReportData, setAiReportData] = React.useState(null);
    const [isAiReportModalOpen, setIsAiReportModalOpen] = React.useState(false);

    useEffect(() => {
        const checkAiConfig = async () => {
            try {
                const res = await fetchWithAuth(`${API_URL}/chat/ai-config`, {}, activeClient?.id);
                if (res.ok) {
                    const data = await res.json();
                    setIsOpenAiConfigured(!!data.openai_configured);
                }
            } catch (err) {
                console.error('Erro ao verificar AI config:', err);
            }
        };
        checkAiConfig();
    }, [activeClient?.id]);

    const handleAnalyzeSingleChatDoubts = async () => {
        if (!selectedConvo || isAnalyzingAi) return;
        setIsAnalyzingAi(true);
        try {
            const res = await fetchWithAuth(
                `${API_URL}/chat/conversations/${selectedConvo.id}/analyze-doubts`,
                { method: 'POST' },
                activeClient?.id
            );

            if (res.ok) {
                const data = await res.json();
                setAiReportData({
                    title: `Análise de Dúvidas (IA) — ${data.contact_name}`,
                    raw_report: data.raw_report,
                    has_unanswered_doubts: data.has_unanswered_doubts,
                    isBulk: false
                });
                setIsAiReportModalOpen(true);
                toast.success('Análise de dúvidas por IA concluída!');
            } else {
                const err = await res.json();
                throw new Error(err.detail || 'Erro ao analisar dúvidas com IA.');
            }
        } catch (err) {
            toast.error(err.message || 'Erro ao analisar dúvidas.');
        } finally {
            setIsAnalyzingAi(false);
        }
    };

    const handleAnalyzeBulkChatsDoubts = async () => {
        if (!engine.selectedConversationIds || engine.selectedConversationIds.length === 0 || isAnalyzingAi) return;
        setIsAnalyzingAi(true);
        try {
            const res = await fetchWithAuth(
                `${API_URL}/chat/conversations/analyze-doubts-bulk`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ conversation_ids: engine.selectedConversationIds })
                },
                activeClient?.id
            );

            if (res.ok) {
                const data = await res.json();
                setAiReportData({
                    title: `Relatório Consolidado de Dúvidas (IA) — ${data.total_analyzed} Conversas`,
                    raw_report: data.raw_report,
                    has_unanswered_doubts: data.has_unanswered_doubts,
                    total_analyzed: data.total_analyzed,
                    isBulk: true
                });
                setIsAiReportModalOpen(true);
                toast.success(`Análise de ${data.total_analyzed} conversas concluída!`);
            } else {
                const err = await res.json();
                throw new Error(err.detail || 'Erro ao analisar conversas em massa.');
            }
        } catch (err) {
            toast.error(err.message || 'Erro ao analisar conversas.');
        } finally {
            setIsAnalyzingAi(false);
        }
    };

    const exportAiReportHtml = () => {
        if (!aiReportData) return;
        const reportTitle = aiReportData.title || 'Relatório de Dúvidas IA';
        const dateStr = new Date().toLocaleString('pt-BR');

        const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>${reportTitle}</title>
<style>
    body { font-family: 'Calibri', 'Segoe UI', system-ui, Arial, sans-serif; margin: 0; padding: 30px; color: #0f172a; background-color: #f8fafc; }
    .container { max-width: 860px; margin: 0 auto; background: #ffffff; padding: 35px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { border-bottom: 2px solid #8b5cf6; padding-bottom: 15px; margin-bottom: 25px; }
    .header h1 { color: #5b21b6; font-size: 22px; margin: 0 0 8px 0; }
    .meta { font-size: 13px; color: #64748b; margin-bottom: 20px; }
    .content { font-size: 14px; line-height: 1.6; white-space: pre-wrap; color: #1e293b; background: #faf5ff; border-left: 4px solid #8b5cf6; padding: 20px; border-radius: 8px; }
    .btn-print { background: #7c3aed; color: #ffffff; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 600; cursor: pointer; float: right; }
    @media print { .btn-print { display: none; } }
</style>
</head>
<body>
    <div class="container">
        <button onclick="window.print()" class="btn-print">🖨️ Imprimir / Salvar PDF</button>
        <div class="header">
            <h1>🤖 ${reportTitle}</h1>
            <div class="meta">Data da Análise: ${dateStr} | Gerado via ZapVoice IA</div>
        </div>
        <div class="content">${aiReportData.raw_report}</div>
    </div>
</body>
</html>
        `.trim();

        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `relatorio_duvidas_ia_${new Date().getTime()}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    };

    const processFileAttachment = (file) => {
        if (!file || !selectedConvo) return;

        // Lista de extensões permitidas pelo backend / WhatsApp
        const ALLOWED_EXTENSIONS = [
            '.jpg', '.jpeg', '.png', '.gif', '.webp',
            '.mp4', '.3gp', '.webm', '.mov', '.avi', '.mkv',
            '.pdf', '.docx', '.xlsx', '.pptx', '.txt', '.zip', '.rar',
            '.mp3', '.ogg', '.wav', '.aac', '.m4a'
        ];

        const ext = file.name ? file.name.substring(file.name.lastIndexOf('.')).toLowerCase() : '';
        if (ext && !ALLOWED_EXTENSIONS.includes(ext)) {
            toast.error(`Extensão '${ext}' não permitida. Aceitamos formatos de imagem (JPG, PNG, WEBP, GIF), vídeo, áudio e documentos.`);
            return;
        }

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

        const localUrl = URL.createObjectURL(file);
        engine.setMediaPreview({ file, localUrl, messageType, fileUrl: null });
        engine.setPreviewCaption(engine.newMessage || '');
    };

    const handleMediaUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !selectedConvo) return;
        e.target.value = null;
        processFileAttachment(file);
    };

    const handlePaste = (e) => {
        if (!selectedConvo) return;
        const clipboardItems = e.clipboardData?.items;
        if (!clipboardItems) return;

        for (let i = 0; i < clipboardItems.length; i++) {
            const item = clipboardItems[i];
            if (item.kind === 'file') {
                const file = item.getAsFile();
                if (file) {
                    e.preventDefault();
                    processFileAttachment(file);
                    break;
                }
            }
        }
    };

    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!selectedConvo) return;
        if (e.dataTransfer?.types?.includes('Files')) {
            dragCounter.current += 1;
            setIsDraggingFile(true);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!selectedConvo) return;
        if (e.dataTransfer) {
            e.dataTransfer.dropEffect = 'copy';
        }
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current -= 1;
        if (dragCounter.current <= 0) {
            dragCounter.current = 0;
            setIsDraggingFile(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current = 0;
        setIsDraggingFile(false);
        if (!selectedConvo) return;

        const droppedFiles = e.dataTransfer?.files;
        if (droppedFiles && droppedFiles.length > 0) {
            processFileAttachment(droppedFiles[0]);
        }
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

            const mediaPayload = {
                media_url: fileUrl,
                message_type: messageType,
                caption: caption || ''
            };
            if (replyingTo?.wa_message_id) {
                mediaPayload.quoted_wa_message_id = replyingTo.wa_message_id;
            }

            const sendRes = await fetchWithAuth(`${API_URL}/chat/conversations/${selectedConvo.id}/media`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(mediaPayload)
            }, activeClient.id);

            if (sendRes.ok) {
                const sentMsg = await sendRes.json();
                engine.setMessages(prev => [...prev, sentMsg]);
                engine.setShouldScrollToBottom(true);
                toast.success('Mídia enviada com sucesso!', { id: toastId });
                engine.loadConversations(false);
                engine.setMediaPreview(null);
                engine.setPreviewCaption('');
                engine.setNewMessage('');
                setReplyingTo(null);
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

    const handleAddTagWithName = async (tagName, customColor = null) => {
        if (!tagName || !tagName.trim() || !selectedConvo) return;
        const cleanTag = tagName.trim().slice(0, 20);
        const currentTags = selectedConvo.labels || [];

        if (currentTags.map(t => t.toLowerCase()).includes(cleanTag.toLowerCase())) {
            toast.error('Esta etiqueta já foi adicionada.');
            return;
        }

        if (customColor) {
            try {
                await fetchWithAuth(`${API_URL}/chat/labels`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: cleanTag, color: customColor })
                }, activeClient.id);
            } catch (err) {
                console.error('Erro ao registrar nova etiqueta:', err);
            }
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

    const handleBulkTagConversations = async (tagToApply) => {
        const label = (tagToApply || customBulkTag || selectedBulkTag || '').trim();
        if (!label) {
            toast.error('Informe ou selecione uma etiqueta.');
            return;
        }
        if (!engine.selectedConvoIds.length && !selectAllPages) return;

        setIsApplyingBulkTag(true);
        const payload = selectAllPages ? {
            select_all_pages: true,
            labels: [label],
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
            template_sent_24h_only: filterTemplate24h || undefined,
            has_replied: filterHasReplied || undefined
        } : {
            labels: [label],
            ids: engine.selectedConvoIds
        };

        const toastId = toast.loading(`Aplicando etiqueta "${label}"...`);
        try {
            const res = await fetchWithAuth(`${API_URL}/chat/conversations/bulk-tag`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }, activeClient?.id);

            if (res.ok) {
                const data = await res.json();
                toast.success(`Etiqueta "${label}" aplicada em ${data.updated_count || 0} conversa(s)!`, { id: toastId });
                setIsBulkTagModalOpen(false);
                setSelectedBulkTag('');
                setCustomBulkTag('');
                engine.setSelectedConvoIds([]);
                setSelectAllPages(false);
                engine.loadConversations(true);
                engine.loadAvailableLabels();
            } else {
                const errData = await res.json().catch(() => ({}));
                toast.error(errData.detail || 'Erro ao aplicar etiqueta.', { id: toastId });
            }
        } catch {
            toast.error('Erro de conexão ao aplicar etiqueta.', { id: toastId });
        } finally {
            setIsApplyingBulkTag(false);
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
    }, [activeTab, statusFilter, searchQuery, selectedLabelFilter, filterBlockStatus, filterHasNote, filterStartDate, filterEndDate, activeClient, engine.page, engine.limit, filterUnread, filterWindowOpen, filterTemplate24h, filterUrgent, filterHasReplied, filterHasActiveFunnel]);

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
            let diff = expiry - now;

            // Garantir que não exiba 24:00:01 devido a pequenas variações de relógio entre cliente e servidor
            const maxDiff = (24 * 60 * 60 * 1000) - 1000;
            if (diff > maxDiff) diff = maxDiff;

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

    React.useEffect(() => {
        const isModalOpen = isNoteModalMaximized || isMaximizedInputOpen || !!deleteNoteConfirmMsgId || isBulkTagModalOpen || isAiReportModalOpen || showTemplateModal || showFunnelModal || !!engine?.confirmDeleteConvos || !!engine?.mediaPreview;
        if (isModalOpen) {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = originalOverflow;
            };
        }
    }, [isNoteModalMaximized, isMaximizedInputOpen, deleteNoteConfirmMsgId, isBulkTagModalOpen, isAiReportModalOpen, showTemplateModal, showFunnelModal, engine?.confirmDeleteConvos, engine?.mediaPreview]);

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
                    {user?.role !== 'vendedor' && NAV_SHORTCUTS.map(s => {
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
                    {/* Botão fechar — sempre visível (especialmente importante para o cargo Vendedor) */}
                    {onClose && (
                        <button
                            onClick={onClose}
                            title="Fechar painel de atendimento"
                            className="ml-1 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition"
                        >
                            <FiX size={18} />
                        </button>
                    )}
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
                                { key: 'status', label: 'Status', icon: FiRefreshCw, active: filterWindowOpen || filterTemplate24h || filterUnread || filterHasNote || filterUrgent || filterHasReplied },
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
                             <div className="px-4 pb-3 grid grid-cols-3 gap-1.5">
                                 <button
                                     onClick={() => setFilterWindowOpen(!filterWindowOpen)}
                                     className={`py-1.5 px-1 rounded-lg border text-[10px] font-semibold text-center truncate transition ${filterWindowOpen ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'text-gray-400 border-gray-200 dark:border-white/5 bg-white dark:bg-[#1e293b]'}`}
                                 >
                                     Janela 24h
                                 </button>
                                 <button
                                     onClick={() => setFilterTemplate24h(!filterTemplate24h)}
                                     className={`py-1.5 px-1 rounded-lg border text-[10px] font-semibold text-center truncate transition ${filterTemplate24h ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'text-gray-400 border-gray-200 dark:border-white/5 bg-white dark:bg-[#1e293b]'}`}
                                     title="Filtrar conversas que receberam mensagem de modelo (template) nas últimas 24h"
                                 >
                                     Template 24h
                                 </button>
                                 <button
                                     onClick={() => setFilterUnread(!filterUnread)}
                                     className={`py-1.5 px-1 rounded-lg border text-[10px] font-semibold text-center truncate transition ${filterUnread ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'text-gray-400 border-gray-200 dark:border-white/5 bg-white dark:bg-[#1e293b]'}`}
                                 >
                                     Não lidas
                                 </button>
                                 <button
                                     onClick={() => setFilterHasNote(!filterHasNote)}
                                     className={`py-1.5 px-1 rounded-lg border text-[10px] font-semibold text-center truncate transition ${filterHasNote ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' : 'text-gray-400 border-gray-200 dark:border-white/5 bg-white dark:bg-[#1e293b]'}`}
                                 >
                                     Anotações
                                 </button>
                                 <button
                                     onClick={() => setFilterUrgent(!filterUrgent)}
                                     className={`py-1.5 px-1 rounded-lg border text-[10px] font-semibold text-center truncate transition ${filterUrgent ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'text-gray-400 border-gray-200 dark:border-white/5 bg-white dark:bg-[#1e293b]'}`}
                                 >
                                     Urgentes
                                 </button>
                                 <button
                                     onClick={() => setFilterHasReplied(!filterHasReplied)}
                                     className={`py-1.5 px-1 rounded-lg border text-[10px] font-semibold text-center truncate transition ${filterHasReplied ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' : 'text-gray-400 border-gray-200 dark:border-white/5 bg-white dark:bg-[#1e293b]'}`}
                                     title="Filtrar contatos que enviaram pelo menos 1 mensagem"
                                 >
                                     Respondeu
                                 </button>
                                 <button
                                     onClick={() => setFilterHasActiveFunnel(!filterHasActiveFunnel)}
                                     className={`py-1.5 px-1 rounded-lg border text-[10px] font-semibold text-center truncate transition ${filterHasActiveFunnel ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 font-bold ring-1 ring-cyan-500/40' : 'text-gray-400 border-gray-200 dark:border-white/5 bg-white dark:bg-[#1e293b]'}`}
                                     title="Filtrar contatos que possuem um funil em execução no momento"
                                 >
                                     Funil Ativo
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
                                  <div className="ml-auto flex items-center gap-2">
                                      <button
                                          onClick={() => setIsBulkTagModalOpen(true)}
                                          className="flex items-center gap-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 dark:text-blue-400 px-2.5 py-1 rounded-lg text-xs font-semibold transition border border-blue-500/20"
                                      >
                                          <FiTag size={13} />
                                          Etiquetar ({selectAllPages ? engine.totalConvos : engine.selectedConvoIds.length})
                                      </button>
                                      <button
                                          onClick={() => engine.setConfirmDeleteConvos('bulk')}
                                          className="flex items-center gap-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 dark:text-red-400 px-2.5 py-1 rounded-lg text-xs font-semibold transition border border-red-500/20"
                                      >
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                          Deletar ({selectAllPages ? engine.totalConvos : engine.selectedConvoIds.length})
                                      </button>
                                      {isOpenAiConfigured && (
                                          <button
                                              onClick={handleAnalyzeBulkChatsDoubts}
                                              disabled={isAnalyzingAi}
                                              className="flex items-center gap-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-300 px-2.5 py-1 rounded-lg text-xs font-semibold transition border border-purple-500/20 disabled:opacity-50"
                                              title="Analisar dúvidas não respondidas das conversas selecionadas com IA"
                                          >
                                              {isAnalyzingAi ? <FiRefreshCw className="animate-spin" size={13} /> : <BsStars size={13} />}
                                              <span>Analisar Dúvidas (IA)</span>
                                          </button>
                                      )}
                                  </div>
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
                    <div className="relative flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-white/5">
                        {/* Overlay de Carregamento / Filtragem */}
                        {engine.isLoadingConvos && (
                            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center gap-3 transition-opacity">
                                <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                <span className="text-xs font-semibold text-white bg-slate-800/90 px-3.5 py-1.5 rounded-xl border border-slate-700/60 shadow-xl">
                                    Filtrando conversas...
                                </span>
                            </div>
                        )}
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
                                                                  {label} <span className="opacity-70 font-normal">({label ? label.length : 0})</span>
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
                <div 
                    className="flex-1 flex flex-col h-full bg-white dark:bg-[#0f172a] relative"
                    onDragEnter={handleDragEnter}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onPaste={handlePaste}
                >
                    {isDraggingFile && (
                        <div
                            className="absolute inset-0 z-40 bg-blue-900/80 backdrop-blur-md border-2 border-dashed border-blue-400 rounded-2xl flex flex-col items-center justify-center text-white p-6 shadow-2xl transition-all pointer-events-none"
                        >
                            <div className="w-16 h-16 rounded-full bg-blue-500/30 flex items-center justify-center mb-3 animate-bounce">
                                <FiUploadCloud size={36} className="text-blue-300" />
                            </div>
                            <p className="text-lg font-bold text-white">Solte seu arquivo aqui para enviar</p>
                            <p className="text-xs text-blue-200 mt-1">Imagens, Vídeos, Áudios ou PDFs (Documentos)</p>
                        </div>
                    )}
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
                                            (() => {
                                                const isWindowClosed = !engine.timeLeft24h || engine.timeLeft24h === 'Janela Fechada' || String(engine.timeLeft24h).toLowerCase().includes('fechada');
                                                return (
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1.5 border transition-colors ${
                                                        isWindowClosed
                                                        ? 'bg-red-500/15 text-red-500 dark:text-red-400 border-red-500/30'
                                                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                                    }`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${isWindowClosed ? 'bg-red-500' : 'bg-emerald-500 animate-pulse'}`} />
                                                        <span className={isWindowClosed ? 'text-red-500 dark:text-red-400' : ''}>
                                                            {isWindowClosed ? 'Janela 24h: Janela Fechada' : `Janela 24h: ${engine.timeLeft24h}`}
                                                        </span>
                                                    </span>
                                                );
                                            })()
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
                                        onClick={() => {
                                            exportConversationToDoc(selectedConvo, engine.messages, activeClient?.id);
                                            toast.success('Histórico exportado! Arquivo HTML pronto para abrir ou salvar como PDF.');
                                        }}
                                        title="Exportar Conversa (HTML / PDF)"
                                        className="p-2 rounded-xl border bg-white dark:bg-[#1e293b] border-gray-200 dark:border-white/5 text-gray-600 dark:text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 dark:hover:border-blue-800/30 transition-all flex items-center justify-center"
                                    >
                                        <FiFileText size={16} />
                                    </button>

                                    {isOpenAiConfigured && (
                                        <button
                                            onClick={handleAnalyzeSingleChatDoubts}
                                            disabled={isAnalyzingAi}
                                            title="Analisar dúvidas não respondidas pelo agente nesta conversa (IA)"
                                            className="px-3 py-1.5 rounded-xl border bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-300 hover:bg-purple-500/20 hover:border-purple-300 transition-all flex items-center gap-1.5 text-xs font-semibold shadow-sm cursor-pointer disabled:opacity-50"
                                        >
                                            {isAnalyzingAi ? <FiRefreshCw className="animate-spin" size={14} /> : <BsStars size={14} />}
                                            <span>Dúvidas (IA)</span>
                                        </button>
                                    )}

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

                                    <button
                                        onClick={() => setSelectedConvo(null)}
                                        title="Fechar conversa"
                                        aria-label="Fechar conversa"
                                        className="p-2 rounded-xl border transition-all bg-white dark:bg-[#1e293b] border-gray-200 dark:border-white/5 text-gray-600 dark:text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 dark:hover:border-red-800/30 flex items-center justify-center"
                                    >
                                        <FiX size={16} />
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
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={handleOpenActiveFunnelPipeline}
                                            disabled={isLoadingPipeline}
                                            className="px-2.5 py-1 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:text-blue-300 rounded-lg transition text-[11px] font-bold flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
                                            title="Abrir pipeline da automação em tempo real"
                                        >
                                            <FiZap size={13} className={isLoadingPipeline ? "animate-spin" : ""} />
                                            {isLoadingPipeline ? "Carregando..." : "Ver Pipeline"}
                                        </button>
                                        <button
                                            onClick={() => setIsCancelFunnelModalOpen(true)}
                                            className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 rounded-lg transition text-[11px] font-bold flex items-center gap-1.5"
                                        >
                                            <FiX size={13} /> Cancelar Funil
                                        </button>
                                        <span className="text-[10px] text-gray-400 hidden sm:inline">
                                            Atualiza automaticamente
                                        </span>
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
                                                const isEditingThisNote = editingNoteId === msg.id;
                                                const noteText = msg.content.replace("🔒 Anotação Privada: ", "");

                                                return (
                                                    <div key={msg.id} className="flex justify-center my-2">
                                                        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 rounded-xl px-4 py-2.5 shadow-sm text-xs max-w-lg w-full">
                                                            <div className="flex items-center justify-between font-bold mb-1.5 uppercase tracking-wider text-[10px] text-amber-600 dark:text-amber-400">
                                                                <div className="flex items-center gap-1.5">
                                                                    <BsJournalText size={12} />
                                                                    <span>Anotação Interna / Nota Privada</span>
                                                                </div>
                                                                {!isEditingThisNote && (
                                                                     <div className="flex items-center gap-2">
                                                                         <button
                                                                             type="button"
                                                                             onClick={() => {
                                                                                 setEditingNoteId(msg.id);
                                                                                 setEditingNoteText(noteText);
                                                                             }}
                                                                             className="p-1 rounded hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 transition-all flex items-center gap-1 text-[10px] font-semibold"
                                                                             title="Editar esta anotação privada"
                                                                         >
                                                                             <FiEdit2 size={11} />
                                                                             <span>Editar</span>
                                                                         </button>
                                                                         <button
                                                                             type="button"
                                                                             onClick={() => setDeleteNoteConfirmMsgId(msg.id)}
                                                                             className="p-1 rounded hover:bg-red-500/20 text-red-600 dark:text-red-400 transition-all flex items-center gap-1 text-[10px] font-semibold"
                                                                             title="Excluir esta anotação privada"
                                                                         >
                                                                             <FiTrash2 size={11} />
                                                                             <span>Deletar</span>
                                                                         </button>
                                                                     </div>
                                                                 )}
                                                            </div>

                                                            {isEditingThisNote ? (
                                                                <div className="space-y-2 mt-1">
                                                                    <textarea
                                                                        value={editingNoteText}
                                                                        onChange={(e) => setEditingNoteText(e.target.value)}
                                                                        className="w-full px-3 py-2 bg-white/10 dark:bg-black/30 border border-amber-500/30 rounded-lg text-amber-900 dark:text-amber-100 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 font-sans"
                                                                        rows={3}
                                                                        autoFocus
                                                                    />
                                                                    <div className="flex justify-end gap-2">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setIsNoteModalMaximized(true)}
                                                                            className="px-2.5 py-1 rounded-lg border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[10px] font-semibold hover:bg-amber-500/20 transition flex items-center gap-1"
                                                                            title="Maximizar em um popup para digitar com mais espaço"
                                                                        >
                                                                            <FiMaximize2 size={10} />
                                                                            <span>Maximizar</span>
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setEditingNoteId(null)}
                                                                            className="px-2.5 py-1 rounded-lg border border-amber-500/30 text-amber-700 dark:text-amber-400 text-[10px] font-semibold hover:bg-amber-500/10 transition"
                                                                        >
                                                                            Cancelar
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            disabled={isSavingNoteMsg || !editingNoteText || !editingNoteText.trim()}
                                                                            onClick={() => handleSaveEditedNote(msg.id)}
                                                                            className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-semibold transition flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                        >
                                                                            {isSavingNoteMsg ? <FiRefreshCw className="animate-spin" size={10} /> : <FiCheck size={11} />}
                                                                            <span>Salvar</span>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <p className="whitespace-pre-wrap leading-relaxed font-sans">{noteText}</p>
                                                                    <div className="flex justify-end mt-1 text-[9px] opacity-75 font-medium tracking-wide">
                                                                        {formatMessageTimestamp(msg.timestamp)}
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            } else {
                                                // Mensagem normal do sistema (ex: etiqueta adicionada, conversa atribuída, marcador removido)
                                                const isLabelNotice = msg.content && (msg.content.includes("Etiqueta") || msg.content.includes("etiqueta") || msg.content.includes("Marcador") || msg.content.includes("marcador"));
                                                return (
                                                    <div key={msg.id} className="flex justify-center my-2 animate-in fade-in duration-300">
                                                        <div className={`border rounded-lg px-3.5 py-1.5 shadow-sm text-[11px] max-w-md text-center flex items-center justify-center gap-2 ${
                                                            isLabelNotice 
                                                            ? 'bg-blue-500/10 border-blue-500/25 text-blue-800 dark:text-blue-300' 
                                                            : 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/5 text-gray-600 dark:text-gray-400'
                                                        }`}>
                                                            {isLabelNotice && <FiTag size={13} className="text-blue-500 shrink-0" />}
                                                            <div>
                                                                <p className="font-medium font-sans leading-relaxed">{msg.content}</p>
                                                                <div className="text-[9px] opacity-60 mt-0.5">
                                                                    {formatMessageTimestamp(msg.timestamp)}
                                                                </div>
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
                                                id={`msg-${msg.id}`}
                                                data-wamid={msg.wa_message_id}
                                                className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${msg.meta_data?.reactions?.length > 0 ? 'mb-4' : ''}`}
                                            >
                                                <div
                                                    className={`group/msg relative max-w-lg rounded-2xl px-4 py-2.5 shadow-sm text-sm transition-all duration-300 ${
                                                        isTemplate
                                                        ? 'bg-gradient-to-br from-[#1e1b4b] to-[#1e293b] text-gray-100 border border-indigo-500/30 rounded-tr-none'
                                                        : isMe
                                                        ? 'bg-blue-600 text-white rounded-tr-none'
                                                        : 'bg-white dark:bg-[#1e293b] text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-white/5 rounded-tl-none'
                                                    }`}
                                                >
                                                    {/* Barra de Reação Rápida & Reply (Hover) */}
                                                    <div className={`absolute -top-4 ${isMe ? 'right-2' : 'left-2'} hidden group-hover/msg:flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-1 rounded-full shadow-lg z-20 transition-all scale-90 hover:scale-100`}>
                                                        {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => {
                                                             const reactionList = getReactionsList(msg.meta_data?.reactions);
                                                             const myReaction = reactionList.find(r => r.sender !== 'contact');
                                                             const isSelected = myReaction?.emoji === emoji;

                                                             return (
                                                                 <button
                                                                     key={emoji}
                                                                     type="button"
                                                                     onClick={(e) => {
                                                                         e.stopPropagation();
                                                                         const targetMsgId = msg.wa_message_id || msg.wamid || msg.message_id || msg.id;
                                                                         // Se já estiver selecionado, envia string vazia para remover a reação
                                                                         engine.sendReaction(targetMsgId, isSelected ? '' : emoji);
                                                                     }}
                                                                     className={`hover:scale-125 transition-transform text-xs p-0.5 cursor-pointer leading-none rounded-full ${isSelected ? 'bg-blue-500/20 ring-1 ring-blue-400' : ''}`}
                                                                     title={isSelected ? `Remover reação ${emoji}` : `Reagir com ${emoji}`}
                                                                 >
                                                                     {emoji}
                                                                 </button>
                                                             );
                                                         })}
                                                        <div className="w-[1px] h-3 bg-gray-300 dark:bg-gray-600 mx-0.5" />
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setReplyingTo({
                                                                    id: msg.id,
                                                                    content: msg.content || (msg.media_url ? '[Mídia]' : ''),
                                                                    sender_type: msg.sender_type,
                                                                    wa_message_id: msg.wa_message_id || msg.wamid || msg.message_id || String(msg.id)
                                                                });
                                                                if (chatInputRef.current) chatInputRef.current.focus();
                                                            }}
                                                            className="hover:scale-125 text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 transition-transform p-0.5 cursor-pointer flex items-center justify-center"
                                                            title="Responder a esta mensagem"
                                                        >
                                                            <FiCornerUpLeft size={13} />
                                                        </button>
                                                    </div>

                                                    {/* Citação de mensagem respondida (Quote Box) */}
                                                    {msg.quoted_message_id && (() => {
                                                         const qId = String(msg.quoted_message_id);
                                                         const cleanQId = qId.replace('wamid.', '');
                                                         const quotedMsg = engine.messages.find(m => {
                                                             if (!m) return false;
                                                             const mWaId = String(m.wa_message_id || '');
                                                             const mCleanWaId = mWaId.replace('wamid.', '');
                                                             const mId = String(m.id || '');
                                                             return mWaId === qId || mCleanWaId === cleanQId || mId === qId || mId === cleanQId;
                                                         });
                                                         const isQuotedMe = quotedMsg ? (quotedMsg.sender_type === 'user' || quotedMsg.sender_type === 'agent') : false;
                                                         const authorLabel = isQuotedMe ? 'Você' : (selectedConvo?.contact_name || getFirstName(selectedConvo?.phone) || 'Contato');
                                                         const quotedText = quotedMsg?.content || 'Mensagem citada';

                                                         const scrollToQuotedMsg = (e) => {
                                                             e.stopPropagation();
                                                             if (!quotedMsg) return;
                                                             let targetEl = document.getElementById(`msg-${quotedMsg.id}`);
                                                             if (!targetEl && quotedMsg.wa_message_id) {
                                                                 targetEl = document.querySelector(`[data-wamid="${quotedMsg.wa_message_id}"]`);
                                                             }
                                                             if (targetEl) {
                                                                 targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                                 const bubbleEl = targetEl.lastElementChild || targetEl;
                                                                 bubbleEl.classList.add('ring-4', 'ring-yellow-400', 'scale-105');
                                                                 setTimeout(() => {
                                                                     bubbleEl.classList.remove('ring-4', 'ring-yellow-400', 'scale-105');
                                                                 }, 1500);
                                                             }
                                                         };

                                                         return (
                                                             <div 
                                                                 onClick={scrollToQuotedMsg}
                                                                 className={`mb-2 p-2 rounded-lg border-l-4 text-xs font-sans select-none overflow-hidden cursor-pointer hover:opacity-90 active:scale-[0.99] transition-all ${
                                                                     isMe
                                                                     ? 'bg-black/20 border-white/70 text-white/90'
                                                                     : 'bg-gray-100 dark:bg-black/30 border-blue-500 text-gray-700 dark:text-gray-300'
                                                                 }`}
                                                                 title="Clique para ir até a mensagem original"
                                                             >
                                                                 <div className="flex items-center gap-1 font-semibold text-[11px] mb-0.5 text-blue-400 dark:text-blue-300">
                                                                     <FiCornerUpLeft size={11} />
                                                                     <span>{authorLabel}</span>
                                                                 </div>
                                                                 <p className="line-clamp-2 text-[11px] opacity-90 leading-tight">
                                                                     {quotedText}
                                                                 </p>
                                                             </div>
                                                         );
                                                    })()}

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
                                                                            className="flex items-center gap-2 p-2 bg-indigo-950/60 hover:bg-indigo-900/40 text-indigo-200 rounded-lg transition max-w-full truncate"
                                                                            title={msg.meta_data?.filename || 'Documento'}
                                                                        >
                                                                            <span>📄 <span className="truncate">{msg.meta_data?.filename || (msg.media_url && !msg.media_url.startsWith('media_id:') && msg.media_url.includes('/') ? msg.media_url.split('/').pop().split('?')[0] : 'Baixar Documento')}</span></span>
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
                                                                    className="flex items-center gap-2 text-xs font-bold underline bg-gray-100 dark:bg-black/20 p-2.5 rounded-lg text-blue-600 dark:text-blue-400 max-w-full truncate"
                                                                    title={msg.meta_data?.filename || (msg.media_url?.includes('/') ? msg.media_url.split('/').pop().split('?')[0] : 'Documento')}
                                                                >
                                                                    📎 <span className="truncate">{msg.meta_data?.filename || (msg.media_url && !msg.media_url.startsWith('media_id:') && msg.media_url.includes('/') ? msg.media_url.split('/').pop().split('?')[0] : 'Baixar Documento')}</span>
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
                                                    {(() => {
                                                        const reactionList = getReactionsList(msg.meta_data?.reactions);
                                                        if (reactionList.length === 0) return null;
                                                        return (
                                                            <div className={`absolute -bottom-3 ${isMe ? 'left-2' : 'right-2'} flex gap-0.5 z-10`}>
                                                                {reactionList.map((r, i) => {
                                                                    const isMyReaction = r.sender !== 'contact';
                                                                    return (
                                                                        <span
                                                                            key={i}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                if (isMyReaction) {
                                                                                    const targetMsgId = msg.wa_message_id || msg.wamid || msg.message_id || msg.id;
                                                                                    engine.sendReaction(targetMsgId, '');
                                                                                }
                                                                            }}
                                                                            className={`text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-full px-1.5 py-0.5 shadow-sm leading-none flex items-center justify-center transition-transform ${isMyReaction ? 'cursor-pointer hover:scale-110 hover:bg-red-500/10 hover:border-red-400' : ''}`}
                                                                            title={isMyReaction ? 'Clique para remover sua reação' : 'Contato reagiu'}
                                                                        >
                                                                            {r.emoji}
                                                                        </span>
                                                                    );
                                                                })}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        );
                                    })
                                }
                                <div ref={engine.messagesEndRef} />

                            </div>

                            {/* Barra de Preview de Resposta (quando replyingTo está ativo) */}
                            {replyingTo && (
                                <div className="px-4 py-2 bg-blue-500/10 border-t border-blue-500/20 flex items-center justify-between gap-2 text-xs animate-in slide-in-from-bottom-2 duration-200">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <div className="w-1 h-8 bg-blue-500 rounded-full shrink-0" />
                                        <div className="overflow-hidden">
                                            <div className="flex items-center gap-1 text-[11px] font-semibold text-blue-500 dark:text-blue-400">
                                                <FiCornerUpLeft size={12} />
                                                <span>Respondendo a {replyingTo.sender_type === 'user' || replyingTo.sender_type === 'agent' ? 'Você' : (selectedConvo?.contact_name || getFirstName(selectedConvo?.phone) || 'Contato')}</span>
                                            </div>
                                            <p className="text-gray-600 dark:text-gray-300 truncate text-[11px]">
                                                {replyingTo.content || '[Mídia]'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setReplyingTo(null)}
                                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition shrink-0"
                                        title="Cancelar resposta"
                                    >
                                        <FiX size={15} />
                                    </button>
                                </div>
                            )}

                            {/* Input de Envio */}
                            <form 
                                onSubmit={(e) => {
                                    const opts = replyingTo?.wa_message_id ? { quotedWaMessageId: replyingTo.wa_message_id } : {};
                                    engine.handleSendMessage(e, opts);
                                    setReplyingTo(null);
                                }} 
                                className="p-4 border-t border-gray-200 dark:border-white/5 bg-gray-50/20 dark:bg-[#111827]/20 flex gap-2 relative"
                            >
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
                                    <textarea
                                        ref={chatInputRef}
                                        rows={1}
                                        placeholder={engine.timeLeft24h === 'Janela Fechada' ? "Janela de 24h fechada. O cliente precisa enviar uma nova mensagem." : "Digite sua mensagem de resposta..."}
                                        value={engine.newMessage}
                                        onChange={(e) => {
                                            engine.setNewMessage(e.target.value);
                                            e.target.style.height = 'auto';
                                            e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                if (engine.newMessage.trim() && !engine.isSending && engine.timeLeft24h !== 'Janela Fechada') {
                                                    const opts = replyingTo?.wa_message_id ? { quotedWaMessageId: replyingTo.wa_message_id } : {};
                                                    engine.handleSendMessage(e, opts);
                                                    setReplyingTo(null);
                                                }
                                            }
                                        }}
                                        className="flex-1 px-4 py-2.5 bg-white dark:bg-[#1e293b] text-gray-700 dark:text-gray-200 text-sm rounded-xl border border-gray-200 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-55 disabled:bg-gray-100 dark:disabled:bg-gray-800 resize-none max-h-36 min-h-[42px] font-sans leading-relaxed overflow-y-auto"
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
                        setSelectedConvo={setSelectedConvo}
                        timeLeft24h={engine.timeLeft24h}
                        handleClose24hWindow={engine.handleClose24hWindow}
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
            {/* Modal Maximizado de Edição de Anotação Privada */}
            {isNoteModalMaximized && (
                <div
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div
                        className="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0f172a]/60">
                            <div className="flex items-center gap-2 font-bold text-gray-800 dark:text-white text-sm">
                                <BsJournalText className="text-amber-500" size={18} />
                                <span>Anotação Privada — {selectedConvo?.contact_name || selectedConvo?.phone}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsNoteModalMaximized(false)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 transition"
                                title="Fechar modal"
                            >
                                <FiX size={18} />
                            </button>
                        </div>

                        <div className="p-6 space-y-3">
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Digite o conteúdo da anotação privada abaixo:
                            </label>
                            <textarea
                                value={editingNoteText}
                                onChange={(e) => setEditingNoteText(e.target.value)}
                                placeholder="Escreva os detalhes da anotação privada..."
                                className="w-full h-72 px-4 py-3 bg-gray-50 dark:bg-black/30 text-gray-800 dark:text-gray-100 text-xs rounded-xl border border-gray-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-amber-500 font-sans resize-y leading-relaxed"
                                autoFocus
                            />
                            <div className="flex justify-between items-center text-[11px] text-gray-400 font-medium">
                                <span>{editingNoteText ? editingNoteText.length : 0} caracteres digitados</span>
                                <span>🔒 Anotação visível apenas para sua equipe</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0f172a]/60">
                            <button
                                type="button"
                                onClick={() => setIsNoteModalMaximized(false)}
                                className="px-4 py-2 rounded-xl border border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-300 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-white/5 transition"
                            >
                                Fechar
                            </button>
                            <button
                                type="button"
                                disabled={isSavingNoteMsg}
                                onClick={async () => {
                                    if (editingNoteId) {
                                        await handleSaveEditedNote(editingNoteId);
                                    }
                                    setIsNoteModalMaximized(false);
                                }}
                                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-semibold transition-all flex items-center gap-2 shadow-md"
                            >
                                {isSavingNoteMsg ? <FiRefreshCw className="animate-spin" size={14} /> : <FiCheck size={14} />}
                                <span>Salvar Anotação</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Modal de Confirmação de Exclusão de Anotação Privada */}
            {deleteNoteConfirmMsgId && (
                <div
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div
                        className="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0f172a]/60">
                            <div className="flex items-center gap-2 font-bold text-red-600 dark:text-red-400 text-sm">
                                <BsExclamationCircleFill size={18} />
                                <span>Excluir Anotação Privada</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setDeleteNoteConfirmMsgId(null)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 transition"
                            >
                                <FiX size={18} />
                            </button>
                        </div>

                        <div className="p-6 space-y-2">
                            <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed font-sans">
                                Tem certeza de que deseja excluir permanentemente esta anotação privada?
                            </p>
                            <p className="text-[11px] text-gray-400 font-medium">
                                Esta ação não poderá ser desfeita e a anotação será removida do histórico da conversa.
                            </p>
                        </div>

                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0f172a]/60">
                            <button
                                type="button"
                                onClick={() => setDeleteNoteConfirmMsgId(null)}
                                className="px-4 py-2 rounded-xl border border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-300 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-white/5 transition"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                disabled={isDeletingNoteMsg}
                                onClick={() => handleDeleteNoteMsg(deleteNoteConfirmMsgId)}
                                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold transition-all flex items-center gap-2 shadow-md hover:shadow-red-500/20"
                            >
                                {isDeletingNoteMsg ? <FiRefreshCw className="animate-spin" size={14} /> : <FiTrash2 size={14} />}
                                <span>Sim, Excluir</span>
                            </button>
                        </div>
                    </div>
                </div>
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
            {/* Modal de Confirmação de Cancelamento do Funil Em Execução */}
            {isCancelFunnelModalOpen && selectedConvo?.active_funnel && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-5" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                                <FiX size={22} />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-white">Cancelar execução do funil?</h3>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Funil: <strong className="text-slate-200">{selectedConvo.active_funnel.name}</strong>
                                </p>
                            </div>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed bg-slate-800/50 p-3 rounded-xl border border-slate-800">
                            Tem certeza que deseja interromper a execução deste funil para <strong className="text-white">{selectedConvo.contact_name || selectedConvo.phone}</strong>? As próximas etapas e disparos deste contato serão cancelados.
                        </p>

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                type="button"
                                disabled={isCancelingFunnel}
                                onClick={() => setIsCancelFunnelModalOpen(false)}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition disabled:opacity-50"
                            >
                                Voltar / Manter Execução
                            </button>
                            <button
                                type="button"
                                disabled={isCancelingFunnel}
                                onClick={async () => {
                                    setIsCancelingFunnel(true);
                                    const success = await engine.handleCancelFunnel();
                                    setIsCancelingFunnel(false);
                                    if (success) {
                                        setIsCancelFunnelModalOpen(false);
                                    }
                                }}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-lg shadow-red-600/20 transition flex items-center gap-2 disabled:opacity-50"
                            >
                                {isCancelingFunnel ? (
                                    <>
                                        <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                        <span>Cancelando...</span>
                                    </>
                                ) : (
                                    <span>Sim, Cancelar Funil</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Modal do Pipeline de Automação em Tempo Real */}
            {pipelineTrigger && (
                <AutomationPipelineModal
                    trigger={pipelineTrigger}
                    onClose={() => setPipelineTrigger(null)}
                    onStop={async () => {
                        await engine.handleCancelFunnel();
                        setPipelineTrigger(null);
                    }}
                    hideTabs={true}
                />
            )}
            {/* Modal de Etiquetagem em Massa */}
            {isBulkTagModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-5" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
                                    <FiTag size={18} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-base">Etiquetar Contatos</h3>
                                    <p className="text-xs text-slate-400">
                                        Aplicando em <strong>{selectAllPages ? engine.totalConvos : engine.selectedConvoIds.length}</strong> contato(s) selecionado(s)
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => { setIsBulkTagModalOpen(false); setSelectedBulkTag(''); setCustomBulkTag(''); }}
                                className="text-slate-400 hover:text-white p-1"
                            >
                                <FiX size={18} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {engine.availableLabels.length > 0 && (
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                        Escolher etiqueta existente:
                                    </label>
                                    <select
                                        value={selectedBulkTag}
                                        onChange={e => { setSelectedBulkTag(e.target.value); if (e.target.value) setCustomBulkTag(''); }}
                                        className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                                    >
                                        <option value="">-- Selecione uma etiqueta --</option>
                                        {engine.availableLabels.map(l => (
                                            <option key={l} value={l}>{l}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                    {engine.availableLabels.length > 0 ? 'Ou criar/digitar nova etiqueta:' : 'Digite o nome da etiqueta:'}
                                </label>
                                <input
                                    type="text"
                                    value={customBulkTag}
                                    onChange={e => { setCustomBulkTag(e.target.value); if (e.target.value) setSelectedBulkTag(''); }}
                                    placeholder="Ex: VIP, Interessado, Lead 2026"
                                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-blue-500 placeholder-slate-500"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
                            <button
                                onClick={() => { setIsBulkTagModalOpen(false); setSelectedBulkTag(''); setCustomBulkTag(''); }}
                                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700 transition"
                                disabled={isApplyingBulkTag}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => handleBulkTagConversations()}
                                disabled={isApplyingBulkTag || (!selectedBulkTag && !customBulkTag.trim())}
                                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition flex items-center gap-2"
                            >
                                {isApplyingBulkTag ? 'Aplicando...' : 'Aplicar Etiqueta'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Modal de Relatório de Dúvidas (IA) */}
            {isAiReportModalOpen && aiReportData && (
                <div
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div
                        className="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header do Modal */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-white/10 bg-purple-500/10 dark:bg-purple-900/20">
                            <div className="flex items-center gap-2 font-bold text-purple-900 dark:text-purple-200 text-sm">
                                <BsStars className="text-purple-500" size={18} />
                                <span>{aiReportData.title}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsAiReportModalOpen(false)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 transition"
                                title="Fechar modal"
                            >
                                <FiX size={18} />
                            </button>
                        </div>

                        {/* Corpo do Relatório com Scroll */}
                        <div className="p-6 space-y-4 overflow-y-auto flex-1 font-sans">
                            {!aiReportData.has_unanswered_doubts && (
                                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
                                    <span>✅ Nenhuma dúvida não respondida encontrada! Todas as perguntas foram devidamente atendidas.</span>
                                </div>
                            )}

                            <div className="bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl p-5 text-xs leading-relaxed text-gray-800 dark:text-gray-100 whitespace-pre-wrap">
                                {aiReportData.raw_report}
                            </div>
                        </div>

                        {/* Rodapé com Ações */}
                        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0f172a]/60">
                            <span className="text-[11px] text-gray-400">
                                Relatório gerado via OpenAI GPT
                            </span>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        navigator.clipboard.writeText(aiReportData.raw_report);
                                        toast.success('Relatório copiado para a área de transferência!');
                                    }}
                                    className="px-4 py-2 rounded-xl border border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-300 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-white/5 transition flex items-center gap-1.5"
                                >
                                    <span>📋 Copiar Texto</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={exportAiReportHtml}
                                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-md hover:shadow-purple-500/20"
                                >
                                    <FiFileText size={14} />
                                    <span>Exportar Relatório (HTML / PDF)</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsAiReportModalOpen(false)}
                                    className="px-4 py-2 rounded-xl border border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-300 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-white/5 transition"
                                >
                                    Fechar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    </>
);
}
