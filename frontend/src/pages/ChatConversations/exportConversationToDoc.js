/**
 * Ponto de entrada (Barrel) para exportação de histórico de conversas nos formatos HTML/PDF.
 * Orquestra utilitários de data, renderizadores de blocos e serviços de download com 100% de compatibilidade.
 */

export {
    MONTH_NAMES,
    parseMessageDate,
    formatTimestamp,
    getSenderCategory,
    escapeHtml
} from './exportConversation/exportDateUtils.js';

export {
    renderMessageItem,
    renderConsecutiveBlock,
    groupMessagesByDate,
    generateConversationDocHtml
} from './exportConversation/exportMessageRenderer.js';

export {
    fetchAllConversationMessages,
    exportConversationToHtml,
    exportConversationToDoc
} from './exportConversation/exportService.js';

export {
    parseAgentPipeline,
    enrichMessagesWithPipeline
} from './exportPipelineHelper.js';

export {
    fetchQaAnalysis,
    extractLocalHeuristicQa
} from './exportQuestionsHelper.js';
