import React, { useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { FiMessageSquare, FiUploadCloud } from 'react-icons/fi';
import { useAuth } from '../AuthContext';
import { API_URL } from '../config';
import { useClient } from '../contexts/ClientContext';
import { getFirstName } from '../utils/nameFormatter';

// Componentes da Interface
import ChatHeaderNav from './ChatConversations/components/ChatHeaderNav';
import ChatListSidebar from './ChatConversations/components/ChatListSidebar';
import ActiveChatHeader from './ChatConversations/components/ActiveChatHeader';
import ActiveChatBanner from './ChatConversations/components/ActiveChatBanner';
import ChatMessageList from './ChatConversations/components/ChatMessageList';
import ActiveChatInput from './ChatConversations/components/ActiveChatInput';
import ChatContactSidebar from './ChatConversations/ChatContactSidebar';
import ChatModals from './ChatConversations/components/ChatModals';

import { useChatEngine } from './ChatConversations/useChatEngine';
import { exportConversationToDoc } from './ChatConversations/exportConversationToDoc';
import { useChatMediaUploader } from './ChatConversations/hooks/useChatMediaUploader';
import { useChatNoteAndAi } from './ChatConversations/hooks/useChatNoteAndAi';
import { useChatOperations } from './ChatConversations/hooks/useChatOperations';
import { resolveMediaUrl } from './ChatConversations/utils/mediaUrlResolver';
import { formatTime, formatMessageTimestamp } from './ChatConversations/utils/chatDateUtils';

export default function ChatConversations({ onClose, onNavigate }) {
    const { activeClient } = useClient();
    const { user } = useAuth();
    const [selectedConvo, setSelectedConvo] = React.useState(null);
    const [activeTab, setActiveTab] = React.useState('todos');
    const [statusFilter, setStatusFilter] = React.useState('open');
    const [searchQuery, setSearchQuery] = React.useState('');
    const [selectedLabelFilter, setSelectedLabelFilter] = React.useState(null);
    const [filterWindowOpen, setFilterWindowOpen] = React.useState(false);
    const [filterTemplate24h, setFilterTemplate24h] = React.useState(false);
    const [filterUnread, setFilterUnread] = React.useState(false);
    const [filterHasNote, setFilterHasNote] = React.useState(false);
    const [filterUrgent, setFilterUrgent] = React.useState(false);
    const [filterHasReplied, setFilterHasReplied] = React.useState(false);
    const [filterHasActiveFunnel, setFilterHasActiveFunnel] = React.useState(false);
    const [filterBlockStatus, setFilterBlockStatus] = React.useState(null);
    const [filterStartDate, setFilterStartDate] = React.useState('');
    const [filterEndDate, setFilterEndDate] = React.useState('');
    const [orderBy, setOrderBy] = React.useState('recent');
    const [activeFilterTab, setActiveFilterTab] = React.useState(null);
    const [showRightSidebar, setShowRightSidebar] = React.useState(true);
    const [showTemplateModal, setShowTemplateModal] = React.useState(false);
    const [isMaximizedInputOpen, setIsMaximizedInputOpen] = React.useState(false);
    const [showFunnelModal, setShowFunnelModal] = React.useState(false);
    const [selectAllPages, setSelectAllPages] = React.useState(false);
    const [replyingTo, setReplyingTo] = React.useState(null);
    const [isCancelFunnelModalOpen, setIsCancelFunnelModalOpen] = React.useState(false);
    const [isCancelingFunnel, setIsCancelingFunnel] = React.useState(false);
    const [isSearchMode, setIsSearchMode] = React.useState(false);
    const [highlightedMsgId, setHighlightedMsgId] = React.useState(null);
    const [exportModal, setExportModal] = React.useState({
        isOpen: false,
        status: 'exporting',
        contactName: '',
        phone: '',
        totalMessages: 0,
        fileName: '',
        errorMessage: ''
    });
    const chatInputRef = React.useRef(null);

    const handleExportConversation = async (convo, messages, clientId) => {
        if (!convo) return;
        setExportModal({
            isOpen: true,
            status: 'exporting',
            contactName: convo.contact_name || convo.phone || 'Contato',
            phone: convo.phone || '',
            totalMessages: convo.messages_count || messages?.length || 0,
            fileName: '',
            errorMessage: ''
        });

        try {
            const result = await exportConversationToDoc(convo, messages, clientId);
            setExportModal({
                isOpen: true,
                status: 'completed',
                contactName: convo.contact_name || convo.phone || 'Contato',
                phone: convo.phone || '',
                totalMessages: result?.totalMessages || convo.messages_count || messages?.length || 0,
                fileName: result?.fileName || 'historico_conversa.html',
                errorMessage: ''
            });
            toast.success('Conversa exportada com sucesso!');

        } catch (err) {
            console.error('Erro ao exportar conversa:', err);
            setExportModal(prev => ({
                ...prev,
                isOpen: true,
                status: 'error',
                errorMessage: err?.message || 'Falha ao exportar histórico da conversa.'
            }));
            toast.error('Erro ao exportar conversa.');
        }
    };

    const engine = useChatEngine({
        activeClient, activeTab, statusFilter, searchQuery, selectedLabelFilter,
        filterBlockStatus, filterHasNote, filterStartDate, filterEndDate, filterUnread,
        filterWindowOpen, filterTemplate24h, filterUrgent, filterHasReplied, filterHasActiveFunnel,
        orderBy, selectedConvo, setSelectedConvo
    });

    const mediaUploader = useChatMediaUploader({ engine, selectedConvo, activeClient, replyingTo, setReplyingTo });
    const noteAndAi = useChatNoteAndAi({ engine, selectedConvo, setSelectedConvo, activeClient });
    const chatOps = useChatOperations({
        engine, selectedConvo, setSelectedConvo, activeClient, activeTab, statusFilter, searchQuery,
        selectedLabelFilter, filterBlockStatus, filterHasNote, filterStartDate, filterEndDate,
        filterUnread, filterWindowOpen, filterTemplate24h, filterHasReplied, selectAllPages, setSelectAllPages
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
    }, [activeTab, statusFilter, searchQuery, selectedLabelFilter, filterBlockStatus, filterHasNote, filterStartDate, filterEndDate, filterUnread, filterWindowOpen, filterTemplate24h, filterUrgent, filterHasReplied, filterHasActiveFunnel, orderBy]);

    const getMediaSrc = (msg) => {
        if (!msg || !msg.media_url) return '';
        return resolveMediaUrl(msg.media_url, activeClient?.id);
    };

    const scrollOffsetRef = React.useRef(null);

    React.useLayoutEffect(() => {
        if (scrollOffsetRef.current !== null && engine.messagesContainerRef.current) {
            const container = engine.messagesContainerRef.current;
            container.scrollTop = container.scrollHeight - scrollOffsetRef.current.prevHeight + scrollOffsetRef.current.prevTop;
            scrollOffsetRef.current = null;
        }
    }, [engine.messages]);

    useEffect(() => {
        if (engine.shouldScrollToBottom) {
            const container = engine.messagesContainerRef.current;
            if (container) {
                container.scrollTop = container.scrollHeight;
                engine.setShowScrollTopBtn(container.scrollTop > 80 || engine.hasMoreMessages);
            }
            const timer = setTimeout(() => {
                const c = engine.messagesContainerRef.current;
                if (c) {
                    c.scrollTop = c.scrollHeight;
                    engine.setShowScrollTopBtn(c.scrollTop > 80 || engine.hasMoreMessages);
                }
                engine.messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
            }, 50);
            engine.setShouldScrollToBottom(false);
            return () => clearTimeout(timer);
        }
    }, [engine.shouldScrollToBottom, engine.hasMoreMessages]);

    const handleScrollMessages = useCallback(() => {
        const container = engine.messagesContainerRef.current;
        if (!container) return;
        const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
        engine.setShowScrollBtn(distanceFromBottom > 80);
        engine.setShowScrollTopBtn(container.scrollTop > 80 || engine.hasMoreMessages);

        if (container.scrollTop <= 40 && engine.hasMoreMessages && !engine.isLoadingMoreMessages) {
            scrollOffsetRef.current = { prevHeight: container.scrollHeight, prevTop: container.scrollTop };
            engine.loadMoreMessages();
        }
    }, [engine]);

    useEffect(() => {
        engine.loadConversations(true);
        engine.loadAvailableLabels();
        const convoInterval = setInterval(() => {
            engine.loadConversations(false);
            engine.loadAvailableLabels();
        }, 5000);
        return () => clearInterval(convoInterval);
    }, [activeTab, statusFilter, searchQuery, selectedLabelFilter, filterBlockStatus, filterHasNote, filterStartDate, filterEndDate, activeClient, engine.page, engine.limit, filterUnread, filterWindowOpen, filterTemplate24h, filterUrgent, filterHasReplied, filterHasActiveFunnel, orderBy]);

    useEffect(() => {
        if (!selectedConvo) return;
        engine.setIsLoadingMessages?.(true);
        engine.setMessages([]);
        engine.setShouldScrollToBottom(true);
        engine.loadMessages(selectedConvo.id, true);
        engine.setPrivateNote('');
        setIsSearchMode(false);
        setHighlightedMsgId(null);

        const msgInterval = setInterval(() => {
            engine.loadMessages(selectedConvo.id, false);
        }, 3000);
        return () => clearInterval(msgInterval);
    }, [selectedConvo?.id, activeClient]);

    const handleSelectSearchMessage = useCallback((msgId) => {
        if (!msgId) return;
        const el = document.getElementById(`msg-${msgId}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setHighlightedMsgId(msgId);
            setTimeout(() => setHighlightedMsgId(null), 2500);
        } else {
            toast.loading('Carregando mensagem no histórico...', { duration: 1500 });
        }
    }, []);

    useEffect(() => {
        engine.loadAvailableAgents();
    }, [activeClient]);

    useEffect(() => {
        const handleSelectConvo = (event) => {
            const convo = event.detail;
            if (convo) setSelectedConvo(convo);
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
        const isModalOpen = noteAndAi.isNoteModalMaximized || isMaximizedInputOpen || !!noteAndAi.deleteNoteConfirmMsgId || chatOps.isBulkTagModalOpen || noteAndAi.isAiReportModalOpen || showTemplateModal || showFunnelModal || !!engine?.confirmDeleteConvos || !!engine?.mediaPreview || engine?.isClearChatModalOpen;
        if (isModalOpen) {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = originalOverflow;
            };
        }
    }, [noteAndAi.isNoteModalMaximized, isMaximizedInputOpen, noteAndAi.deleteNoteConfirmMsgId, chatOps.isBulkTagModalOpen, noteAndAi.isAiReportModalOpen, showTemplateModal, showFunnelModal, engine?.confirmDeleteConvos, engine?.mediaPreview, engine?.isClearChatModalOpen]);

    return (
        <>
            <ChatModals
                engine={engine}
                selectedConvo={selectedConvo}
                activeClient={activeClient}
                mediaUploader={mediaUploader}
                noteAndAi={noteAndAi}
                chatOps={chatOps}
                showTemplateModal={showTemplateModal}
                setShowTemplateModal={setShowTemplateModal}
                isMaximizedInputOpen={isMaximizedInputOpen}
                setIsMaximizedInputOpen={setIsMaximizedInputOpen}
                showFunnelModal={showFunnelModal}
                setShowFunnelModal={setShowFunnelModal}
                isCancelFunnelModalOpen={isCancelFunnelModalOpen}
                setIsCancelFunnelModalOpen={setIsCancelFunnelModalOpen}
                isCancelingFunnel={isCancelingFunnel}
                setIsCancelingFunnel={setIsCancelingFunnel}
                selectAllPages={selectAllPages}
                exportModal={exportModal}
                setExportModal={setExportModal}
            />

            <div className="flex flex-col h-full w-full bg-[#0f172a] text-gray-100 overflow-hidden font-sans">
                <ChatHeaderNav
                    activeClient={activeClient}
                    user={user}
                    onClose={onClose}
                    onNavigate={onNavigate}
                />

                <div className="flex flex-1 min-h-0 bg-white dark:bg-[#1e293b] overflow-hidden">
                    <ChatListSidebar
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        statusFilter={statusFilter}
                        setStatusFilter={setStatusFilter}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        selectedLabelFilter={selectedLabelFilter}
                        setSelectedLabelFilter={setSelectedLabelFilter}
                        activeFilterTab={activeFilterTab}
                        setActiveFilterTab={setActiveFilterTab}
                        filterWindowOpen={filterWindowOpen}
                        setFilterWindowOpen={setFilterWindowOpen}
                        filterTemplate24h={filterTemplate24h}
                        setFilterTemplate24h={setFilterTemplate24h}
                        filterUnread={filterUnread}
                        setFilterUnread={setFilterUnread}
                        filterHasNote={filterHasNote}
                        setFilterHasNote={setFilterHasNote}
                        filterUrgent={filterUrgent}
                        setFilterUrgent={setFilterUrgent}
                        filterHasReplied={filterHasReplied}
                        setFilterHasReplied={setFilterHasReplied}
                        filterHasActiveFunnel={filterHasActiveFunnel}
                        setFilterHasActiveFunnel={setFilterHasActiveFunnel}
                        filterBlockStatus={filterBlockStatus}
                        setFilterBlockStatus={setFilterBlockStatus}
                        filterStartDate={filterStartDate}
                        setFilterStartDate={setFilterStartDate}
                        filterEndDate={filterEndDate}
                        setFilterEndDate={setFilterEndDate}
                        orderBy={orderBy}
                        setOrderBy={setOrderBy}
                        engine={engine}
                        selectedConvo={selectedConvo}
                        setSelectedConvo={setSelectedConvo}
                        selectAllPages={selectAllPages}
                        setSelectAllPages={setSelectAllPages}
                        setIsBulkTagModalOpen={chatOps.setIsBulkTagModalOpen}
                        isOpenAiConfigured={noteAndAi.isOpenAiConfigured}
                        isAnalyzingAi={noteAndAi.isAnalyzingAi}
                        handleAnalyzeBulkChatsDoubts={noteAndAi.handleAnalyzeBulkChatsDoubts}
                        formatTime={formatTime}
                    />

                    <div 
                        className="flex-1 flex flex-col h-full bg-white dark:bg-[#0f172a] relative"
                        onDragEnter={mediaUploader.handleDragEnter}
                        onDragOver={mediaUploader.handleDragOver}
                        onDragLeave={mediaUploader.handleDragLeave}
                        onDrop={mediaUploader.handleDrop}
                        onPaste={mediaUploader.handlePaste}
                    >
                        {mediaUploader.isDraggingFile && (
                            <div className="absolute inset-0 z-40 bg-blue-900/80 backdrop-blur-md border-2 border-dashed border-blue-400 rounded-2xl flex flex-col items-center justify-center text-white p-6 shadow-2xl transition-all pointer-events-none">
                                <div className="w-16 h-16 rounded-full bg-blue-500/30 flex items-center justify-center mb-3 animate-bounce">
                                    <FiUploadCloud size={36} className="text-blue-300" />
                                </div>
                                <p className="text-lg font-bold text-white">Solte seu arquivo aqui para enviar</p>
                                <p className="text-xs text-blue-200 mt-1">Imagens, Vídeos, Áudios ou PDFs (Documentos)</p>
                            </div>
                        )}

                        {selectedConvo ? (
                            <>
                                <ActiveChatHeader
                                    selectedConvo={selectedConvo}
                                    setSelectedConvo={setSelectedConvo}
                                    showRightSidebar={showRightSidebar}
                                    setShowRightSidebar={setShowRightSidebar}
                                    engine={engine}
                                    handleTogglePin={chatOps.handleTogglePin}
                                    handleToggleUrgent={chatOps.handleToggleUrgent}
                                    handleUnblockContact={chatOps.handleUnblockContact}
                                    setShowFunnelModal={setShowFunnelModal}
                                    exportConversationToDoc={handleExportConversation}
                                    activeClientId={activeClient?.id}
                                    isOpenAiConfigured={noteAndAi.isOpenAiConfigured}
                                    isAnalyzingAi={noteAndAi.isAnalyzingAi}
                                    handleAnalyzeSingleChatDoubts={noteAndAi.handleAnalyzeSingleChatDoubts}
                                    isSearchMode={isSearchMode}
                                    setIsSearchMode={setIsSearchMode}
                                />

                                <ActiveChatBanner
                                    activeFunnel={selectedConvo.active_funnel}
                                    onOpenPipeline={chatOps.handleOpenActiveFunnelPipeline}
                                    isLoadingPipeline={chatOps.isLoadingPipeline}
                                    onOpenCancelModal={() => setIsCancelFunnelModalOpen(true)}
                                />

                                <ChatMessageList
                                    engine={engine}
                                    selectedConvo={selectedConvo}
                                    handleScrollMessages={handleScrollMessages}
                                    getMediaSrc={getMediaSrc}
                                    formatMessageTimestamp={formatMessageTimestamp}
                                    editingNoteId={noteAndAi.editingNoteId}
                                    setEditingNoteId={noteAndAi.setEditingNoteId}
                                    editingNoteText={noteAndAi.editingNoteText}
                                    setEditingNoteText={noteAndAi.setEditingNoteText}
                                    isSavingNoteMsg={noteAndAi.isSavingNoteMsg}
                                    handleSaveEditedNote={noteAndAi.handleSaveEditedNote}
                                    setIsNoteModalMaximized={noteAndAi.setIsNoteModalMaximized}
                                    setDeleteNoteConfirmMsgId={noteAndAi.setDeleteNoteConfirmMsgId}
                                    setReplyingTo={setReplyingTo}
                                    chatInputRef={chatInputRef}
                                    highlightedMsgId={highlightedMsgId}
                                    handleTogglePinMessage={chatOps.handleTogglePinMessage}
                                    handleToggleStarMessage={chatOps.handleToggleStarMessage}
                                    handleCopyMessageContent={chatOps.handleCopyMessageContent}
                                    handleDeleteMessage={noteAndAi.handleDeleteNoteMsg}
                                />

                                <ActiveChatInput
                                    engine={engine}
                                    selectedConvo={selectedConvo}
                                    activeClientId={activeClient?.id}
                                    replyingTo={replyingTo}
                                    setReplyingTo={setReplyingTo}
                                    chatInputRef={chatInputRef}
                                    handleMediaUpload={mediaUploader.handleMediaUpload}
                                    setShowTemplateModal={setShowTemplateModal}
                                    setIsMaximizedInputOpen={setIsMaximizedInputOpen}
                                    startRecording={mediaUploader.startRecording}
                                    stopRecordingToPreview={mediaUploader.stopRecordingToPreview}
                                    discardRecordedAudio={mediaUploader.discardRecordedAudio}
                                    sendRecordedAudio={mediaUploader.sendRecordedAudio}
                                    cancelRecording={mediaUploader.cancelRecording}
                                    recordedAudio={mediaUploader.recordedAudio}
                                    isSendingAudio={mediaUploader.isSendingAudio}
                                />
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                <FiMessageSquare className="mb-3 animate-pulse" size={48} />
                                <h3 className="font-semibold text-lg">Área de Atendimento</h3>
                                <p className="text-sm">Selecione uma conversa para iniciar.</p>
                            </div>
                        )}
                    </div>

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
                            handleRemoveTag={chatOps.handleRemoveTag}
                            tagSearchQuery={engine.tagSearchQuery}
                            setTagSearchQuery={engine.setTagSearchQuery}
                            isTagDropdownOpen={engine.isTagDropdownOpen}
                            setIsTagDropdownOpen={engine.setIsTagDropdownOpen}
                            handleAddTagWithName={chatOps.handleAddTagWithName}
                            privateNote={engine.privateNote}
                            setPrivateNote={engine.setPrivateNote}
                            isSavingNote={engine.isSavingNote}
                            handleSaveNote={chatOps.handleSaveNote}
                            onOpenClearModal={() => engine.setIsClearChatModalOpen(true)}
                            mediaData={engine.mediaData}
                            isLoadingMedia={engine.isLoadingMedia}
                            isMediaModalOpen={engine.isMediaModalOpen}
                            setIsMediaModalOpen={engine.setIsMediaModalOpen}
                            getFirstName={getFirstName}
                            activeClientId={activeClient?.id}
                            conversations={engine.conversations}
                            openConversationById={engine.openConversationById}
                            isSearchMode={isSearchMode}
                            setIsSearchMode={setIsSearchMode}
                            onSelectMessage={handleSelectSearchMessage}
                            messages={engine.messages}
                            handleToggleStarMessage={chatOps.handleToggleStarMessage}
                            formatMessageTimestamp={formatMessageTimestamp}
                        />
                    )}
                </div>
            </div>
        </>
    );
}
