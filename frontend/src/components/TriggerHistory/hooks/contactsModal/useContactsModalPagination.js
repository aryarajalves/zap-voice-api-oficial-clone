import { useState, useEffect } from 'react';

export function useContactsModalPagination({
    contactsModal,
    contactsTotal,
    contactsPage,
    setContactsPage,
    contactsPerPage,
    setContactsPerPage,
    contactsFilter,
    contactsTypeFilter,
    contactsErrorFilter,
    setSelectedPhones,
    setContactsSearchPhone,
    setContactsFilterDdi,
    setContactsFilterDdd,
    setContactsErrorFilter
}) {
    const [localPage, setLocalPage] = useState(1);
    const [localPerPage, setLocalPerPage] = useState(20);

    const currentPage = contactsPage ?? localPage;
    const perPage = contactsPerPage ?? localPerPage;
    const setPage = setContactsPage ?? setLocalPage;

    const setPerPage = (val) => {
        if (setContactsPerPage) setContactsPerPage(val);
        else setLocalPerPage(val);
        if (setContactsPage) setContactsPage(1);
        else setLocalPage(1);
    };

    const safeModalContacts = Array.isArray(contactsModal?.contacts) ? contactsModal.contacts : [];
    const totalCount = (contactsTotal && contactsTotal > 0) ? contactsTotal : safeModalContacts.length;
    const totalPages = perPage > 0 ? Math.ceil(totalCount / perPage) : 1;

    const isClientSidePaging = !contactsTotal || contactsTotal === 0;
    const displayContacts = isClientSidePaging
        ? safeModalContacts.slice((currentPage - 1) * perPage, currentPage * perPage)
        : safeModalContacts;

    useEffect(() => {
        if (setSelectedPhones) setSelectedPhones([]);
        setPage(1);
        if (contactsModal?.isOpen) {
            setPerPage(20);
        } else {
            if (setContactsSearchPhone) setContactsSearchPhone('');
            if (setContactsFilterDdi) setContactsFilterDdi('');
            if (setContactsFilterDdd) setContactsFilterDdd('');
        }
    }, [contactsModal?.isOpen, contactsFilter, contactsTypeFilter, contactsErrorFilter]);

    useEffect(() => {
        if (!contactsModal?.isOpen && setContactsErrorFilter) {
            setContactsErrorFilter('all');
        }
    }, [contactsModal?.isOpen, setContactsErrorFilter]);

    return {
        currentPage,
        perPage,
        setPage,
        setPerPage,
        totalCount,
        totalPages,
        displayContacts,
        safeModalContacts,
        isClientSidePaging
    };
}
