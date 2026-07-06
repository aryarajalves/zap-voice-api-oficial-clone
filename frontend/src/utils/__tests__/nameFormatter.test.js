import { describe, it, expect } from 'vitest';
import { getFirstName } from '../nameFormatter';

describe('Name Formatter - getFirstName', () => {
    it('should return empty string if name is not provided', () => {
        expect(getFirstName(null)).toBe('');
        expect(getFirstName(undefined)).toBe('');
        expect(getFirstName('')).toBe('');
    });

    it('should return the first name from a full name', () => {
        expect(getFirstName('Julia Santos')).toBe('Julia');
        expect(getFirstName('Aryaraj Alves')).toBe('Aryaraj');
        expect(getFirstName('Ana Maria Braga')).toBe('Ana');
    });

    it('should strip Chatwoot pipe symbols and return first name', () => {
        expect(getFirstName('Julia santos | Psicóloga e Sex')).toBe('Julia');
        expect(getFirstName('Aryaraj | Developer')).toBe('Aryaraj');
        expect(getFirstName('Carlos | Atendimento Vendas | SP')).toBe('Carlos');
    });

    it('should handle single names correctly', () => {
        expect(getFirstName('Julia')).toBe('Julia');
        expect(getFirstName('  Aryaraj  ')).toBe('Aryaraj');
    });
});
