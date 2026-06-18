import React from 'react';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../../config';
import { fetchWithAuth } from '../../../AuthContext';

export const useContactsModalLogic = ({
    contactsModal,
    setContactsModal,
    contactsFilter,
    setContactsFilter,
    contactsTypeFilter,
    setContactsTypeFilter,
    contactsErrorFilter,
    setContactsErrorFilter,
    contactsPage,
    setContactsPage,
    contactsPerPage,
    setContactsPerPage,
    contactsTotal,
    activeClient,
    onRefresh
}) => {
    const [selectedPhones, setSelectedPhones] = React.useState([]);
    const [explainError, setExplainError] = React.useState(null);

    const [isTagModalOpen, setIsTagModalOpen] = React.useState(false);
    const [isConfirmBlockOpen, setIsConfirmBlockOpen] = React.useState(false);
    const [isBulkSendModalOpen, setIsBulkSendModalOpen] = React.useState(false);
    const [loadingBlock, setLoadingBlock] = React.useState(false);
    const [loadingAllTarget, setLoadingAllTarget] = React.useState(false);
    const [taggingAll, setTaggingAll] = React.useState(false);
    const [sendingAll, setSendingAll] = React.useState(false);

    const getContactPhone = (contact) => contact.phone_number || contact.phone || '';

    const getAllTargetContacts = async () => {
        if (!contactsModal.triggerId) return [];
        setLoadingAllTarget(true);
        try {
            let allContacts = [];
            if (contactsFilter === 'total') {
                const resT = await fetchWithAuth(`${API_URL}/triggers/${contactsModal.triggerId}`, {}, activeClient?.id);
                if (resT.ok) {
                    const trig = await resT.json();
                    const raw = trig.contacts_list || [];
                    allContacts = raw.map(c => {
                        const phone = typeof c === 'string' ? c : (c.phone || c.whatsapp || c.telefone || c.contact_phone || c.phone_number || c.number || c.meta?.sender?.phone_number || '');
                        const name = typeof c === 'object' ? (c.nome || c.name || c.full_name || c.contact_name || c.meta?.sender?.name || c['{{1}}'] || c['1'] || '') : '';
                        return {
                            phone_number: phone,
                            contact_name: name,
                            status: 'pending',
                            timestamp: trig.created_at,
                            is_bulk_raw: true
                        };
                    });
                }
            } else {
                let url = `${API_URL}/triggers/${contactsModal.triggerId}/messages`;
                const params = new URLSearchParams();
                if (contactsFilter !== 'all') params.append('status_filter', contactsFilter);
                if (contactsTypeFilter !== 'all') params.append('message_type', contactsTypeFilter);
                if ((contactsFilter === 'failed' || contactsFilter === 'blocked') && contactsErrorFilter !== 'all') {
                    params.append('failure_reason', contactsErrorFilter);
                }
                params.append('limit', 999999);
                params.append('skip', 0);
                const res = await fetchWithAuth(`${url}?${params.toString()}`, {}, activeClient?.id);
                if (res.ok) {
                    const data = await res.json();
                    allContacts = data.items || [];
                }
            }
            return allContacts;
        } catch (err) {
            console.error("Erro ao buscar contatos para ação em massa:", err);
            toast.error("Erro ao buscar contatos para a ação.");
            return [];
        } finally {
            setLoadingAllTarget(false);
        }
    };

    const handleOpenTagModal = async () => {
        if (selectedPhones.length > 0) {
            setIsTagModalOpen(true);
        } else {
            setTaggingAll(true);
            const loadToast = toast.loading("Carregando contatos para etiquetar...");
            const allContacts = await getAllTargetContacts();
            toast.dismiss(loadToast);
            setTaggingAll(false);
            if (allContacts.length > 0) {
                const phones = allContacts.map(c => getContactPhone(c)).filter(Boolean);
                setSelectedPhones(phones);
                setIsTagModalOpen(true);
            } else {
                toast.error("Nenhum contato encontrado para etiquetar.");
            }
        }
    };

    const handleOpenBulkSendModal = async () => {
        if (selectedPhones.length > 0) {
            setIsBulkSendModalOpen(true);
        } else {
            setSendingAll(true);
            const loadToast = toast.loading("Carregando contatos para disparo...");
            const allContacts = await getAllTargetContacts();
            toast.dismiss(loadToast);
            setSendingAll(false);
            if (allContacts.length > 0) {
                const phones = allContacts.map(c => getContactPhone(c)).filter(Boolean);
                setSelectedPhones(phones);
                setIsBulkSendModalOpen(true);
            } else {
                toast.error("Nenhum contato encontrado para disparo.");
            }
        }
    };

    const [localPage, setLocalPage] = React.useState(1);
    const [localPerPage, setLocalPerPage] = React.useState(20);

    const currentPage = contactsPage ?? localPage;
    const perPage = contactsPerPage ?? localPerPage;
    const setPage = setContactsPage ?? setLocalPage;
    const setPerPage = (val) => {
        if (setContactsPerPage) setContactsPerPage(val);
        else setLocalPerPage(val);
        if (setContactsPage) setContactsPage(1);
        else setLocalPage(1);
    };

    const totalCount = (contactsTotal && contactsTotal > 0) ? contactsTotal : contactsModal.contacts.length;
    const totalPages = perPage > 0 ? Math.ceil(totalCount / perPage) : 1;

    const isClientSidePaging = !contactsTotal || contactsTotal === 0;
    const displayContacts = isClientSidePaging
        ? contactsModal.contacts.slice((currentPage - 1) * perPage, currentPage * perPage)
        : contactsModal.contacts;

    React.useEffect(() => {
        setSelectedPhones([]);
        setPage(1);
    }, [contactsModal.isOpen, contactsFilter, contactsTypeFilter, contactsErrorFilter]);

    React.useEffect(() => {
        if (!contactsModal.isOpen && setContactsErrorFilter) {
            setContactsErrorFilter('all');
        }
    }, [contactsModal.isOpen, setContactsErrorFilter]);

    const handleBlockSelectedContacts = async () => {
        setLoadingBlock(true);
        try {
            let targetPhones = selectedPhones;
            let targetContacts = contactsModal.contacts;

            if (targetPhones.length === 0) {
                const allContacts = await getAllTargetContacts();
                targetContacts = allContacts;
                targetPhones = allContacts.map(c => getContactPhone(c)).filter(Boolean);
            }

            if (targetPhones.length === 0) {
                toast.error("Nenhum contato para bloquear.");
                setLoadingBlock(false);
                return;
            }

            const contactsToBlock = targetPhones.map(phone => {
                const contactObj = targetContacts.find(c => {
                    const cPhone = getContactPhone(c);
                    return cPhone.replace(/\D/g, '') === phone.replace(/\D/g, '');
                }) || {};
                return {
                    phone: phone,
                    name: contactObj.contact_name || contactObj.name || phone,
                    reason: contactObj.failure_reason 
                        ? `${contactObj.failure_reason} (Falhas — ${contactsModal.title})`
                        : `Falha no envio (Falhas — ${contactsModal.title})`
                };
            });

            const res = await fetchWithAuth(`${API_URL}/blocked/block_bulk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contacts: contactsToBlock })
            }, contactsModal.clientId || activeClient?.id);

            if (res.ok) {
                const data = await res.json();
                toast.success(`${data.success_count} contatos adicionados à lista de bloqueio.`);
                
                setSelectedPhones([]);
                setIsConfirmBlockOpen(false);
                setContactsModal(prev => ({ ...prev, isOpen: false }));
                if (onRefresh) onRefresh();
            } else {
                const err = await res.json().catch(() => ({}));
                toast.error(err.detail || 'Erro ao bloquear contatos.');
            }
        } catch (e) {
            toast.error('Erro de conexão ao bloquear contatos.');
        } finally {
            setLoadingBlock(false);
        }
    };

    const [isConfirmRestOpen, setIsConfirmRestOpen] = React.useState(false);
    const [loadingRest, setLoadingRest] = React.useState(false);

    const handleRestSelectedContacts = async () => {
        setLoadingRest(true);
        try {
            let targetPhones = selectedPhones;
            let targetContacts = contactsModal.contacts;

            if (targetPhones.length === 0) {
                const allContacts = await getAllTargetContacts();
                targetContacts = allContacts;
                targetPhones = allContacts.map(c => getContactPhone(c)).filter(Boolean);
            }

            if (targetPhones.length === 0) {
                toast.error("Nenhum contato para colocar em repouso.");
                setLoadingRest(false);
                return;
            }

            const contactsToRest = targetPhones.map(phone => {
                const contactObj = targetContacts.find(c => {
                    const cPhone = getContactPhone(c);
                    return cPhone.replace(/\D/g, '') === phone.replace(/\D/g, '');
                }) || {};
                return {
                    phone: phone,
                    name: contactObj.contact_name || contactObj.name || phone,
                    reason: contactObj.failure_reason 
                        ? `${contactObj.failure_reason} (Falhas — ${contactsModal.title})`
                        : `Falha no envio (Falhas — ${contactsModal.title})`
                };
            });

            const res = await fetchWithAuth(`${API_URL}/resting/rest_bulk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contacts: contactsToRest })
            }, contactsModal.clientId || activeClient?.id);

            if (res.ok) {
                const data = await res.json();
                toast.success(`${data.success_count} contatos colocados em repouso de 24h.`);
                
                setSelectedPhones([]);
                setIsConfirmRestOpen(false);
                setContactsModal(prev => ({ ...prev, isOpen: false }));
                if (onRefresh) onRefresh();
            } else {
                const err = await res.json().catch(() => ({}));
                toast.error(err.detail || 'Erro ao colocar contatos em repouso.');
            }
        } catch (e) {
            toast.error('Erro de conexão ao colocar contatos em repouso.');
        } finally {
            setLoadingRest(false);
        }
    };

    const isSelected = (contact) => {
        const phone = getContactPhone(contact);
        return phone ? selectedPhones.includes(phone) : false;
    };

    const toggleSelectOne = (contact) => {
        const phone = getContactPhone(contact);
        if (!phone) return;
        setSelectedPhones(prev =>
            prev.includes(phone) ? prev.filter(p => p !== phone) : [...prev, phone]
        );
    };

    const toggleSelectAll = () => {
        const visiblePhones = displayContacts.map(getContactPhone).filter(Boolean);
        const allSelected = visiblePhones.length > 0 && visiblePhones.every(p => selectedPhones.includes(p));
        if (allSelected) {
            setSelectedPhones(prev => prev.filter(p => !visiblePhones.includes(p)));
        } else {
            setSelectedPhones(prev => {
                const next = [...prev];
                visiblePhones.forEach(p => { if (!next.includes(p)) next.push(p); });
                return next;
            });
        }
    };

    return {
        selectedPhones,
        setSelectedPhones,
        explainError,
        setExplainError,
        isTagModalOpen,
        setIsTagModalOpen,
        isConfirmBlockOpen,
        setIsConfirmBlockOpen,
        isBulkSendModalOpen,
        setIsBulkSendModalOpen,
        loadingBlock,
        loadingAllTarget,
        taggingAll,
        sendingAll,
        currentPage,
        perPage,
        setPage,
        setPerPage,
        totalCount,
        totalPages,
        displayContacts,
        isConfirmRestOpen,
        setIsConfirmRestOpen,
        loadingRest,
        handleOpenTagModal,
        handleOpenBulkSendModal,
        handleBlockSelectedContacts,
        handleRestSelectedContacts,
        isSelected,
        toggleSelectOne,
        toggleSelectAll,
        getContactPhone
    };
};
