import { describe, it, expect } from 'vitest';
import { getDateKey, formatDateSeparator } from './chatDateUtils';

describe('chatDateUtils', () => {
    it('deve extrair a chave de data no formato YYYY-MM-DD', () => {
        const date = new Date(2026, 7, 21, 14, 30); // 21/08/2026
        const key = getDateKey(date.toISOString());
        expect(key).toBe('2026-08-21');
    });

    it('deve retornar string vazia para datas inválidas ou nulas', () => {
        expect(getDateKey(null)).toBe('');
        expect(getDateKey('')).toBe('');
        expect(getDateKey('invalido')).toBe('');
        expect(formatDateSeparator(null)).toBe('');
    });

    it('deve retornar "Hoje" para mensagens enviadas hoje', () => {
        const now = new Date();
        expect(formatDateSeparator(now.toISOString())).toBe('Hoje');
    });

    it('deve retornar "Ontem" para mensagens enviadas ontem', () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        expect(formatDateSeparator(yesterday.toISOString())).toBe('Ontem');
    });

    it('deve retornar data por extenso para dias anteriores', () => {
        // 18 de agosto de 2026
        const pastDate = new Date(2026, 7, 18, 10, 0);
        const result = formatDateSeparator(pastDate.toISOString());
        expect(result).toMatch(/18 de agosto/i);
    });
});
