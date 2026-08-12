import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Testes unitários para validar a lógica de atualização otimista de reações
 * e a função de normalização de reações (normalizeReactions).
 */

// Replica a lógica de normalizeReactions do useChatEngine.js
function normalizeReactions(rawReactions) {
    if (Array.isArray(rawReactions)) return rawReactions.filter(Boolean);
    if (rawReactions && typeof rawReactions === 'object') {
        return Object.entries(rawReactions).map(([s, val]) => {
            if (typeof val === 'object' && val !== null && val.emoji) return val;
            if (typeof val === 'string' && val) return { sender: s, emoji: val };
            return null;
        }).filter(Boolean);
    }
    return [];
}

// Replica a atualização otimista do sendReaction
function applyOptimisticReaction(messages, messageId, emoji) {
    return messages.map(m => {
        const isTarget = String(m.id) === String(messageId) || m.wa_message_id === messageId;
        if (isTarget) {
            const meta = { ...(m.meta_data || {}) };
            const reactions = normalizeReactions(meta.reactions);
            const filtered = reactions.filter(r => r && r.sender !== 'agent');
            if (emoji) filtered.push({ sender: 'agent', emoji: emoji });
            meta.reactions = filtered;
            return { ...m, meta_data: meta };
        }
        return m;
    });
}

describe('Reação Otimista — sendReaction', () => {

    const baseMessages = [
        { id: 1, text: 'Olá', meta_data: {} },
        { id: 2, text: 'Tudo bem?', meta_data: { reactions: [] } },
        { id: 3, text: 'Sim!', meta_data: { reactions: [{ sender: 'contact', emoji: '👍' }] } },
    ];

    it('deve adicionar emoji imediatamente à mensagem alvo (lista vazia)', () => {
        const updated = applyOptimisticReaction(baseMessages, 1, '❤️');
        const target = updated.find(m => m.id === 1);
        expect(target.meta_data.reactions).toEqual([{ sender: 'agent', emoji: '❤️' }]);
    });

    it('deve não alterar outras mensagens', () => {
        const updated = applyOptimisticReaction(baseMessages, 1, '❤️');
        const unchanged = updated.find(m => m.id === 2);
        expect(unchanged.meta_data.reactions).toEqual([]);
    });

    it('deve substituir reação do agente sem duplicar', () => {
        const msgs = [{ id: 10, text: 'test', meta_data: { reactions: [{ sender: 'agent', emoji: '👍' }] } }];
        const updated = applyOptimisticReaction(msgs, 10, '❤️');
        const target = updated.find(m => m.id === 10);
        expect(target.meta_data.reactions).toHaveLength(1);
        expect(target.meta_data.reactions[0]).toEqual({ sender: 'agent', emoji: '❤️' });
    });

    it('deve preservar reação do contato ao adicionar do agente', () => {
        const updated = applyOptimisticReaction(baseMessages, 3, '😂');
        const target = updated.find(m => m.id === 3);
        expect(target.meta_data.reactions).toHaveLength(2);
        expect(target.meta_data.reactions.some(r => r.sender === 'contact' && r.emoji === '👍')).toBe(true);
        expect(target.meta_data.reactions.some(r => r.sender === 'agent' && r.emoji === '😂')).toBe(true);
    });

    it('deve remover reação do agente quando emoji é null/vazio', () => {
        const msgs = [{ id: 5, text: 'x', meta_data: { reactions: [{ sender: 'agent', emoji: '❤️' }, { sender: 'contact', emoji: '👍' }] } }];
        const updated = applyOptimisticReaction(msgs, 5, ''); // emoji vazio = remover
        const target = updated.find(m => m.id === 5);
        expect(target.meta_data.reactions).toHaveLength(1);
        expect(target.meta_data.reactions[0].sender).toBe('contact');
    });
});

describe('normalizeReactions — compatibilidade de formatos', () => {

    it('retorna lista vazia se reactions for null/undefined', () => {
        expect(normalizeReactions(null)).toEqual([]);
        expect(normalizeReactions(undefined)).toEqual([]);
    });

    it('normaliza formato legado de objeto {"agent": "❤️"}', () => {
        const result = normalizeReactions({ agent: '❤️' });
        expect(result).toEqual([{ sender: 'agent', emoji: '❤️' }]);
    });

    it('normaliza formato legado de objeto aninhado {"agent": {"emoji": "❤️", "sender": "agent"}}', () => {
        const result = normalizeReactions({ agent: { emoji: '❤️', sender: 'agent' } });
        expect(result).toEqual([{ emoji: '❤️', sender: 'agent' }]);
    });

    it('passa lista já normalizada sem alterar', () => {
        const input = [{ sender: 'contact', emoji: '👍' }, { sender: 'agent', emoji: '❤️' }];
        expect(normalizeReactions(input)).toEqual(input);
    });

    it('filtra entradas nulas da lista', () => {
        const result = normalizeReactions([null, { sender: 'agent', emoji: '❤️' }, undefined]);
        expect(result).toEqual([{ sender: 'agent', emoji: '❤️' }]);
    });
});
