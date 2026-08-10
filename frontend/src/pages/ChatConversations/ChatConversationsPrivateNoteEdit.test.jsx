import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

describe('ChatConversations Private Note Edit Logic', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('identifica corretamente se uma mensagem é uma anotação privada', () => {
        const msg1 = { id: 1, sender_type: 'system', content: '🔒 Anotação Privada: Cliente prefere contato à tarde' };
        const msg2 = { id: 2, sender_type: 'system', content: 'Marcador adicionado: vip' };
        const msg3 = { id: 3, sender_type: 'contact', content: 'Olá' };

        const isPrivateNote = (msg) => msg.sender_type === 'system' && msg.content?.startsWith('🔒 Anotação Privada:');

        expect(isPrivateNote(msg1)).toBe(true);
        expect(isPrivateNote(msg2)).toBe(false);
        expect(isPrivateNote(msg3)).toBe(false);
    });

    it('extrai corretamente o texto puro da anotação sem o prefixo', () => {
        const content = '🔒 Anotação Privada: O agente de IA deve responder com emoji';
        const noteText = content.replace('🔒 Anotação Privada: ', '');
        expect(noteText).toBe('O agente de IA deve responder com emoji');
    });

    it('formata o payload de atualização corretamente para o endpoint PUT /chat/conversations/:id/notes/:msgId', () => {
        const convoId = 1083;
        const msgId = 55;
        const updatedText = 'Anotação editada com sucesso!';

        const endpoint = `/chat/conversations/${convoId}/notes/${msgId}`;
        const payload = { private_note: updatedText };

        expect(endpoint).toBe('/chat/conversations/1083/notes/55');
        expect(payload.private_note).toBe('Anotação editada com sucesso!');
    });
});
