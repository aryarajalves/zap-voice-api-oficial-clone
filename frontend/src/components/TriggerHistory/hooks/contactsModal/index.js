import { useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../../../config';
import { fetchWithAuth } from '../../../../AuthContext';
import { getContactPhone } from './contactUtils';
import { useContactsModalPagination } from './useContactsModalPagination';
import { useContactsSelection } from './useContactsSelection';
import { useContactsActions } from './useContactsActions';

export {
    getContactPhone,
    useContactsModalPagination,
    useContactsSelection,
    useContactsActions
};

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
    // 1. Paginação e contagem
    const pagination = useContactsModalPagination({
        contactsModal,
        contactsTotal,
        contactsPage,
        setContactsPage,
        contactsPerPage,
        setContactsPerPage,
        contactsFilter,
        contactsTypeFilter,
        contactsErrorFilter,
        setContactsSearchPhone,
        setContactsFilterDdi,
        setContactsFilterDdd,
        setContactsErrorFilter
    });

    const {
        currentPage,
        perPage,
        setPage,
        setPerPage,
        totalCount,
        totalPages,
        displayContacts,
        safeModalContacts,
        isClientSidePaging
    } = pagination;

    // Busca remota de todos os contatos do filtro atual
    const getAllTargetContacts = useCallback(async () => {
        if (!contactsModal.triggerId) return [];
        selection.setLoadingAllTarget(true);
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
            selection.setLoadingAllTarget(false);
        }
    }, [
        contactsModal.triggerId,
        contactsFilter,
        contactsTypeFilter,
        contactsErrorFilter,
        contactsSearchPhone,
        contactsFilterDdi,
        contactsFilterDdd,
        activeClient?.id
    ]);

    // 2. Seleção de contatos
    const selection = useContactsSelection({
        safeModalContacts,
        displayContacts,
        totalCount,
        isClientSidePaging,
        getAllTargetContacts
    });

    const {
        selectedPhones,
        setSelectedPhones,
        explainError,
        setExplainError,
        loadingAllTarget,
        isSelected,
        toggleSelectOne,
        toggleSelectAll,
        handleSelectAllTarget
    } = selection;

    // 3. Ações sobre contatos
    const actions = useContactsActions({
        contactsModal,
        setContactsModal,
        selectedPhones,
        setSelectedPhones,
        activeClient,
        onRefresh,
        getAllTargetContacts
    });

    const {
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
    } = actions;

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

export default useContactsModalLogic;
