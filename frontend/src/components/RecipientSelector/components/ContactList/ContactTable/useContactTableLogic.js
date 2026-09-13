import { useState, useMemo, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useTableDragScroll } from '../../../hooks/useTableDragScroll';
import { useContactTagsLookup } from '../../../hooks/useContactTagsLookup';
import { isVariableEmpty, isVariableNumeric } from '../VariableActionModal';

export function useContactTableLogic({
    displayedContacts = [],
    filteredContacts = [],
    removeContact,
    setDisplayLimit,
    setVariableFilters,
    setContacts
}) {
    // 1. Estados de Paginação
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);

    // 2. Estados de Seleção em Lote e Remoção
    const [selectedPhones, setSelectedPhones] = useState([]);
    const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

    // 3. Estados de Filtro de Variáveis e Modal de Ações
    const [varContentFilters, setVarContentFilters] = useState({});
    const [activeVarModal, setActiveVarModal] = useState({ isOpen: false, varKey: '', varLabel: '' });

    // 4. Arraste com o Botão Esquerdo do Mouse (Drag-to-Scroll)
    const { isDragging, dragProps } = useTableDragScroll();

    // Determinar a lista base de contatos (usar a lista filtrada completa se disponível)
    const baseContacts = useMemo(() => {
        if (filteredContacts && filteredContacts.length > 0) return filteredContacts;
        return displayedContacts;
    }, [filteredContacts, displayedContacts]);

    // Filtrar contatos pelo conteúdo de variáveis (ex: apenas números ou vazios)
    const contactsAfterVarFilters = useMemo(() => {
        const activeFilters = Object.entries(varContentFilters).filter(([_, mode]) => mode && mode !== 'all');
        if (activeFilters.length === 0) return baseContacts;

        return baseContacts.filter(c => {
            return activeFilters.every(([varKey, mode]) => {
                const rawVal = c.vars?.[varKey];
                const val = rawVal !== null && rawVal !== undefined ? String(rawVal).trim() : '';
                if (mode === 'empty') return isVariableEmpty(val);
                if (mode === 'numeric') return isVariableNumeric(val);
                return true;
            });
        });
    }, [baseContacts, varContentFilters]);

    // 5. Consulta de Etiquetas da Aba Contatos
    const {
        showContactTags,
        isLoadingTags,
        contactsTagsMap,
        toggleShowContactTags
    } = useContactTagsLookup({ contacts: contactsAfterVarFilters });

    const totalItems = contactsAfterVarFilters.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

    // Garantir que a página atual seja válida caso os filtros ou limite mudem
    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(1);
        }
    }, [totalPages, currentPage]);

    // Reseta a página para 1 quando o limite de itens por página muda
    const handleItemsPerPageChange = (e) => {
        const newLimit = Number(e.target.value);
        setItemsPerPage(newLimit);
        setCurrentPage(1);
        if (setDisplayLimit) {
            setDisplayLimit(newLimit);
        }
    };

    // Calcular os contatos visíveis na página atual
    const pageContacts = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return contactsAfterVarFilters.slice(start, start + itemsPerPage);
    }, [contactsAfterVarFilters, currentPage, itemsPerPage]);

    // Handlers de Seleção em Lote
    const isAllPageSelected = useMemo(() => {
        if (pageContacts.length === 0) return false;
        return pageContacts.every(c => selectedPhones.includes(c.phone));
    }, [pageContacts, selectedPhones]);

    const handleToggleSelectPage = (checked) => {
        if (checked) {
            const pagePhones = pageContacts.map(c => c.phone);
            setSelectedPhones(prev => Array.from(new Set([...prev, ...pagePhones])));
        } else {
            const pagePhonesSet = new Set(pageContacts.map(c => c.phone));
            setSelectedPhones(prev => prev.filter(phone => !pagePhonesSet.has(phone)));
        }
    };

    const handleToggleSelectPhone = (phone) => {
        setSelectedPhones(prev => prev.includes(phone) ? prev.filter(p => p !== phone) : [...prev, phone]);
    };

    const handleSelectAllFiltered = () => {
        if (selectedPhones.length === totalItems) {
            setSelectedPhones([]);
        } else {
            const allPhones = contactsAfterVarFilters.map(c => c.phone);
            setSelectedPhones(allPhones);
        }
    };

    const handleConfirmBulkDelete = () => {
        if (selectedPhones.length === 0) return;
        const count = selectedPhones.length;
        const selectedSet = new Set(selectedPhones);

        if (setContacts) {
            setContacts(prev => prev.filter(c => !selectedSet.has(c.phone)));
        } else if (removeContact) {
            selectedPhones.forEach(phone => removeContact(phone));
        }

        setSelectedPhones([]);
        setShowBulkDeleteModal(false);
        toast.success(`${count} contato${count > 1 ? 's' : ''} removido${count > 1 ? 's' : ''} da lista com sucesso!`);
    };

    const handleCopyPhone = (phone) => {
        if (navigator?.clipboard?.writeText) {
            navigator.clipboard.writeText(phone);
            toast.success(`Número ${phone} copiado!`, { id: `copy-${phone}`, duration: 2000 });
        }
    };

    const handleVarChange = (phone, varKey, value) => {
        if (!setContacts) return;
        setContacts(prev => prev.map(c => {
            if (c.phone === phone) {
                const newVars = { ...c.vars, [varKey]: value };
                return { ...c, vars: newVars };
            }
            return c;
        }));
    };

    const toggleVarFilter = (varKey) => {
        if (!setVariableFilters) return;
        setVariableFilters(prev => {
            const current = prev[varKey] || 'full';
            const next = current === 'full' ? 'first_name' : 'full';
            return { ...prev, [varKey]: next };
        });
    };

    const handleSetVarContentFilter = (varKey, filterMode) => {
        setVarContentFilters(prev => ({
            ...prev,
            [varKey]: filterMode
        }));
        setCurrentPage(1);
    };

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

    return {
        currentPage,
        setCurrentPage,
        itemsPerPage,
        setItemsPerPage,
        selectedPhones,
        setSelectedPhones,
        showBulkDeleteModal,
        setShowBulkDeleteModal,
        varContentFilters,
        setVarContentFilters,
        activeVarModal,
        setActiveVarModal,
        isDragging,
        dragProps,
        baseContacts,
        contactsAfterVarFilters,
        showContactTags,
        isLoadingTags,
        contactsTagsMap,
        toggleShowContactTags,
        totalItems,
        totalPages,
        pageContacts,
        isAllPageSelected,
        startIndex,
        endIndex,
        handleItemsPerPageChange,
        handleToggleSelectPage,
        handleToggleSelectPhone,
        handleSelectAllFiltered,
        handleConfirmBulkDelete,
        handleCopyPhone,
        handleVarChange,
        toggleVarFilter,
        handleSetVarContentFilter
    };
}
