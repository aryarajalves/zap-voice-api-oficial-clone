import React, { useEffect } from 'react';

export function useChatEffects({
    engine,
    selectedConvo,
    setSelectedConvo,
    chatInputRef,
    setSelectAllPages,
    selectAllPages,
    excludedConvoIds,
    setExcludedConvoIds,
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
    filterLastMessageRead,
    filterLastMessageUnread,
    orderBy,
    activeClient,
    setIsSearchMode,
    setHighlightedMsgId,
    noteAndAi,
    chatOps,
    isMaximizedInputOpen,
    showTemplateModal,
    showFunnelModal
}) {
    // Redimensiona input quando vazio
    useEffect(() => {
        if (!engine?.newMessage && chatInputRef.current) {
            chatInputRef.current.style.height = 'auto';
        }
    }, [engine?.newMessage]);

    // Reseta exclusões se não estiver em selectAllPages e lista esvaziar
    useEffect(() => {
        if (!selectAllPages && engine.selectedConvoIds.length === 0) {
            if (setExcludedConvoIds) setExcludedConvoIds([]);
        }
    }, [engine.selectedConvoIds, selectAllPages]);

    // Reseta selectAllPages e excludedConvoIds ao alterar qualquer filtro
    useEffect(() => {
        setSelectAllPages(false);
        if (setExcludedConvoIds) setExcludedConvoIds([]);
    }, [activeTab, statusFilter, searchQuery, selectedLabelFilter, filterBlockStatus, filterHasNote, filterStartDate, filterEndDate, filterUnread, filterWindowOpen, filterTemplate24h, filterUrgent, filterHasReplied, filterHasActiveFunnel, filterLastMessageRead, filterLastMessageUnread, orderBy]);

    // Polling de conversas e labels
    useEffect(() => {
        engine.loadConversations(true);
        engine.loadAvailableLabels();
        const convoInterval = setInterval(() => {
            engine.loadConversations(false);
            engine.loadAvailableLabels();
        }, 5000);
        return () => clearInterval(convoInterval);
    }, [activeTab, statusFilter, searchQuery, selectedLabelFilter, filterBlockStatus, filterHasNote, filterStartDate, filterEndDate, activeClient, engine.page, engine.limit, filterUnread, filterWindowOpen, filterTemplate24h, filterUrgent, filterHasReplied, filterHasActiveFunnel, filterLastMessageRead, filterLastMessageUnread, orderBy]);

    // Carregamento de mensagens da conversa selecionada e polling
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

    // Carrega atendentes disponíveis
    useEffect(() => {
        engine.loadAvailableAgents();
    }, [activeClient]);

    // Event listener global para seleção externa de conversa
    useEffect(() => {
        const handleSelectConvo = (event) => {
            const convo = event.detail;
            if (!convo) return;
            if (convo.id && engine.openConversationById) {
                engine.openConversationById(convo.id);
            } else if (convo.phone && engine.openConversationByPhone) {
                engine.openConversationByPhone(convo.phone, convo.contact_name || convo.name || '');
            } else {
                setSelectedConvo(convo);
            }
        };
        window.addEventListener('select-chat-convo', handleSelectConvo);
        return () => window.removeEventListener('select-chat-convo', handleSelectConvo);
    }, [engine.openConversationById, engine.openConversationByPhone]);

    // Timer da Janela de 24 horas
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

    // Bloqueia scroll do body se algum modal estiver aberto
    useEffect(() => {
        const isModalOpen = noteAndAi.isNoteModalMaximized || isMaximizedInputOpen || !!noteAndAi.deleteNoteConfirmMsgId || chatOps.isBulkTagModalOpen || noteAndAi.isAiReportModalOpen || showTemplateModal || showFunnelModal || !!engine?.confirmDeleteConvos || !!engine?.mediaPreview || engine?.isClearChatModalOpen;
        if (isModalOpen) {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = originalOverflow;
            };
        }
    }, [noteAndAi.isNoteModalMaximized, isMaximizedInputOpen, noteAndAi.deleteNoteConfirmMsgId, chatOps.isBulkTagModalOpen, noteAndAi.isAiReportModalOpen, showTemplateModal, showFunnelModal, engine?.confirmDeleteConvos, engine?.mediaPreview, engine?.isClearChatModalOpen]);
}
