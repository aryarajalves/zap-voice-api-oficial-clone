/**
 * Helpers para enriquecimento de pipeline e resolução de mídias para a exportação de conversas.
 */

import { API_URL } from '../../config.js';

export function resolveMediaUrl(msg, clientId) {
    if (!msg || !msg.media_url) return '';
    const url = msg.media_url;
    if (url.startsWith('http') || url.startsWith('/static')) {
        return url;
    }
    if (url.includes(':')) {
        const parts = url.split(':');
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
        const cid = clientId || '';
        return `${API_URL}/chat/media/${parts[1]}?token=${token}&client_id=${cid}`;
    }
    return url;
}

export function isImageMedia(msg) {
    if (!msg) return false;
    if (msg.message_type === 'image') return true;
    if (msg.media_url) {
        const url = msg.media_url.toLowerCase();
        return url.endsWith('.png') || url.endsWith('.jpg') || url.endsWith('.jpeg') ||
               url.endsWith('.gif') || url.endsWith('.webp') || url.includes('image');
    }
    return false;
}

/**
 * Faz o parse e normalização das etapas do pipeline e raciocínio (pensamento) do agente.
 */
export function parseAgentPipeline(msg) {
    if (!msg) return { steps: [], thought: null, eventId: null, hasPipeline: false };

    let steps = [];
    let thought = msg.thought || msg.reasoning || msg.meta_data?.thought || msg.meta_data?.reasoning || null;
    let eventId = msg.event_id || msg.meta_data?.event_id || msg.meta_data?.webhook_event_id || null;

    const rawSteps = msg.processing_steps || msg.meta_data?.processing_steps || msg.pipeline || msg.meta_data?.pipeline || msg.meta_data?.steps;

    if (rawSteps) {
        if (Array.isArray(rawSteps)) {
            steps = rawSteps;
        } else if (typeof rawSteps === 'string') {
            try {
                const parsed = JSON.parse(rawSteps);
                if (Array.isArray(parsed)) {
                    steps = parsed;
                } else if (typeof parsed === 'object' && parsed !== null) {
                    if (Array.isArray(parsed.steps)) steps = parsed.steps;
                    if (parsed.thought && !thought) thought = parsed.thought;
                    if (parsed.event_id && !eventId) eventId = parsed.event_id;
                }
            } catch (e) {
                steps = [{ step: '🧠 Raciocínio da IA', detail: rawSteps, timestamp: '' }];
            }
        }
    }

    // Se não veio array explícito de processing_steps, mas existem metadados de Router e Agente
    if (steps.length === 0 && msg.meta_data) {
        const meta = msg.meta_data;
        const routerCost = meta.router_cost ?? meta.pre_router_cost ?? meta.usage?.router_cost;
        const agentCost = meta.agent_cost ?? meta.main_agent_cost ?? meta.usage?.agent_cost;
        const model = meta.model ?? meta.model_used ?? meta.ai_model ?? 'gpt-5.2';

        if (routerCost !== undefined && routerCost !== null) {
            const rCostBrl = (Number(routerCost) * 5.6).toFixed(4);
            steps.push({
                step: '🚦 Pré-Router (Classificação & Roteamento)',
                detail: `Custo: R$ ${rCostBrl} ($${Number(routerCost).toFixed(4)})`,
                timestamp: ''
            });
        }

        if (meta.tools && Array.isArray(meta.tools)) {
            meta.tools.forEach((t, tIdx) => {
                const tName = typeof t === 'string' ? t : (t.name || t.tool || `Tool #${tIdx + 1}`);
                const tDetail = typeof t === 'object' ? (t.output || t.result || JSON.stringify(t)) : '';
                steps.push({
                    step: `🔧 Ferramenta / Tool (${tName})`,
                    detail: tDetail,
                    timestamp: ''
                });
            });
        }

        if (agentCost !== undefined && agentCost !== null || model) {
            const aCostBrl = agentCost !== undefined && agentCost !== null ? ` • Custo: R$ ${(Number(agentCost) * 5.6).toFixed(4)}` : '';
            steps.push({
                step: `🤖 Agente Principal (${model})`,
                detail: `Geração de resposta semântica${aCostBrl}`,
                timestamp: ''
            });
        }
    }

    const hasPipeline = (Array.isArray(steps) && steps.length > 0) || Boolean(thought);
    return { steps, thought, eventId, hasPipeline };
}

/**
 * Consulta a API para enriquecer as mensagens com dados do pipeline da IA.
 */
export async function enrichMessagesWithPipeline(phone, messages = []) {
    if (!phone || !Array.isArray(messages) || messages.length === 0) {
        return messages;
    }

    const cleanPhone = String(phone).replace(/\D/g, '');
    if (!cleanPhone) return messages;

    const hasAgentMsg = messages.some(m => m.sender_type === 'user' || m.sender_type === 'agent');
    if (!hasAgentMsg) return messages;

    const baseUrls = [
        'https://backendagente.aryaraj.shop',
        'http://localhost:8002'
    ];

    let events = [];

    for (const baseUrl of baseUrls) {
        try {
            const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
            const timer = controller ? setTimeout(() => controller.abort(), 2500) : null;

            const res = await fetch(`${baseUrl}/webhooks/1/events?search=${cleanPhone}&limit=50`, {
                signal: controller?.signal,
                headers: { 'Accept': 'application/json' }
            });
            if (timer) clearTimeout(timer);

            if (res.ok) {
                const data = await res.json();
                events = Array.isArray(data) ? data : (data.events || data.items || data.data || []);
                if (events.length > 0) break;
            }
        } catch (e) {
            // Continua para o próximo endpoint
        }
    }

    if (!events || events.length === 0) return messages;

    return messages.map(msg => {
        if (msg.sender_type !== 'user' && msg.sender_type !== 'agent') return msg;
        if (msg.processing_steps || msg.meta_data?.processing_steps) return msg;

        const content = (msg.content || '').trim().toLowerCase();
        if (!content) return msg;

        const matchedEvent = events.find(ev => {
            const agentResp = (ev.agent_response || '').trim().toLowerCase();
            if (!agentResp) return false;
            return agentResp === content ||
                   agentResp.includes(content.slice(0, 35)) ||
                   content.includes(agentResp.slice(0, 35));
        });

        if (matchedEvent && matchedEvent.processing_steps) {
            return {
                ...msg,
                processing_steps: matchedEvent.processing_steps,
                thought: matchedEvent.thought || null,
                event_id: matchedEvent.id
            };
        }

        return msg;
    });
}
