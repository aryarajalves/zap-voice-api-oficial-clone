import { API_URL } from '../../config.js';

/**
 * Escapa strings para HTML seguro.
 */
export function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Fallback local heurístico caso a chamada à API ou IA falhe.
 */
export function extractLocalHeuristicQa(messages = []) {
    const qaItems = [];
    let qIndex = 1;

    const questionTriggers = [
        'quanto', 'qual', 'como', 'onde', 'quando', 'quem', 'por que', 
        'porque', 'tem', 'posso', 'aceita', 'valor', 'preço', 'preco', 'link', 
        'desconto', 'funciona', 'horário', 'horario', 'endereço', 'endereco'
    ];

    for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        if (msg.sender_type === 'contact' && msg.content) {
            const textLower = msg.content.trim().toLowerCase();
            const isQuestion = textLower.includes('?') || questionTriggers.some(w => {
                const regex = new RegExp(`\\b${w}\\b`, 'i');
                return regex.test(textLower);
            });

            if (isQuestion) {
                let ansText = null;
                let ansTime = '';

                for (let j = i + 1; j < messages.length; j++) {
                    const nextMsg = messages[j];
                    if ((nextMsg.sender_type === 'user' || nextMsg.sender_type === 'agent') && nextMsg.content) {
                        ansText = nextMsg.content.trim();
                        ansTime = nextMsg.timestamp ? new Date(nextMsg.timestamp).toLocaleTimeString('pt-BR') : '';
                        break;
                    } else if (nextMsg.sender_type === 'contact') {
                        break;
                    }
                }

                const qTime = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('pt-BR') : '';

                if (ansText) {
                    qaItems.push({
                        question_id: `q-${qIndex}`,
                        question_text: msg.content.trim(),
                        question_time: qTime,
                        answer_text: ansText,
                        answer_time: ansTime,
                        status: 'answered',
                        status_label: 'Respondida com Clareza',
                        ai_analysis: 'Resposta registrada pelo agente na sequência do diálogo.'
                    });
                } else {
                    qaItems.push({
                        question_id: `q-${qIndex}`,
                        question_text: msg.content.trim(),
                        question_time: qTime,
                        answer_text: null,
                        answer_time: '',
                        status: 'unanswered',
                        status_label: 'Sem Resposta',
                        ai_analysis: 'Nenhuma resposta do agente foi localizada para esta dúvida.'
                    });
                }
                qIndex++;
            }
        }
    }

    const ansCount = qaItems.filter(it => it.status === 'answered').length;
    const unansCount = qaItems.filter(it => it.status === 'unanswered').length;

    return {
        status: 'ok',
        total_questions: qaItems.length,
        answered_count: ansCount,
        incomplete_count: 0,
        unanswered_count: unansCount,
        model_used: 'heuristic',
        is_ai_evaluated: false,
        qa_items: qaItems
    };
}

/**
 * Busca análise semântica da IA no backend com fallback automático.
 */
export async function fetchQaAnalysis(convo, clientId = '', messages = []) {
    if (!convo || !convo.id) {
        return extractLocalHeuristicQa(messages);
    }

    try {
        const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (clientId) headers['X-Client-Id'] = String(clientId);

        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timer = controller ? setTimeout(() => controller.abort(), 3500) : null;

        const res = await fetch(
            `${API_URL}/chat/conversations/${convo.id}/export-qa-analysis`,
            { 
                method: 'POST', 
                headers,
                signal: controller?.signal
            }
        );
        if (timer) clearTimeout(timer);

        if (res.ok) {
            const data = await res.json();
            if (data && Array.isArray(data.qa_items)) {
                return data;
            }
        }
        return extractLocalHeuristicQa(messages);
    } catch (e) {
        console.warn('Fallback para extração local de Q&A:', e);
        return extractLocalHeuristicQa(messages);
    }
}

/**
 * Renderiza o painel completo de Perguntas & Respostas em HTML.
 */
