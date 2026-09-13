import { describe, it, expect } from 'vitest';
import {
    renderMessageItem,
    renderConsecutiveBlock,
    groupMessagesByDate,
    generateConversationDocHtml
} from './exportMessageRenderer';

describe('exportMessageRenderer', () => {
    it('renderMessageItem renderiza texto e oculta prefixo de anotação privada', () => {
        const msg = {
            sender_type: 'system',
            content: '🔒 Anotação Privada: Cliente prefere pagamento via Pix',
            timestamp: '2026-09-13T10:00:00Z'
        };

        const html = renderMessageItem(msg, '0-0', false, 'client-1');
        expect(html).toContain('Cliente prefere pagamento via Pix');
        expect(html).not.toContain('🔒 Anotação Privada: ');
    });

    it('renderConsecutiveBlock unifica mensagens consecutivas com footer de horário', () => {
        const block = {
            category: 'contact',
            messages: [
                { sender_type: 'contact', content: 'Mensagem 1', timestamp: '2026-09-13T10:00:00Z' },
                { sender_type: 'contact', content: 'Mensagem 2', timestamp: '2026-09-13T10:02:00Z' }
            ]
        };

        const html = renderConsecutiveBlock(block, '0', '13/09/2026', 'client-1');
        expect(html).toContain('👤 Usuário (Cliente)');
        expect(html).toContain('Mensagem 1');
        expect(html).toContain('Mensagem 2');
        expect(html).toContain('contact-msg');
        expect(html).toContain('data-is-private="false"');
    });

    it('groupMessagesByDate divide mensagens por dia e agrupa por remetente', () => {
        const messages = [
            { sender_type: 'contact', content: 'Oi', timestamp: '2026-09-12T10:00:00Z' },
            { sender_type: 'user', content: 'Olá!', timestamp: '2026-09-12T10:01:00Z' },
            { sender_type: 'contact', content: 'Novidades?', timestamp: '2026-09-13T09:00:00Z' }
        ];

        const grouped = groupMessagesByDate(messages, 'client-1');
        expect(grouped.uniqueDates.length).toBe(2);
        expect(grouped.totalMessages).toBe(3);
        expect(grouped.totalPrivateNotes).toBe(0);
    });

    it('generateConversationDocHtml compila o documento com metadados e layout completo', () => {
        const convo = { id: 1234, contact_name: 'Carlos Teste', phone: '5585999999999' };
        const messages = [
            { sender_type: 'contact', content: 'Testando doc', timestamp: '2026-09-13T11:00:00Z' }
        ];

        const docHtml = generateConversationDocHtml(convo, messages, 'client-1');
        expect(docHtml).toContain('Carlos Teste');
        expect(docHtml).toContain('5585999999999');
        expect(docHtml).toContain('Testando doc');
    });
});
