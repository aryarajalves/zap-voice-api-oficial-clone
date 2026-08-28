/**
 * Utilitário para extrair e calcular métricas de custo de IA (Pré-Router + Agente Principal)
 * a partir dos metadados de uma mensagem.
 */

export const extractAiCostInfo = (msg) => {
    if (!msg || !msg.meta_data) return null;
    const meta = msg.meta_data;

    let totalCost = meta.ai_cost ?? meta.total_cost ?? meta.cost ?? meta.usage?.total_cost ?? meta.usage?.cost_usd ?? meta.usage?.cost;
    let routerCost = meta.router_cost ?? meta.pre_router_cost ?? meta.usage?.router_cost;
    let agentCost = meta.agent_cost ?? meta.main_agent_cost ?? meta.usage?.agent_cost;
    let tokens = meta.tokens ?? meta.total_tokens ?? meta.usage?.total_tokens ?? null;
    let model = meta.model ?? meta.model_used ?? meta.ai_model ?? meta.agent_model ?? null;

    // Se vier em processing_steps / pipeline
    const rawSteps = meta.processing_steps || meta.pipeline || meta.steps;
    if (rawSteps) {
        let stepsList = [];
        if (Array.isArray(rawSteps)) {
            stepsList = rawSteps;
        } else if (typeof rawSteps === 'string') {
            try {
                stepsList = JSON.parse(rawSteps);
            } catch (e) {
                stepsList = [];
            }
        }

        if (Array.isArray(stepsList) && stepsList.length > 0) {
            let stepsSum = 0;
            let foundStepCost = false;

            stepsList.forEach(step => {
                if (!step || typeof step !== 'object') return;
                const costVal = step.cost ?? step.cost_usd ?? step.total_cost;
                if (typeof costVal === 'number' && !isNaN(costVal)) {
                    stepsSum += costVal;
                    foundStepCost = true;

                    const stepName = (step.step || step.name || step.type || '').toLowerCase();
                    if (stepName.includes('router') || stepName.includes('roteador') || stepName.includes('pre_router') || stepName.includes('pré-roteador')) {
                        routerCost = (routerCost || 0) + costVal;
                    } else if (stepName.includes('agent') || stepName.includes('agente') || stepName.includes('llm') || stepName.includes('model')) {
                        agentCost = (agentCost || 0) + costVal;
                    }
                }
            });

            if (foundStepCost && (totalCost === undefined || totalCost === null)) {
                totalCost = stepsSum;
            }
        }
    }

    // Se vier marcado explicitamente como gratuito
    if (meta.is_free === true || meta.free === true || meta.ai_free === true) {
        if (totalCost === undefined || totalCost === null) {
            totalCost = 0;
        }
    }

    if (totalCost !== undefined && totalCost !== null && !isNaN(Number(totalCost))) {
        const numTotal = Number(totalCost);
        const numRouter = routerCost !== undefined && routerCost !== null && !isNaN(Number(routerCost)) ? Number(routerCost) : null;
        const numAgent = agentCost !== undefined && agentCost !== null && !isNaN(Number(agentCost)) ? Number(agentCost) : null;
        const isFree = numTotal === 0 || meta.is_free === true || meta.free === true || meta.ai_free === true;

        // Formatação em USD (caso necessário)
        const formatCurrency = (val) => {
            if (val === null || val === undefined) return '';
            if (val === 0) return '$0.00';
            if (val < 0.0001 && val > 0) {
                return `$${val.toFixed(6).replace(/0+$/, '')}`;
            }
            return `$${val.toFixed(4)}`;
        };

        // Formatação em Reais (BRL ~ 5.60)
        const formatBrl = (val) => {
            if (val === null || val === undefined) return '';
            if (val === 0) return 'Gratuito';
            const inBrl = val * 5.6;
            if (inBrl < 0.001 && inBrl > 0) {
                return `R$ ${inBrl.toFixed(5).replace(/0+$/, '')}`;
            }
            if (inBrl < 0.01 && inBrl > 0) {
                return `R$ ${inBrl.toFixed(4)}`;
            }
            return `R$ ${inBrl.toFixed(3)}`;
        };

        const totalBrlFormatted = isFree ? 'Gratuito' : formatBrl(numTotal);
        const routerBrlFormatted = numRouter !== null ? (numRouter === 0 ? 'Gratuito' : formatBrl(numRouter)) : null;
        const agentBrlFormatted = numAgent !== null ? (numAgent === 0 ? 'Gratuito' : formatBrl(numAgent)) : null;

        return {
            totalCost: numTotal,
            totalFormatted: isFree ? '$0.00' : formatCurrency(numTotal),
            totalBrl: totalBrlFormatted,
            routerCost: numRouter,
            routerFormatted: numRouter !== null ? (numRouter === 0 ? '$0.00' : formatCurrency(numRouter)) : null,
            routerBrl: routerBrlFormatted,
            agentCost: numAgent,
            agentFormatted: numAgent !== null ? (numAgent === 0 ? '$0.00' : formatCurrency(numAgent)) : null,
            agentBrl: agentBrlFormatted,
            brlEstimate: totalBrlFormatted,
            isFree,
            tokens,
            model
        };
    }

    return null;
};
