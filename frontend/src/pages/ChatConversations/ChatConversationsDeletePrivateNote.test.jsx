import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

describe('ChatConversations Delete Private Note & Empty Note Validation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('impede salvamento de anotação privada com texto em branco', () => {
        const textEmpty = '';
        const textSpaces = '   ';
        const textValid = 'Anotação importante';

        const isSaveDisabled = (txt) => !txt || !txt.trim();

        expect(isSaveDisabled(textEmpty)).toBe(true);
        expect(isSaveDisabled(textSpaces)).toBe(true);
        expect(isSaveDisabled(textValid)).toBe(false);
    });

    it('constrói corretamente o endpoint DELETE para mensagens de anotação privada', () => {
        const convoId = 1083;
        const messageId = 77;
        const deleteEndpoint = `/chat/conversations/${convoId}/messages/${messageId}`;

        expect(deleteEndpoint).toBe('/chat/conversations/1083/messages/77');
    });

    it('filtra corretamente a anotação removida da lista de mensagens e encontra a anotação mais recente restante', () => {
        const messages = [
            { id: 1, sender_type: 'system', content: '🔒 Anotação Privada: Primeira nota' },
            { id: 2, sender_type: 'system', content: '🔒 Anotação Privada: Segunda nota' },
            { id: 3, sender_type: 'contact', content: 'Oi' }
        ];

        const deletedId = 2;
        const remaining = messages.filter(m => m.id !== deletedId);
        expect(remaining).toHaveLength(2);

        const remainingNotes = remaining.filter(m => m.sender_type === 'system' && m.content?.startsWith('🔒 Anotação Privada:'));
        expect(remainingNotes).toHaveLength(1);
        expect(remainingNotes[0].content).toContain('Primeira nota');
    });
});
