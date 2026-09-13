/**
 * Ponto de entrada compatível para useChatOperations.
 * Reexporta as funções modularizadas de ./chatOperations/index.js
 */

export {
    useChatOperations,
    useChatPipelineOperations,
    useChatTagsOperations,
    useChatConvoStatusOperations,
    useChatMessageActionsOperations,
    useChatDeletionOperations,
    useChatBulkTagOperations,
    default
} from './chatOperations/index.js';
