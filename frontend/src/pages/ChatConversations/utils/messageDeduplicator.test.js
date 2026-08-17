import { describe, it, expect } from 'vitest';
import { appendOrUpdateMessage } from './messageDeduplicator';

describe('appendOrUpdateMessage utility', () => {
    it('adiciona mensagem quando a lista está vazia', () => {
        const msg = { id: 1, content: 'Olá', sender_type: 'user' };
        const result = appendOrUpdateMessage([], msg);
        expect(result).toEqual([msg]);
    });

    it('não duplica quando a mensagem já existe pelo mesmo ID numérico ou string', () => {
        const initial = [{ id: 10, content: 'Mensagem inicial', sender_type: 'user' }];
        const sameMsg = { id: '10', content: 'Mensagem inicial', sender_type: 'user' };
        const result = appendOrUpdateMessage(initial, sameMsg);
        expect(result.length).toBe(1);
        expect(result[0].id).toBe('10');
    });

    it('não duplica quando a mensagem já existe pelo wa_message_id', () => {
        const initial = [{ id: 10, wa_message_id: 'wamid.12345', content: 'Texto', sender_type: 'user' }];
        const wsMsg = { id: 11, wa_message_id: 'wamid.12345', content: 'Texto', sender_type: 'user' };
        const result = appendOrUpdateMessage(initial, wsMsg);
        expect(result.length).toBe(1);
        expect(result[0].wa_message_id).toBe('wamid.12345');
    });

    it('não duplica envio recente com mesmo conteúdo e timestamp próximo (evita eco de envio)', () => {
        const now = new Date().toISOString();
        const initial = [{ id: 10, content: 'Enviando arquivo.pdf', media_url: '/static/uploads/doc.pdf', message_type: 'document', sender_type: 'user', timestamp: now }];
        const wsEcho = { id: 11, content: 'Enviando arquivo.pdf', media_url: '/static/uploads/doc.pdf', message_type: 'document', sender_type: 'user', timestamp: now };
        
        const result = appendOrUpdateMessage(initial, wsEcho);
        expect(result.length).toBe(1);
    });

    it('adiciona nova mensagem diferente normalmente', () => {
        const initial = [{ id: 1, content: 'Primeira', sender_type: 'user' }];
        const second = { id: 2, content: 'Segunda', sender_type: 'contact' };
        const result = appendOrUpdateMessage(initial, second);
        expect(result.length).toBe(2);
    });
});