export function renderQaPanelHtml(qaData = {}) {
    const items = qaData.qa_items || [];
    const total = qaData.total_questions || items.length;
    const answered = qaData.answered_count || items.filter(it => it.status === 'answered').length;
    const incomplete = qaData.incomplete_count || items.filter(it => it.status === 'incomplete').length;
    const unanswered = qaData.unanswered_count || items.filter(it => it.status === 'unanswered').length;
    const isAi = qaData.is_ai_evaluated;
    const modelUsed = qaData.model_used || 'GPT-5.2';

    const filterBarHtml = `
        <div class="qa-header-card">
            <div class="qa-metrics-summary">
                <div class="qa-metric-item">
                    <span class="qa-metric-val">${total}</span>
                    <span class="qa-metric-lbl">Total de Dúvidas</span>
                </div>
                <div class="qa-metric-item text-green">
                    <span class="qa-metric-val">${answered}</span>
                    <span class="qa-metric-lbl">✅ Respondidas</span>
                </div>
                ${incomplete > 0 ? `
                    <div class="qa-metric-item text-amber">
                        <span class="qa-metric-val">${incomplete}</span>
                        <span class="qa-metric-lbl">⚠️ Incompletas</span>
                    </div>
                ` : ''}
                <div class="qa-metric-item text-red">
                    <span class="qa-metric-val">${unanswered}</span>
                    <span class="qa-metric-lbl">❌ Sem Resposta</span>
                </div>
                <div class="qa-model-badge" title="Auditoria semântica via inteligência artificial">
                    🤖 Modelo: <strong>${escapeHtml(modelUsed.toUpperCase())}</strong>
                    ${isAi ? ' (Auditoria Semântica Ativa)' : ' (Classificação Heurística)'}
                </div>
            </div>

            <div class="qa-filters-bar">
                <span class="qa-filters-title">Filtrar Dúvidas:</span>
                <button type="button" class="qa-filter-btn active" data-status="all" onclick="filterQaStatus('all')">
                    Todas (${total})
                </button>
                <button type="button" class="qa-filter-btn" data-status="answered" onclick="filterQaStatus('answered')">
                    ✅ Respondidas (${answered})
                </button>
                ${incomplete > 0 ? `
                    <button type="button" class="qa-filter-btn" data-status="incomplete" onclick="filterQaStatus('incomplete')">
                        ⚠️ Incompletas (${incomplete})
                    </button>
                ` : ''}
                <button type="button" class="qa-filter-btn" data-status="unanswered" onclick="filterQaStatus('unanswered')">
                    ❌ Sem Resposta (${unanswered})
                </button>
            </div>
        </div>
    `;

    if (items.length === 0) {
        return `
            <div class="qa-panel-wrapper" id="qa-panel-wrapper" style="display: none;">
                ${filterBarHtml}
                <div class="qa-empty-state">
                    <p>Nenhuma pergunta ou dúvida do cliente foi identificada nesta conversa.</p>
                </div>
            </div>
        `;
    }

    const itemsHtml = items.map((item, idx) => {
        const status = item.status || 'answered';
        let statusBadgeClass = 'badge-answered';
        let statusLabel = item.status_label || 'Respondida com Clareza';

        if (status === 'incomplete') {
            statusBadgeClass = 'badge-incomplete';
            statusLabel = item.status_label || 'Resposta Evasiva/Incompleta';
        } else if (status === 'unanswered') {
            statusBadgeClass = 'badge-unanswered';
            statusLabel = item.status_label || 'Sem Resposta';
        }

        return `
            <div class="qa-card status-${escapeHtml(status)}" data-qa-status="${escapeHtml(status)}">
                <div class="qa-card-header">
                    <div class="qa-q-title">
                        <span class="qa-icon">❓</span>
                        <strong>Dúvida #${idx + 1}</strong>
                        ${item.question_time ? `<span class="qa-time">${escapeHtml(item.question_time)}</span>` : ''}
                    </div>
                    <span class="qa-status-badge ${statusBadgeClass}">${escapeHtml(statusLabel)}</span>
                </div>

                <div class="qa-question-box">
                    <div class="qa-box-label">👤 Pergunta do Cliente:</div>
                    <div class="qa-box-content">${escapeHtml(item.question_text)}</div>
                </div>

                ${item.answer_text ? `
                    <div class="qa-answer-box">
                        <div class="qa-box-label">
                            <span>🤖 Resposta do Agente/Robô:</span>
                            ${item.answer_time ? `<span class="qa-time">${escapeHtml(item.answer_time)}</span>` : ''}
                        </div>
                        <div class="qa-box-content">${escapeHtml(item.answer_text)}</div>
                    </div>
                ` : `
                    <div class="qa-answer-box empty-answer">
                        <div class="qa-box-label">🤖 Resposta do Agente/Robô:</div>
                        <div class="qa-box-content text-muted">⚠️ Nenhuma resposta foi enviada pelo agente para esta dúvida.</div>
                    </div>
                `}

                ${item.ai_analysis ? `
                    <div class="qa-analysis-box">
                        <div class="qa-analysis-label">💡 Parecer da IA (${escapeHtml(modelUsed)}):</div>
                        <div class="qa-analysis-content">${escapeHtml(item.ai_analysis)}</div>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('\n');

    return `
        <div class="qa-panel-wrapper" id="qa-panel-wrapper" style="display: none;">
            ${filterBarHtml}
            <div class="qa-cards-list">
                ${itemsHtml}
            </div>
        </div>
    `;
}
