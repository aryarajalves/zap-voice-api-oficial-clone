/**
 * Utilitário para exportar o histórico de conversa entre o Usuário (Cliente) e o Agente (Atendente)
 * nos formatos de Arquivo HTML / PDF (.html) e Documento, com:
 * - Agrupamento de respostas consecutivas em blocos unificados por remetente
 * - Separação de conversas por datas em abas (Tabs) e separadores de dia
 * - Filtro para ocultar/exibir anotações privadas do sistema
 * - Visualizador interativo de Pipeline e Raciocínio (Pensamento) da IA
 * - Pré-configurado para Salvar em PDF e Impressão de alta fidelidade
 */

import { buildDocHtml } from './exportHtmlTemplate.js';
import {
    resolveMediaUrl,
    isImageMedia,
    parseAgentPipeline,
    enrichMessagesWithPipeline
} from './exportPipelineHelper.js';
import {
    fetchQaAnalysis,
    extractLocalHeuristicQa
} from './exportQuestionsHelper.js';

export { parseAgentPipeline, enrichMessagesWithPipeline, fetchQaAnalysis, extractLocalHeuristicQa };

const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

/**
 * Converte qualquer timestamp em objeto de data e strings formatadas.
 */
export function parseMessageDate(ts) {
    if (!ts) {
        return {
            dateObj: null,
            dateKey: 'Sem Data',
            dateLabel: 'Sem Data',
            timeStr: '',
            fullFormatted: ''
        };
    }

    let d = null;
    if (typeof ts === 'number') {
        d = new Date(ts > 1e11 ? ts : ts * 1000);
    } else if (typeof ts === 'string') {
        const trimmed = ts.trim();
        if (!isNaN(trimmed)) {
            const num = Number(trimmed);
            d = new Date(num > 1e11 ? num : num * 1000);
        } else {
            d = new Date(trimmed);
        }
    }

    if (!d || isNaN(d.getTime())) {
        return {
            dateObj: null,
            dateKey: 'Sem Data',
            dateLabel: 'Sem Data',
            timeStr: '',
            fullFormatted: String(ts || '')
        };
    }

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const dateKey = `${day}/${month}/${year}`;
    const dateLabel = `${day} de ${MONTH_NAMES[d.getMonth()]} de ${year}`;
    const timeStr = d.toLocaleTimeString('pt-BR');
    const fullFormatted = d.toLocaleString('pt-BR');

    return { dateObj: d, dateKey, dateLabel, timeStr, fullFormatted };
}

export function formatTimestamp(ts) {
    return parseMessageDate(ts).fullFormatted;
}

export function getSenderCategory(msg) {
    if (!msg) return 'contact';
    if (msg.sender_type === 'contact') return 'contact';
    if (msg.sender_type === 'user' || msg.sender_type === 'agent') return 'user';
    if (msg.sender_type === 'system') return 'system';
    return 'other';
}

