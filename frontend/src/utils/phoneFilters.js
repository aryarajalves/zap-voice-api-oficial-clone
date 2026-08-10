
/**
 * Utility functions for filtering contacts in the Bulk Messaging tool.
 * Extracted from RecipientSelector.jsx to satisfy the "Regra Teste unitario"
 * and enable decoupled logic testing.
 */

/**
 * Filter a list of contacts based on UI parameters.
 * @param {Array} contacts - Raw contact list.
 * @param {Object} filters - SearchTerm, dddSearch, exclusionList, etc.
 * @returns {Array} Filtered list to be shown in the UI.
 */
export const applyFilters = (contacts, { searchTerm, dddSearch, filterOpenOnly, filterBlockedOnly, exclusionList = [] }) => {
    if (!contacts || !Array.isArray(contacts)) return [];

    return contacts.filter(c => {
        if (!c) return false;
        const phoneStr = String(c.phone || '');
        if (!phoneStr) return false;

        // Primary filter: Exclusion list
        if (exclusionList.includes(phoneStr) || exclusionList.includes(c.phone)) return false;

        // Search filter (name/phone partial match)
        if (searchTerm) {
            const term = String(searchTerm).toLowerCase();
            const matchesPhone = phoneStr.includes(term);
            const matchesName = String(c.name || '').toLowerCase().includes(term);
            if (!matchesPhone && !matchesName) return false;
        }

        // DDD filter (starts with 55 + DDD)
        if (dddSearch) {
            const cleanDDD = String(dddSearch).replace(/\D/g, '');
            if (cleanDDD && !phoneStr.startsWith('55' + cleanDDD)) return false;
        }

        // Status filters
        if (filterBlockedOnly) return Boolean(c.is_blocked);
        if (filterOpenOnly) return Boolean(c.window_open) && c.status === 'verified';

        return true;
    });
};

/**
 * Get the final list of contacts for actual dispatch.
 * Strictly excludes any blocked leads and respects UI filtering.
 * @param {Array} filteredContacts - The list currently visible in the UI.
 * @returns {Array} The final "selectedList" for the bulk sender.
 */
export const getDispatchList = (filteredContacts, limitMode = 'all', dispatchLimit = 500) => {
    if (!filteredContacts || !Array.isArray(filteredContacts)) return [];
    
    // Safety check: dispatch MUST only target non-blocked contacts
    const apt = filteredContacts.filter(c => !c.is_blocked);
    if (limitMode === 'limit' && Number(dispatchLimit) > 0) {
        return apt.slice(0, Number(dispatchLimit));
    }
    return apt;
};
