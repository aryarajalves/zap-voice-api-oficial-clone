
/**
 * Utility functions for filtering contacts in the Bulk Messaging tool.
 * Extracted from RecipientSelector.jsx to satisfy the "Regra Teste unitario"
 * and enable decoupled logic testing.
 */

/**
 * Checks if a phone number matches any entry in the exclusion list.
 * Normalizes digits and matches direct phone, phone with/without 55, and last 8 digits.
 * @param {string|number} phone - Contact phone.
 * @param {Array} exclusionList - Array of excluded phones.
 * @returns {boolean} True if phone is excluded.
 */
export const isPhoneExcluded = (phone, exclusionList = []) => {
    if (!phone || !exclusionList || !Array.isArray(exclusionList) || exclusionList.length === 0) return false;
    const cleanPhone = String(phone).replace(/\D/g, '');
    if (!cleanPhone) return false;

    // Direct match
    if (exclusionList.includes(phone) || exclusionList.includes(cleanPhone)) return true;

    const phoneWithout55 = cleanPhone.startsWith('55') ? cleanPhone.slice(2) : cleanPhone;
    const phoneWith55 = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

    for (const ex of exclusionList) {
        const cleanEx = String(ex).replace(/\D/g, '');
        if (!cleanEx) continue;
        if (cleanPhone === cleanEx || phoneWithout55 === cleanEx || phoneWith55 === cleanEx) {
            return true;
        }
        // Match last 8 digits if DDD matches or is omitted
        if (cleanPhone.length >= 8 && cleanEx.length >= 8) {
            if (cleanPhone.slice(-8) === cleanEx.slice(-8)) {
                const dddPhone = cleanPhone.length >= 10 ? cleanPhone.slice(-10, -8) : '';
                const dddEx = cleanEx.length >= 10 ? cleanEx.slice(-10, -8) : '';
                if (!dddPhone || !dddEx || dddPhone === dddEx) {
                    return true;
                }
            }
        }
    }
    return false;
};

/**
 * Filter a list of contacts based on UI parameters.
 * @param {Array} contacts - Raw contact list.
 * @param {Object} filters - SearchTerm, dddSearch, exclusionList, filterExcludedOnly, etc.
 * @returns {Array} Filtered list to be shown in the UI.
 */
export const applyFilters = (contacts, { searchTerm, dddSearch, filterOpenOnly, filterBlockedOnly, filterExcludedOnly = false, exclusionList = [] }) => {
    if (!contacts || !Array.isArray(contacts)) return [];

    return contacts.filter(c => {
        if (!c) return false;
        const phoneStr = String(c.phone || '');
        if (!phoneStr) return false;

        const isExcluded = isPhoneExcluded(c.phone, exclusionList);

        // Exclusion filter logic
        if (filterExcludedOnly) {
            if (!isExcluded) return false;
        } else {
            if (isExcluded) return false;
        }

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

        // Status filters (only apply when not exclusively inspecting excluded list)
        if (!filterExcludedOnly) {
            if (filterBlockedOnly) return Boolean(c.is_blocked);
            if (filterOpenOnly) return Boolean(c.window_open) && c.status === 'verified';
        }

        return true;
    });
};

/**
 * Get the final list of contacts for actual dispatch.
 * Strictly excludes any blocked leads and any excluded leads.
 * @param {Array} filteredContacts - The list currently visible in the UI.
 * @param {string} limitMode - 'all' or 'limit'.
 * @param {number} dispatchLimit - Limit count if mode is 'limit'.
 * @param {Array} exclusionList - Array of excluded phones.
 * @returns {Array} The final "selectedList" for the bulk sender.
 */
export const getDispatchList = (filteredContacts, limitMode = 'all', dispatchLimit = 500, exclusionList = []) => {
    if (!filteredContacts || !Array.isArray(filteredContacts)) return [];
    
    // Safety check: dispatch MUST only target non-blocked AND non-excluded contacts
    const apt = filteredContacts.filter(c => !c.is_blocked && !isPhoneExcluded(c.phone, exclusionList));
    if (limitMode === 'limit' && Number(dispatchLimit) > 0) {
        return apt.slice(0, Number(dispatchLimit));
    }
    return apt;
};

/**
 * Normaliza número de telefone removendo caracteres especiais e padronizando DDI/DDD brasileiro.
 * @param {string|number} phone - Telefone original
 * @returns {string} Telefone normalizado contendo apenas dígitos
 */
export const normalizePhone = (phone) => {
    if (!phone) return '';
    let clean = String(phone).replace(/\D/g, '');
    if (!clean) return '';

    // Se começar com zero à esquerda (ex: 011999998888), remove o zero
    if (clean.startsWith('0')) {
        clean = clean.replace(/^0+/, '');
    }

    // Se tiver 10 ou 11 dígitos sem 55, e o DDD for brasileiro válido (11 a 99), adiciona 55
    if ((clean.length === 10 || clean.length === 11) && !clean.startsWith('55')) {
        const ddd = parseInt(clean.substring(0, 2), 10);
        if (ddd >= 11 && ddd <= 99) {
            clean = `55${clean}`;
        }
    }

    // Se tem 55 + DDD + 8 dígitos (total 12), adiciona o nono dígito 9 se DDD 11 a 99
    if (clean.startsWith('55') && clean.length === 12) {
        const ddd = parseInt(clean.substring(2, 4), 10);
        const number = clean.substring(4);
        if (ddd >= 11 && ddd <= 99) {
            clean = `55${ddd}9${number}`;
        }
    }

    // Se começar com 55 e tiver mais de 13 dígitos, ajusta para os últimos 13
    if (clean.startsWith('55') && clean.length > 13) {
        clean = clean.slice(-13);
    }

    return clean;
};

/**
 * Deduplica e higieniza preventivamente uma lista de contatos.
 * @param {Array} contacts - Lista de contatos (objetos ou strings)
 * @returns {{ uniqueContacts: Array, duplicatesCount: number, originalCount: number }}
 */
export const deduplicateContacts = (contacts) => {
    if (!contacts || !Array.isArray(contacts)) {
        return { uniqueContacts: [], duplicatesCount: 0, originalCount: 0 };
    }

    const seen = new Set();
    const uniqueContacts = [];
    let duplicatesCount = 0;

    for (const c of contacts) {
        if (!c) continue;
        const rawPhone = typeof c === 'string' ? c : (c.phone || c.telefone || c.number || '');
        const normPhone = normalizePhone(rawPhone);
        if (!normPhone || normPhone.length < 8) continue;

        if (seen.has(normPhone)) {
            duplicatesCount++;
            continue;
        }

        seen.add(normPhone);
        if (typeof c === 'string') {
            uniqueContacts.push(normPhone);
        } else {
            uniqueContacts.push({
                ...c,
                phone: normPhone
            });
        }
    }

    return {
        uniqueContacts,
        duplicatesCount,
        originalCount: contacts.length
    };
};
