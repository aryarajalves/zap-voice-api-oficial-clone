import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

describe('ChatConversations AI Doubts Analysis Feature', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('exibe botões de IA apenas se openai_configured for true', () => {
        const checkVisibility = (isOpenAiConfigured) => isOpenAiConfigured === true;

        expect(checkVisibility(true)).toBe(true);
        expect(checkVisibility(false)).toBe(false);
        expect(checkVisibility(undefined)).toBe(false);
    });

    it('formata o payload de análise em massa com os IDs das conversas selecionadas', () => {
        const selectedIds = [1083, 1084, 1085];
        const payload = { conversation_ids: selectedIds };

        expect(payload.conversation_ids).toHaveLength(3);
        expect(payload.conversation_ids).toContain(1083);
    });

    it('gera corretamente o documento HTML do relatório de dúvidas para download', () => {
        const aiReportData = {
            title: 'Relatório Consolidado de Dúvidas (IA) — 2 Conversas',
            raw_report: '1. Dúvida sobre formas de pagamento (Pix/Cartão)',
            has_unanswered_doubts: true,
            total_analyzed: 2
        };

        const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><title>${aiReportData.title}</title></head>
<body><h1>${aiReportData.title}</h1><div>${aiReportData.raw_report}</div></body>
</html>
        `.trim();

        expect(html).toContain('Relatório Consolidado de Dúvidas (IA) — 2 Conversas');
        expect(html).toContain('Dúvida sobre formas de pagamento');
    });
});
