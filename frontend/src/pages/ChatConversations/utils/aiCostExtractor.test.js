import { describe, it, expect } from 'vitest';
import { extractAiCostInfo } from './aiCostExtractor';

describe('aiCostExtractor', () => {
    it('retorna null se a mensagem não tem meta_data ou custos', () => {
        expect(extractAiCostInfo(null)).toBeNull();
        expect(extractAiCostInfo({})).toBeNull();
        expect(extractAiCostInfo({ meta_data: {} })).toBeNull();
    });

    it('extrai custo direto de meta_data.total_cost', () => {
        const msg = {
            meta_data: {
                total_cost: 0.0035,
                router_cost: 0.0005,
                agent_cost: 0.0030
            }
        };

        const result = extractAiCostInfo(msg);
        expect(result).not.toBeNull();
        expect(result.totalCost).toBe(0.0035);
        expect(result.totalFormatted).toBe('$0.0035');
        expect(result.totalBrl).toBe('R$ 0.020');
        expect(result.routerCost).toBe(0.0005);
        expect(result.routerFormatted).toBe('$0.0005');
        expect(result.routerBrl).toBe('R$ 0.0028');
        expect(result.agentCost).toBe(0.0030);
        expect(result.agentFormatted).toBe('$0.0030');
        expect(result.agentBrl).toBe('R$ 0.017');
    });

    it('extrai custo a partir de processing_steps quando o AgentFlow envia as etapas de execução', () => {
        const msg = {
            meta_data: {
                processing_steps: [
                    { step: 'Pré-Router (Classificação)', cost: 0.0004 },
                    { step: 'Agente Principal (GPT-5)', cost: 0.0021 }
                ]
            }
        };

        const result = extractAiCostInfo(msg);
        expect(result).not.toBeNull();
        expect(result.totalCost).toBeCloseTo(0.0025);
        expect(result.routerCost).toBe(0.0004);
        expect(result.agentCost).toBe(0.0021);
    });

    it('extrai custo a partir de usage do payload OpenAI/AgentFlow', () => {
        const msg = {
            meta_data: {
                usage: {
                    total_cost: 0.0018,
                    total_tokens: 450
                },
                model: 'gpt-4o-mini'
            }
        };

        const result = extractAiCostInfo(msg);
        expect(result).not.toBeNull();
        expect(result.totalCost).toBe(0.0018);
        expect(result.tokens).toBe(450);
        expect(result.model).toBe('gpt-4o-mini');
    });

    it('retorna Gratuito e isFree=true quando o custo total for 0 (zerado)', () => {
        const msg = {
            meta_data: {
                total_cost: 0,
                router_cost: 0,
                agent_cost: 0
            }
        };

        const result = extractAiCostInfo(msg);
        expect(result).not.toBeNull();
        expect(result.totalCost).toBe(0);
        expect(result.isFree).toBe(true);
        expect(result.totalBrl).toBe('Gratuito');
        expect(result.totalFormatted).toBe('$0.00');
        expect(result.routerBrl).toBe('Gratuito');
        expect(result.agentBrl).toBe('Gratuito');
    });

    it('retorna Gratuito quando a mensagem tiver flag is_free ou ai_free', () => {
        const msg = {
            meta_data: {
                is_free: true,
                model: 'agentflow-free'
            }
        };

        const result = extractAiCostInfo(msg);
        expect(result).not.toBeNull();
        expect(result.isFree).toBe(true);
        expect(result.totalBrl).toBe('Gratuito');
    });
});
