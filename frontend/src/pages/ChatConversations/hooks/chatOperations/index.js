/**
 * Ponto de entrada (Barrel) para as operações de chat.
 * Agrega submódulos especializados de operações mantendo 100% de compatibilidade retroativa.
 */

import { useChatPipelineOperations } from './useChatPipelineOperations';
import { useChatTagsOperations } from './useChatTagsOperations';
import { useChatConvoStatusOperations } from './useChatConvoStatusOperations';
import { useChatMessageActionsOperations } from './useChatMessageActionsOperations';
import { useChatDeletionOperations } from './useChatDeletionOperations';
import { useChatBulkTagOperations } from './useChatBulkTagOperations';

export {
    useChatPipelineOperations,
    useChatTagsOperations,
    useChatConvoStatusOperations,
    useChatMessageActionsOperations,
    useChatDeletionOperations,
    useChatBulkTagOperations
};

export function useChatOperations({
    engine,
    selectedConvo,
    setSelectedConvo,
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
    filterHasReplied,
    selectAllPages,
    setSelectAllPages
}) {
    const pipelineOps = useChatPipelineOperations({
        selectedConvo,
        activeClient
    });

    const tagsOps = useChatTagsOperations({
        selectedConvo,
        setSelectedConvo,
        activeClient,
        engine
    });

    const convoStatusOps = useChatConvoStatusOperations({
        selectedConvo,
        setSelectedConvo,
        activeClient,
        engine
    });

    const messageActionsOps = useChatMessageActionsOperations({
        selectedConvo,
        setSelectedConvo,
        activeClient,
        engine
    });

    const deletionOps = useChatDeletionOperations({
        selectedConvo,
        setSelectedConvo,
        activeClient,
        engine,
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
        filterHasReplied,
        selectAllPages,
        setSelectAllPages
    });

    const bulkTagOps = useChatBulkTagOperations({
        engine,
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
        filterHasReplied,
        selectAllPages,
        setSelectAllPages
    });

    return {
        // Pipeline
        pipelineTrigger: pipelineOps.pipelineTrigger,
        setPipelineTrigger: pipelineOps.setPipelineTrigger,
        isLoadingPipeline: pipelineOps.isLoadingPipeline,
        handleOpenActiveFunnelPipeline: pipelineOps.handleOpenActiveFunnelPipeline,

        // Tags individuais
        handleAddTagWithName: tagsOps.handleAddTagWithName,
        handleRemoveTag: tagsOps.handleRemoveTag,

        // Status de conversa (pin, urgente, nota, bloco)
        handleTogglePin: convoStatusOps.handleTogglePin,
        handleToggleUrgent: convoStatusOps.handleToggleUrgent,
        handleSaveNote: convoStatusOps.handleSaveNote,
        handleConfirmBlockContact: convoStatusOps.handleConfirmBlockContact,
        handleUnblockContact: convoStatusOps.handleUnblockContact,

        // Ações de mensagem (pin mensagem, favoritar, copiar, reenvio)
        handleTogglePinMessage: messageActionsOps.handleTogglePinMessage,
        handleToggleStarMessage: messageActionsOps.handleToggleStarMessage,
        handleCopyMessageContent: messageActionsOps.handleCopyMessageContent,
        handleResendToAgentFlow: messageActionsOps.handleResendToAgentFlow,

        // Exclusão e limpeza
        handleClearConversationMessages: deletionOps.handleClearConversationMessages,
        handleDeleteConversation: deletionOps.handleDeleteConversation,
        handleDeleteSelectedConversations: deletionOps.handleDeleteSelectedConversations,

        // Operações em massa de tags
        isBulkTagModalOpen: bulkTagOps.isBulkTagModalOpen,
        setIsBulkTagModalOpen: bulkTagOps.setIsBulkTagModalOpen,
        selectedBulkTag: bulkTagOps.selectedBulkTag,
        setSelectedBulkTag: bulkTagOps.setSelectedBulkTag,
        customBulkTag: bulkTagOps.customBulkTag,
        setCustomBulkTag: bulkTagOps.setCustomBulkTag,
        isApplyingBulkTag: bulkTagOps.isApplyingBulkTag,
        handleBulkTagConversations: bulkTagOps.handleBulkTagConversations,
        getBulkPayloadExtra: bulkTagOps.getBulkPayloadExtra
    };
}

export default useChatOperations;
