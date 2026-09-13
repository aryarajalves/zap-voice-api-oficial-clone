import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { getContactPhone } from './contactUtils';

export function useContactsSelection({
    safeModalContacts,
    displayContacts,
    totalCount,
    isClientSidePaging,
    getAllTargetContacts
}) {
    const [selectedPhones, setSelectedPhones] = useState([]);
    const [explainError, setExplainError] = useState(null);
    const [loadingAllTarget, setLoadingAllTarget] = useState(false);

    const isSelected = useCallback((contact) => {
        const phone = getContactPhone(contact);
        return phone ? selectedPhones.includes(phone) : false;
    }, [selectedPhones]);

    const toggleSelectOne = useCallback((contact) => {
        if (contact.failure_resolution) return; // já resolvido — travado, não pode selecionar
        const phone = getContactPhone(contact);
        if (!phone) return;
        setSelectedPhones(prev =>
            prev.includes(phone) ? prev.filter(p => p !== phone) : [...prev, phone]
        );
    }, []);

    const toggleSelectAll = useCallback(() => {
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
    }, [displayContacts, selectedPhones]);

    const handleSelectAllTarget = useCallback(async () => {
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
    }, [selectedPhones, totalCount, displayContacts, isClientSidePaging, safeModalContacts, getAllTargetContacts]);

    return {
        selectedPhones,
        setSelectedPhones,
        explainError,
        setExplainError,
        loadingAllTarget,
        setLoadingAllTarget,
        isSelected,
        toggleSelectOne,
        toggleSelectAll,
        handleSelectAllTarget
    };
}
