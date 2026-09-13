import { describe, it, expect } from 'vitest';
import {
    parseMessageDate,
    formatTimestamp,
    getSenderCategory,
    escapeHtml,
    MONTH_NAMES
} from './exportDateUtils';

describe('exportDateUtils', () => {
    it('MONTH_NAMES contém os 12 meses em português', () => {
        expect(MONTH_NAMES.length).toBe(12);
        expect(MONTH_NAMES[0]).toBe('Janeiro');
        expect(MONTH_NAMES[11]).toBe('Dezembro');
    });

    it('parseMessageDate formata timestamp ISO corretamente', () => {
        const res = parseMessageDate('2026-09-13T15:30:00Z');
        expect(res.dateKey).toBe('13/09/2026');
        expect(res.dateLabel).toContain('13 de Setembro de 2026');
        expect(res.timeStr).toBeDefined();
    });

    it('parseMessageDate lida com timestamp inválido ou nulo', () => {
        const resNull = parseMessageDate(null);
        expect(resNull.dateKey).toBe('Sem Data');
        expect(resNull.dateObj).toBeNull();

        const resInvalid = parseMessageDate('data-invalida');
        expect(resInvalid.dateKey).toBe('Sem Data');
    });

    it('formatTimestamp retorna string formatada de data e hora', () => {
        const formatted = formatTimestamp('2026-09-13T10:00:00Z');
        expect(typeof formatted).toBe('string');
        expect(formatted.length).toBeGreaterThan(0);
    });

    it('getSenderCategory categoriza corretamente o remetente', () => {
        expect(getSenderCategory({ sender_type: 'contact' })).toBe('contact');
        expect(getSenderCategory({ sender_type: 'user' })).toBe('user');
        expect(getSenderCategory({ sender_type: 'agent' })).toBe('user');
        expect(getSenderCategory({ sender_type: 'system' })).toBe('system');
        expect(getSenderCategory({ sender_type: 'unknown' })).toBe('other');
        expect(getSenderCategory(null)).toBe('contact');
    });

    it('escapeHtml escapa caracteres especiais prevenindo XSS', () => {
        expect(escapeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
        expect(escapeHtml("Tom & Jerry's")).toBe('Tom &amp; Jerry&#039;s');
        expect(escapeHtml('')).toBe('');
        expect(escapeHtml(null)).toBe('');
    });
});
