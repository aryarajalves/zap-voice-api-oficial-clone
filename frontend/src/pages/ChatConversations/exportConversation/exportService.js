/**
 * Serviços de busca de histórico completo e exportação/download do documento HTML.
 */

import { enrichMessagesWithPipeline } from '../exportPipelineHelper.js';
import { fetchQaAnalysis, extractLocalHeuristicQa } from '../exportQuestionsHelper.js';
import { generateConversationDocHtml } from './exportMessageRenderer.js';

/**
 * Busca todas as mensagens de uma conversa no backend (sem paginação/limite reduzido)
 * para garantir que o documento exportado contenha 100% do histórico completo de atendimento.
 */
export async function fetchAllConversationMessages(convoId, clientId = '') {
    if (!convoId) return [];
    try {
        const { fetchWithAuth } = await import('../../../AuthContext');
        const { API_URL } = await import('../../../config');
        const headers = clientId ? { 'X-Client-ID': String(clientId) } : {};
        // limit=0 busca todas as mensagens da conversa sem limite no backend
        const res = await fetchWithAuth(`${API_URL}/chat/conversations/${convoId}/messages?limit=0`, {
            headers
        });
        if (res && res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                return data;
            }
        }
    } catch (e) {
        console.warn('⚠️ [EXPORT] Não foi possível carregar mensagens completas da API, usando mensagens em memória:', e);
    }
    return [];
}

/**
 * Exporta o histórico como arquivo HTML navegável com suporte a abas por data, filtros, auditoria semântica Q&A e impressão para PDF.
 */
export async function exportConversationToHtml(convo, messages = [], clientId = '') {
    let finalMessages = messages;

    // Se a conversa possuir ID, busca todo o histórico completo no backend para não limitar às 50 em tela
    if (convo?.id) {
        try {
            const allMessages = await fetchAllConversationMessages(convo.id, clientId);
            if (allMessages && allMessages.length > 0) {
                finalMessages = allMessages;
            }
        } catch (e) {
            console.warn('Erro ao carregar mensagens completas para exportação:', e);
        }
    }

    try {
        finalMessages = await enrichMessagesWithPipeline(convo?.phone, finalMessages);
    } catch (e) {
        finalMessages = finalMessages || messages;
    }

    let qaData = null;
    try {
        qaData = await fetchQaAnalysis(convo, clientId, finalMessages);
    } catch (e) {
        qaData = extractLocalHeuristicQa(finalMessages);
    }

    const htmlContent = generateConversationDocHtml(convo, finalMessages, clientId, qaData);
    const blob = new Blob([htmlContent], {
        type: 'text/html;charset=utf-8'
    });

    const contactName = (convo?.contact_name || convo?.phone || 'conversa')
        .toLowerCase()
        .replace(/[^a-z0-9]/gi, '_');

    const fileName = `historico_conversa_${contactName}_#${convo?.id || 'chat'}.html`;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    return {
        success: true,
        fileName,
        totalMessages: finalMessages.length,
        contactName: convo?.contact_name || convo?.phone
    };
}

/**
 * Manter exportConversationToDoc por compatibilidade
 */
export async function exportConversationToDoc(convo, messages = [], clientId = '') {
    return await exportConversationToHtml(convo, messages, clientId);
}