function renderMessageItem(msg, index, isMultiple, clientId) {
    const isSystem = msg.sender_type === 'system';
    const isUserAgent = msg.sender_type === 'user' || msg.sender_type === 'agent';
    const dateInfo = parseMessageDate(msg.timestamp);

    let contentText = msg.content || '';
    if (isSystem && contentText.startsWith('🔒 Anotação Privada: ')) {
        contentText = contentText.replace('🔒 Anotação Privada: ', '');
    }

    let mediaHtml = '';
    if (msg.media_url) {
        const mediaUrl = resolveMediaUrl(msg, clientId);
        const mType = msg.message_type || 'mídia';

        if (isImageMedia(msg)) {
            mediaHtml = `
                <div class="media-container">
                    <img src="${mediaUrl}" alt="Imagem da conversa" />
                    <a href="${mediaUrl}" target="_blank" style="font-size: 11px; color: #2563eb; text-decoration: underline;">🔗 Abrir imagem em alta resolução</a>
                </div>
            `;
        } else if (mType === 'video') {
            mediaHtml = `
                <div class="media-container">
                    <video src="${mediaUrl}" controls></video>
                    <a href="${mediaUrl}" target="_blank" style="font-size: 11px; color: #2563eb; text-decoration: underline;">🎬 Abrir vídeo original</a>
                </div>
            `;
        } else if (mType === 'audio') {
            mediaHtml = `
                <div class="media-container">
                    <audio src="${mediaUrl}" controls></audio>
                    <a href="${mediaUrl}" target="_blank" style="font-size: 11px; color: #2563eb; text-decoration: underline;">🎵 Ouvir áudio original</a>
                </div>
            `;
        } else {
            mediaHtml = `
                <div class="media-container">
                    📎 <b>Documento/Arquivo (${escapeHtml(mType)}):</b> 
                    <a href="${mediaUrl}" target="_blank" style="font-size: 12px; color: #2563eb; text-decoration: underline; font-weight: bold;">Baixar ${escapeHtml(mType)}</a>
                </div>
            `;
        }
    }

    // Pipeline da IA & Pensamento do Agente
    let thoughtHtml = '';
    if (isUserAgent) {
        const pipelineData = parseAgentPipeline(msg);
        if (pipelineData.hasPipeline) {
            const thoughtId = `thought-msg-${index}`;
            const stepsCount = pipelineData.steps.length;

            const stepsHtml = pipelineData.steps.map((s, sIdx) => {
                const stepName = s.step || `Etapa ${sIdx + 1}`;
                const stepDetail = s.detail || '';
                const stepTime = s.timestamp ? formatTimestamp(s.timestamp) : '';

                return `
                    <div class="pipeline-step">
                        <div class="step-head">
                            <span class="step-title">${escapeHtml(stepName)}</span>
                            ${stepTime ? `<span class="step-time">${escapeHtml(stepTime)}</span>` : ''}
                        </div>
                        ${stepDetail ? `<div class="step-detail">${escapeHtml(stepDetail)}</div>` : ''}
                    </div>
                `;
            }).join('');

            thoughtHtml = `
                <div class="agent-thought-wrapper">
                    <button type="button" class="btn-toggle-thought" onclick="toggleThought('${thoughtId}')">
                        <span class="btn-icon">🧠</span>
                        <span class="thought-btn-label">Ver Pensamento do Agente (${stepsCount > 0 ? `${stepsCount} etapas de pipeline` : 'Raciocínio IA'})</span>
                        <span class="thought-chevron">▼</span>
                    </button>
                    <div id="${thoughtId}" class="thought-container" style="display: none;">
                        ${pipelineData.thought ? `
                            <div class="thought-box">
                                <div class="thought-header">💡 Raciocínio & Intenção da IA:</div>
                                <div class="thought-body">${escapeHtml(pipelineData.thought)}</div>
                            </div>
                        ` : ''}
                        ${stepsCount > 0 ? `
                            <div class="pipeline-box">
                                <div class="pipeline-header">🧭 Linha do Tempo do Pipeline (${stepsCount} etapas executadas):</div>
                                <div class="pipeline-list">
                                    ${stepsHtml}
                                </div>
                            </div>
                        ` : ''}
                        ${pipelineData.eventId ? `
                            <div class="pipeline-footer-id">⚡ Evento ID: #${escapeHtml(String(pipelineData.eventId))}</div>
                        ` : ''}
                    </div>
                </div>
            `;
        }
    }

    return `
        <div class="msg-item">
            ${contentText ? `<div class="content">${escapeHtml(contentText)}</div>` : ''}
            ${mediaHtml}
            ${thoughtHtml}
        </div>
    `;
}

/**
 * Renderiza um bloco unificado de mensagens consecutivas de um mesmo remetente.
 */
