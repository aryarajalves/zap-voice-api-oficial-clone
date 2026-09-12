
import { describe, it, expect } from 'vitest';
import { applyFilters, getDispatchList, isPhoneExcluded, normalizePhone, deduplicateContacts } from '../phoneFilters';

describe('Phone Filters Logic', () => {
    const mockContacts = [
        { phone: '5585991112222', name: 'Fortaleza User', is_blocked: false, window_open: true, status: 'verified' },
        { phone: '5585993334444', name: 'Fortaleza Blocked', is_blocked: true, window_open: true, status: 'verified' },
        { phone: '5511988887777', name: 'SP User', is_blocked: false, window_open: true, status: 'verified' },
        { phone: '5511966665555', name: 'SP Closed', is_blocked: false, window_open: false, status: 'verified' },
    ];

    describe('isPhoneExcluded', () => {
        it('should detect exact match and match without 55', () => {
            expect(isPhoneExcluded('5585991112222', ['5585991112222'])).toBe(true);
            expect(isPhoneExcluded('85991112222', ['5585991112222'])).toBe(true);
            expect(isPhoneExcluded('5585991112222', ['85991112222'])).toBe(true);
            expect(isPhoneExcluded('5511988887777', ['5585991112222'])).toBe(false);
        });

        it('should return false for empty inputs', () => {
            expect(isPhoneExcluded('', ['5585991112222'])).toBe(false);
            expect(isPhoneExcluded('5585991112222', [])).toBe(false);
            expect(isPhoneExcluded(null, null)).toBe(false);
        });
    });

    describe('applyFilters', () => {
        it('should filter by DDD 85', () => {
            const filtered = applyFilters(mockContacts, { dddSearch: '85' });
            expect(filtered).toHaveLength(2);
            expect(filtered.every(c => c.phone.startsWith('5585'))).toBe(true);
        });

        it('should filter by search term (phone)', () => {
            const filtered = applyFilters(mockContacts, { searchTerm: '98888' });
            expect(filtered).toHaveLength(1);
            expect(filtered[0].phone).toBe('5511988887777');
        });

        it('should filter by blocked status', () => {
            const filtered = applyFilters(mockContacts, { filterBlockedOnly: true });
            expect(filtered).toHaveLength(1);
            expect(filtered[0].is_blocked).toBe(true);
        });

        it('should respect the exclusion list in normal mode', () => {
            const filtered = applyFilters(mockContacts, { exclusionList: ['5585991112222'] });
            expect(filtered).not.toContain(mockContacts[0]);
            expect(filtered).toHaveLength(3);
        });

        it('should return ONLY excluded contacts when filterExcludedOnly is true', () => {
            const filtered = applyFilters(mockContacts, {
                exclusionList: ['5585991112222', '5511966665555'],
                filterExcludedOnly: true
            });
            expect(filtered).toHaveLength(2);
            expect(filtered.map(c => c.phone)).toEqual(['5585991112222', '5511966665555']);
        });
    });

    describe('getDispatchList', () => {
        it('should strictly exclude blocked contacts from dispatch', () => {
            const filtered = applyFilters(mockContacts, { dddSearch: '85' });
            const dispatch = getDispatchList(filtered);
            
            expect(dispatch).toHaveLength(1);
            expect(dispatch[0].is_blocked).toBe(false);
            expect(dispatch[0].phone).toBe('5585991112222');
        });

        it('should strictly exclude contacts in exclusionList even if present in filtered list', () => {
            const dispatch = getDispatchList(mockContacts, 'all', 500, ['5585991112222']);
            expect(dispatch.some(c => c.phone === '5585991112222')).toBe(false);
            expect(dispatch.some(c => c.is_blocked)).toBe(false);
        });

        it('should return empty if all filtered contacts are blocked', () => {
            const filtered = applyFilters(mockContacts, { filterBlockedOnly: true });
            const dispatch = getDispatchList(filtered);
            expect(dispatch).toHaveLength(0);
        });

        it('should slice dispatch list to N first contacts when limitMode is limit', () => {
            const dispatch = getDispatchList(mockContacts, 'limit', 2);
            expect(dispatch).toHaveLength(2);
            expect(dispatch[0].phone).toBe('5585991112222');
            expect(dispatch[1].phone).toBe('5511988887777');
        });
    });

    describe('normalizePhone', () => {
        it('should remove special characters and spaces', () => {
            expect(normalizePhone('+55 (11) 98888-7777')).toBe('5511988887777');
        });

        it('should add 55 prefix if Brazilian DDD without DDI', () => {
            expect(normalizePhone('11988887777')).toBe('5511988887777');
            expect(normalizePhone('(21) 97777-6666')).toBe('5521977776666');
        });

        it('should remove leading zero from Brazilian 11-digit phone', () => {
            expect(normalizePhone('011988887777')).toBe('5511988887777');
        });

        it('should add 9th digit if 8 digits mobile with DDI 55', () => {
            expect(normalizePhone('551188887777')).toBe('5511988887777');
        });

        it('should return empty string for null or empty input', () => {
            expect(normalizePhone('')).toBe('');
            expect(normalizePhone(null)).toBe('');
        });
    });

    describe('deduplicateContacts', () => {
        it('should discard duplicate phone numbers with different formats', () => {
            const input = [
                { phone: '(11) 98888-7777', name: 'João 1' },
                { phone: '5511988887777', name: 'João Duplicado' },
                { phone: '11988887777', name: 'João Triplicado' },
                { phone: '21977776666', name: 'Maria' }
            ];

            const result = deduplicateContacts(input);
            expect(result.originalCount).toBe(4);
            expect(result.duplicatesCount).toBe(2);
            expect(result.uniqueContacts).toHaveLength(2);
            expect(result.uniqueContacts[0].phone).toBe('5511988887777');
            expect(result.uniqueContacts[0].name).toBe('João 1');
            expect(result.uniqueContacts[1].phone).toBe('5521977776666');
        });

        it('should handle array of phone strings', () => {
            const input = ['5511999998888', '11999998888', '5521988887777'];
            const result = deduplicateContacts(input);
            expect(result.duplicatesCount).toBe(1);
            expect(result.uniqueContacts).toEqual(['5511999998888', '5521988887777']);
        });

        it('should return empty results for invalid or empty input', () => {
            expect(deduplicateContacts(null).uniqueContacts).toEqual([]);
            expect(deduplicateContacts([]).uniqueContacts).toEqual([]);
        });
    });
});
