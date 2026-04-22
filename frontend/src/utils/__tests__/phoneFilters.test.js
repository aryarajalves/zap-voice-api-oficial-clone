
import { describe, it, expect } from 'vitest';
import { applyFilters, getDispatchList } from '../phoneFilters';

describe('Phone Filters Logic', () => {
    const mockContacts = [
        { phone: '5585991112222', name: 'Fortaleza User', is_blocked: false, window_open: true, status: 'verified' },
        { phone: '5585993334444', name: 'Fortaleza Blocked', is_blocked: true, window_open: true, status: 'verified' },
        { phone: '5511988887777', name: 'SP User', is_blocked: false, window_open: true, status: 'verified' },
        { phone: '5511966665555', name: 'SP Closed', is_blocked: false, window_open: false, status: 'verified' },
    ];

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

        it('should respect the exclusion list', () => {
            const filtered = applyFilters(mockContacts, { exclusionList: ['5585991112222'] });
            expect(filtered).not.toContain(mockContacts[0]);
            expect(filtered).toHaveLength(3);
        });
    });

    describe('getDispatchList', () => {
        it('should strictly exclude blocked contacts from dispatch', () => {
            // Even if the UI shows blocked contacts (filterBlockedOnly: true)
            const filtered = applyFilters(mockContacts, { dddSearch: '85' }); // Has 1 blocked, 1 non-blocked
            const dispatch = getDispatchList(filtered);
            
            expect(dispatch).toHaveLength(1);
            expect(dispatch[0].is_blocked).toBe(false);
            expect(dispatch[0].phone).toBe('5585991112222');
        });

        it('should return empty if all filtered contacts are blocked', () => {
            const filtered = applyFilters(mockContacts, { filterBlockedOnly: true });
            const dispatch = getDispatchList(filtered);
            expect(dispatch).toHaveLength(0);
        });
    });
});