function renderConsecutiveBlock(block, blockIndex, dateKey, clientId) {
    const isContact = block.category === 'contact';
    const isUserAgent = block.category === 'user';
    const isSystem = block.category === 'system';

    let senderLabel = '👤 Usuário (Cliente)';
    let senderClass = 'sender-contact';
    let cardClass = 'contact-msg';

    if (isUserAgent) {
        senderLabel = '🤖 Agente / Atendente';
        senderClass = 'sender-user';
        cardClass = 'user-msg';
    } else if (isSystem) {
        senderLabel = '🔒 Sistema / Anotação';
        senderClass = 'sender-system';
        cardClass = 'system-msg';
    }

    const isMultiple = block.messages.length > 1;
    let formattedFooterTime = '';

    if (!isMultiple) {
        const dateInfo = parseMessageDate(block.messages[0].timestamp);
        formattedFooterTime = dateInfo.fullFormatted || dateInfo.timeStr || '';
    } else {
        const firstInfo = parseMessageDate(block.messages[0].timestamp);
        const lastInfo = parseMessageDate(block.messages[block.messages.length - 1].timestamp);
        if (firstInfo.dateKey && lastInfo.dateKey && firstInfo.dateKey === lastInfo.dateKey) {
            formattedFooterTime = `${firstInfo.dateKey}, ${firstInfo.timeStr} - ${lastInfo.timeStr}`;
        } else {
            formattedFooterTime = `${firstInfo.fullFormatted} - ${lastInfo.fullFormatted}`;
        }
    }

    const itemsHtml = block.messages.map((m, mIdx) => {
        const globalIdx = `${blockIndex}-${mIdx}`;
        return renderMessageItem(m, globalIdx, isMultiple, clientId);
    }).join('\n');

    return `
        <div class="message-card ${cardClass}" data-is-private="${isSystem ? 'true' : 'false'}" data-date="${escapeHtml(dateKey)}">
            <div class="sender-title ${senderClass}">
                <span>${senderLabel}</span>
            </div>
            <div class="message-items-list">
                ${itemsHtml}
            </div>
            ${formattedFooterTime ? `
                <div class="message-card-footer">
                    <span class="timestamp">${escapeHtml(formattedFooterTime)}</span>
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Agrupa mensagens por data e une mensagens consecutivas em blocos unificados por remetente.
 */
export function groupMessagesByDate(messages = [], clientId = '') {
    const groupsMap = new Map();
    let totalPrivateNotes = 0;

    messages.forEach((msg) => {
        if (msg.sender_type === 'system') {
            totalPrivateNotes++;
        }

        const dateInfo = parseMessageDate(msg.timestamp);
        const key = dateInfo.dateKey;

        if (!groupsMap.has(key)) {
            groupsMap.set(key, {
                dateKey: key,
                dateLabel: dateInfo.dateLabel,
                dateObj: dateInfo.dateObj,
                messages: []
            });
        }

        groupsMap.get(key).messages.push(msg);
    });

    const dateGroups = Array.from(groupsMap.values()).map((group, groupIdx) => {
        // Agrupa mensagens consecutivas do mesmo remetente dentro da data
        const consecutiveBlocks = [];
        let currentBlock = null;

        group.messages.forEach(msg => {
            const category = getSenderCategory(msg);
            if (!currentBlock || currentBlock.category !== category) {
                currentBlock = {
                    category,
                    messages: [msg]
                };
                consecutiveBlocks.push(currentBlock);
            } else {
                currentBlock.messages.push(msg);
            }
        });

        const messagesHtml = consecutiveBlocks.map((block, bIdx) => {
            const blockIndex = `${groupIdx}-${bIdx}`;
            return renderConsecutiveBlock(block, blockIndex, group.dateKey, clientId);
        });

        return {
            dateKey: group.dateKey,
            dateLabel: group.dateLabel,
            dateObj: group.dateObj,
            messages: group.messages,
            consecutiveBlocks,
            messagesHtml
        };
    });

    const uniqueDates = dateGroups.map(g => ({
        key: g.dateKey,
        label: g.dateLabel,
        count: g.messages.length
    }));

    return {
        dateGroups,
        uniqueDates,
        totalMessages: messages.length,
        totalPrivateNotes
    };
}

/**
 * Gera o documento HTML estruturado com blocos unificados, abas por data, filtros e painel de Q&A (GPT-5.2).
 */
export function generateConversationDocHtml(convo, messages = [], clientId = '', qaData = null) {
    const contactName = convo?.contact_name || convo?.phone || 'Contato';
    const phone = convo?.phone || 'N/A';
    const convoId = convo?.id || 'N/A';
    const exportDate = new Date().toLocaleString('pt-BR');

    const groupedData = groupMessagesByDate(messages, clientId);
    const resolvedQaData = qaData || extractLocalHeuristicQa(messages);

    return buildDocHtml({
        contactName,
        phone,
        convoId,
        exportDate,
        totalMessages: groupedData.totalMessages,
        totalPrivateNotes: groupedData.totalPrivateNotes,
        dateGroups: groupedData.dateGroups,
        uniqueDates: groupedData.uniqueDates,
        qaData: resolvedQaData
    });
}

/**
 * Busca todas as mensagens de uma conversa no backend (sem paginação/limite reduzido)
 * para garantir que o documento exportado contenha 100% do histórico completo de atendimento.
 */
export async function fetchAllConversationMessages(convoId, clientId = '') {
    if (!convoId) return [];
    try {
        const { fetchWithAuth } = await import('../../AuthContext');
        const { API_URL } = await import('../../config');
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
 * Exporta o histórico como arquivo HTML navegável com suporte a abas por data, filtros, auditoria semântica Q&A (GPT-5.2) e impressão para PDF.
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


function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
