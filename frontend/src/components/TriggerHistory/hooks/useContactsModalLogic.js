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
    onRefresh,
    contactsSearchPhone,
    setContactsSearchPhone,
    contactsFilterDdi,
    setContactsFilterDdi,
    contactsFilterDdd,
    setContactsFilterDdd
}) => {
    const [selectedPhones, setSelectedPhones] = React.useState([]);
    const [explainError, setExplainError] = React.useState(null);

    const [isTagModalOpen, setIsTagModalOpen] = React.useState(false);
    const [isConfirmBlockOpen, setIsConfirmBlockOpen] = React.useState(false);
    const [isBulkSendModalOpen, setIsBulkSendModalOpen] = React.useState(false);
    const [isChatwootLabelModalOpen, setIsChatwootLabelModalOpen] = React.useState(false);
    const [loadingBlock, setLoadingBlock] = React.useState(false);
    const [loadingAllTarget, setLoadingAllTarget] = React.useState(false);
    const [taggingAll, setTaggingAll] = React.useState(false);
    const [sendingAll, setSendingAll] = React.useState(false);
    const [chatwootLabeling, setChatwootLabeling] = React.useState(false);

    const getContactPhone = (contact) => {
        if (!contact) return '';
        if (typeof contact === 'string') return contact;
        return (
            contact.phone_number ||
            contact.phone ||
            contact.whatsapp ||
            contact.telefone ||
            contact.contact_phone ||
            contact.number ||
            contact.meta?.sender?.phone_number ||
            ''
        );
    };

    // Marca contatos como "resolvidos" (bloqueado/repousado/reenviado) em vez de removê-los
    // do relatório de falhas. O contato continua aparecendo na lista, só que travado — o
    // ContactRow usa `failure_resolution` para desenhar o estado bloqueado e impedir seleção.
    const markContactsResolved = (phones, resolution) => {
        const cleanTargets = new Set((phones || []).map(p => (p || '').replace(/\D/g, '')));
        if (cleanTargets.size === 0) return;
        const resolvedAt = new Date().toISOString();
        setContactsModal(prev => ({
            ...prev,
            contacts: (prev.contacts || []).map(c => {
                const cPhone = getContactPhone(c).replace(/\D/g, '');
                return cleanTargets.has(cPhone)
                    ? { ...c, failure_resolution: resolution, failure_resolved_at: resolvedAt }
                    : c;
            })
        }));
    };

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
                if (contactsSearchPhone) params.append('search_phone', contactsSearchPhone);
                if (contactsFilterDdi) params.append('filter_ddi', contactsFilterDdi);
                if (contactsFilterDdd) params.append('filter_ddd', contactsFilterDdd);
                
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

    const safeModalContacts = Array.isArray(contactsModal.contacts) ? contactsModal.contacts : [];
    const totalCount = (contactsTotal && contactsTotal > 0) ? contactsTotal : safeModalContacts.length;
    const totalPages = perPage > 0 ? Math.ceil(totalCount / perPage) : 1;

    const isClientSidePaging = !contactsTotal || contactsTotal === 0;
    const displayContacts = isClientSidePaging
        ? safeModalContacts.slice((currentPage - 1) * perPage, currentPage * perPage)
        : safeModalContacts;

    React.useEffect(() => {
        setSelectedPhones([]);
        setPage(1);
        if (contactsModal.isOpen) {
            setPerPage(20);
        } else {
            if (setContactsSearchPhone) setContactsSearchPhone('');
            if (setContactsFilterDdi) setContactsFilterDdi('');
            if (setContactsFilterDdd) setContactsFilterDdd('');
        }
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

                // Não fecha mais o modal nem remove os contatos da lista — eles continuam
                // visíveis no relatório de falhas, só que travados (não podem ser
                // selecionados/acionados de novo).
                markContactsResolved(targetPhones, 'blocked');
                setSelectedPhones(prev => prev.filter(p => !targetPhones.includes(p)));
                setIsConfirmBlockOpen(false);
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

    // labels: string[] — uma ou mais etiquetas selecionadas no modal
    const handleApplyChatwootLabel = async (labels) => {
        if (!contactsModal.triggerId) {
            toast.error('Disparo nao identificado.');
            return;
        }
        if (!labels || labels.length === 0) {
            toast.error('Selecione ao menos uma etiqueta.');
            return;
        }
        setChatwootLabeling(true);
        const labelNames = labels.join(', ');
        const loadToast = toast.loading(`Aplicando ${labels.length} etiqueta(s) no Chatwoot...`);
        try {
            const clientId = contactsModal.clientId || activeClient?.id;
            let totalSuccess = 0;
            let totalFailed = 0;
            for (const label of labels) {
                const res = await fetchWithAuth(
                    `${API_URL}/triggers/${contactsModal.triggerId}/chatwoot-label`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ label, phones: selectedPhones }),
                    },
                    clientId
                );
                if (res.ok) {
                    const data = await res.json();
                    totalSuccess = Math.max(totalSuccess, data.success || 0);
                } else {
                    totalFailed++;
                }
            }
            toast.dismiss(loadToast);
            if (totalFailed === 0) {
                toast.success(`${labels.length} etiqueta(s) aplicada(s) em ${totalSuccess} conversa(s).`);
            } else {
                toast.error(`${totalFailed} etiqueta(s) falharam. ${labels.length - totalFailed} aplicada(s) com sucesso.`);
            }
            setIsChatwootLabelModalOpen(false);
            setSelectedPhones([]);
        } catch (e) {
            toast.dismiss(loadToast);
            toast.error('Erro de conexao ao aplicar etiquetas.');
        } finally {
            setChatwootLabeling(false);
        }
    };

    const [restingHours, setRestingHours] = React.useState(24);

    const handleRestSelectedContacts = async (overrideHours) => {
        const hoursToUse = overrideHours || restingHours || 24;
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
                        : `Falha no envio (Falhas — ${contactsModal.title})`,
                    hours: hoursToUse
                };
            });

            const res = await fetchWithAuth(`${API_URL}/resting/rest_bulk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contacts: contactsToRest })
            }, contactsModal.clientId || activeClient?.id);

            if (res.ok) {
                const data = await res.json();
                toast.success(`${data.success_count} contatos colocados em repouso por ${hoursToUse}h.`);

                // Não fecha mais o modal nem remove os contatos da lista — eles continuam
                // visíveis no relatório de falhas, só que travados (não podem ser
                // selecionados/acionados de novo).
                markContactsResolved(targetPhones, 'resting');
                setSelectedPhones(prev => prev.filter(p => !targetPhones.includes(p)));
                setIsConfirmRestOpen(false);
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
        if (contact.failure_resolution) return; // já resolvido — travado, não pode selecionar
        const phone = getContactPhone(contact);
        if (!phone) return;
        setSelectedPhones(prev =>
            prev.includes(phone) ? prev.filter(p => p !== phone) : [...prev, phone]
        );
    };

    const handleSelectAllTarget = async () => {
        if (selectedPhones.length >= totalCount && totalCount > 0) {
            setSelectedPhones([]);
            return;
        }

        if (totalCount <= (displayContacts || []).length || isClientSidePaging) {
            const selectablePhones = safeModalContacts
                .filter(c => !c?.failure_resolution)
                .map(getContactPhone)
                .filter(Boolean);
            setSelectedPhones(selectablePhones);
            return;
        }

        setLoadingAllTarget(true);
        const loadToast = toast.loading(`Carregando todos os ${totalCount} contatos...`);
        try {
            const allContacts = await getAllTargetContacts();
            const selectablePhones = (allContacts || [])
                .filter(c => !c?.failure_resolution)
                .map(getContactPhone)
                .filter(Boolean);
            setSelectedPhones(selectablePhones);
            toast.dismiss(loadToast);
            toast.success(`Todos os ${selectablePhones.length} contatos foram selecionados!`);
        } catch (err) {
            toast.dismiss(loadToast);
            toast.error("Erro ao buscar todos os contatos.");
        } finally {
            setLoadingAllTarget(false);
        }
    };

    const toggleSelectAll = () => {
        // Contatos já resolvidos (bloqueado/repousado/reenviado) ficam de fora da seleção em massa.
        const visiblePhones = (displayContacts || []).filter(c => !c?.failure_resolution).map(getContactPhone).filter(Boolean);
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
        markContactsResolved,
        explainError,
        setExplainError,
        isTagModalOpen,
        setIsTagModalOpen,
        isConfirmBlockOpen,
        setIsConfirmBlockOpen,
        isBulkSendModalOpen,
        setIsBulkSendModalOpen,
        isChatwootLabelModalOpen,
        setIsChatwootLabelModalOpen,
        loadingBlock,
        loadingAllTarget,
        taggingAll,
        sendingAll,
        chatwootLabeling,
        currentPage,
        perPage,
        setPage,
        setPerPage,
        totalCount,
        totalPages,
        displayContacts,
        isConfirmRestOpen,
        setIsConfirmRestOpen,
        restingHours,
        setRestingHours,
        loadingRest,
        handleOpenTagModal,
        handleOpenBulkSendModal,
        handleBlockSelectedContacts,
        handleRestSelectedContacts,
        handleApplyChatwootLabel,
        isSelected,
        toggleSelectOne,
        toggleSelectAll,
        handleSelectAllTarget,
        getAllTargetContacts,
        getContactPhone,
        safeModalContacts,
        isClientSidePaging
    };
};
