/**
 * Renderizador de mensagens, mídias, raciocínio da IA e blocos consecutivos de conversa.
 */

import { buildDocHtml } from '../exportHtmlTemplate.js';
import {
    resolveMediaUrl,
    isImageMedia,
    parseAgentPipeline
} from '../exportPipelineHelper.js';
import { extractLocalHeuristicQa } from '../exportQuestionsHelper.js';
import {
    parseMessageDate,
    formatTimestamp,
    getSenderCategory,
    escapeHtml
} from './exportDateUtils.js';

export function renderMessageItem(msg, index, isMultiple, clientId) {
    const isSystem = msg.sender_type === 'system';
    const isUserAgent = msg.sender_type === 'user' || msg.sender_type === 'agent';

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
export function renderConsecutiveBlock(block, blockIndex, dateKey, clientId) {
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
 * Gera o documento HTML estruturado com blocos unificados, abas por data, filtros e painel de Q&A.
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
