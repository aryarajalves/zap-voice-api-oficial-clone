import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../../../config';
import { fetchWithAuth } from '../../../../AuthContext';
import { getContactPhone } from './contactUtils';

export function useContactsActions({
    contactsModal,
    setContactsModal,
    selectedPhones,
    setSelectedPhones,
    activeClient,
    onRefresh,
    getAllTargetContacts
}) {
    const [isTagModalOpen, setIsTagModalOpen] = useState(false);
    const [isConfirmBlockOpen, setIsConfirmBlockOpen] = useState(false);
    const [isBulkSendModalOpen, setIsBulkSendModalOpen] = useState(false);
    const [isChatwootLabelModalOpen, setIsChatwootLabelModalOpen] = useState(false);
    const [isConfirmRestOpen, setIsConfirmRestOpen] = useState(false);

    const [loadingBlock, setLoadingBlock] = useState(false);
    const [loadingRest, setLoadingRest] = useState(false);
    const [taggingAll, setTaggingAll] = useState(false);
    const [sendingAll, setSendingAll] = useState(false);
    const [chatwootLabeling, setChatwootLabeling] = useState(false);
    const [restingHours, setRestingHours] = useState(24);

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

    return {
        isTagModalOpen, setIsTagModalOpen,
        isConfirmBlockOpen, setIsConfirmBlockOpen,
        isBulkSendModalOpen, setIsBulkSendModalOpen,
        isChatwootLabelModalOpen, setIsChatwootLabelModalOpen,
        isConfirmRestOpen, setIsConfirmRestOpen,
        loadingBlock,
        loadingRest,
        taggingAll,
        sendingAll,
        chatwootLabeling,
        restingHours, setRestingHours,
        markContactsResolved,
        handleOpenTagModal,
        handleOpenBulkSendModal,
        handleBlockSelectedContacts,
        handleRestSelectedContacts,
        handleApplyChatwootLabel
    };
}
