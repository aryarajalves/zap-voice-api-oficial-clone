
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
        // Primary filter: Exclusion list
        if (exclusionList.includes(c.phone)) return false;

        // Search filter (name/phone partial match)
        if (searchTerm && !c.phone.includes(searchTerm)) return false;

        // DDD filter (starts with 55 + DDD)
        if (dddSearch) {
            const cleanDDD = dddSearch.replace(/\D/g, '');
            if (cleanDDD && !c.phone.startsWith('55' + cleanDDD)) return false;
        }

        // Status filters
        if (filterBlockedOnly) return c.is_blocked;
        if (filterOpenOnly) return c.window_open && c.status === 'verified';

        return true;
    });
};

/**
 * Get the final list of contacts for actual dispatch.
 * Strictly excludes any blocked leads and respects UI filtering.
 * @param {Array} filteredContacts - The list currently visible in the UI.
 * @returns {Array} The final "selectedList" for the bulk sender.
 */
export const getDispatchList = (filteredContacts) => {
    if (!filteredContacts || !Array.isArray(filteredContacts)) return [];
    
    // Safety check: dispatch MUST only target non-blocked contacts
    return filteredContacts.filter(c => !c.is_blocked);
};
