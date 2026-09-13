import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { exportConversationToDoc } from '../exportConversationToDoc';

export function useChatModalState() {
    const [showRightSidebar, setShowRightSidebar] = useState(true);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [isMaximizedInputOpen, setIsMaximizedInputOpen] = useState(false);
    const [showFunnelModal, setShowFunnelModal] = useState(false);
    const [replyingTo, setReplyingTo] = useState(null);
    const [isCancelFunnelModalOpen, setIsCancelFunnelModalOpen] = useState(false);
    const [isCancelingFunnel, setIsCancelingFunnel] = useState(false);
    const [isSearchMode, setIsSearchMode] = useState(false);
    const [highlightedMsgId, setHighlightedMsgId] = useState(null);
    const [exportModal, setExportModal] = useState({
        isOpen: false,
        status: 'exporting',
        contactName: '',
        phone: '',
        totalMessages: 0,
        fileName: '',
        errorMessage: ''
    });

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

    return {
        showRightSidebar, setShowRightSidebar,
        showTemplateModal, setShowTemplateModal,
        isMaximizedInputOpen, setIsMaximizedInputOpen,
        showFunnelModal, setShowFunnelModal,
        replyingTo, setReplyingTo,
        isCancelFunnelModalOpen, setIsCancelFunnelModalOpen,
        isCancelingFunnel, setIsCancelingFunnel,
        isSearchMode, setIsSearchMode,
        highlightedMsgId, setHighlightedMsgId,
        exportModal, setExportModal,
        handleExportConversation
    };
}
