import { describe, it, expect } from 'vitest';
import { extractLocalHeuristicQa, renderQaPanelHtml } from './exportQuestionsHelper';

describe('exportQuestionsHelper', () => {
    it('extrai perguntas e associa com a resposta subsequente do agente localmente', () => {
        const messages = [
            {
                id: 1,
                sender_type: 'contact',
                content: 'qual é o valor do curso?',
                timestamp: '2026-08-20T10:00:00Z'
            },
            {
                id: 2,
                sender_type: 'user',
                content: 'O valor é R$ 297,00.',
                timestamp: '2026-08-20T10:01:00Z'
            },
            {
                id: 3,
                sender_type: 'contact',
                content: 'tem certificado?',
                timestamp: '2026-08-20T10:05:00Z'
            }
        ];

        const res = extractLocalHeuristicQa(messages);
        expect(res.total_questions).toBe(2);
        expect(res.answered_count).toBe(1);
        expect(res.unanswered_count).toBe(1);
        expect(res.qa_items[0].status).toBe('answered');
        expect(res.qa_items[0].answer_text).toBe('O valor é R$ 297,00.');
        expect(res.qa_items[1].status).toBe('unanswered');
        expect(res.qa_items[1].answer_text).toBeNull();
    });

    it('renderiza painel HTML com badges de status e parecer da IA', () => {
        const qaData = {
            total_questions: 1,
            answered_count: 1,
            incomplete_count: 0,
            unanswered_count: 0,
            model_used: 'gpt-5.2',
            is_ai_evaluated: true,
            qa_items: [
                {
                    question_id: 'q-1',
                    question_text: 'quem é a professora?',
                    question_time: '09:17',
                    answer_text: 'A professora é a Tarcira Martins.',
                    answer_time: '09:17',
                    status: 'answered',
                    status_label: 'Respondida com Clareza',
                    ai_analysis: 'O agente respondeu com precisão.'
                }
            ]
        };

        const html = renderQaPanelHtml(qaData);
        expect(html).toContain('Dúvida #1');
        expect(html).toContain('quem é a professora?');
        expect(html).toContain('A professora é a Tarcira Martins.');
        expect(html).toContain('Respondida com Clareza');
        expect(html).toContain('GPT-5.2');
        expect(html).toContain('O agente respondeu com precisão.');
    });
});
