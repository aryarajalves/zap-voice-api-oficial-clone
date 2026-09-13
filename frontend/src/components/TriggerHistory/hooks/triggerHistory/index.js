import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../../../config';
import { fetchWithAuth } from '../../../../AuthContext';
import { useClient } from '../../../../contexts/ClientContext';
import { useAuth } from '../../../../AuthContext';
import { useTriggerModals } from '../useTriggerModals';
import { useTriggerActions } from '../useTriggerActions';
import { useFolders } from '../useFolders';

import { useTriggerHistoryFilters } from './useTriggerHistoryFilters';
import { useTriggerHistorySync } from './useTriggerHistorySync';
import { useTriggerContactsLoader } from './useTriggerContactsLoader';
import { useTriggerNavigation } from './useTriggerNavigation';

export {
    useTriggerHistoryFilters,
    useTriggerHistorySync,
    useTriggerContactsLoader,
    useTriggerNavigation
};

export const useTriggerHistory = (refreshKey, initialTriggerType = 'bulk') => {
    const { activeClient } = useClient();
    const { user } = useAuth();
    
    const [triggers, setTriggers] = useState([]);
    const [loading, setLoading] = useState(true);
    const hasLoadedOnce = useRef(false);
    const [monitoringTrigger, setMonitoringTrigger] = useState(null);

    // 1. Modais de suporte
    const {
        modalConfig, setModalConfig,
        contactsModal, setContactsModal,
        editParamsModal, setEditParamsModal,
        errorModal, setErrorModal,
        childrenModal, setChildrenModal
    } = useTriggerModals();

    // 2. Filtros e paginação da lista principal
    const filterState = useTriggerHistoryFilters(initialTriggerType);
    const {
        triggerType, setTriggerType,
        filterName, setFilterName,
        dateRange, setDateRange,
        filterStatus, setFilterStatus,
        customStart, setCustomStart,
        customEnd, setCustomEnd,
        showTechnical, setShowTechnical,
        itemsPerPage, setItemsPerPage,
        page, setPage,
        totalPages, setTotalPages,
        totalItems, setTotalItems,
        showOnlyPinned, setShowOnlyPinned,
        selectedFolderId, setSelectedFolderId,
        sortBy, setSortBy,
        selectedIds, setSelectedIds
    } = filterState;

    useEffect(() => {
        setTriggerType(initialTriggerType);
    }, [initialTriggerType]);

    // 3. Busca do histórico de disparos
    const fetchHistory = useCallback(async () => {
        if (!activeClient) return;
        if (!hasLoadedOnce.current) setLoading(true);
        try {
            const skip = (page - 1) * itemsPerPage;
            let url = `${API_URL}/triggers?limit=${itemsPerPage}&skip=${skip}`;

            if (filterName) url += `&funnel_name=${encodeURIComponent(filterName)}`;
            if (filterStatus && filterStatus !== 'all') url += `&status=${filterStatus}`;
            if (showTechnical) url += `&show_technical=true`;
            if (showOnlyPinned) url += `&pinned_only=true`;
            if (selectedFolderId) url += `&folder_id=${selectedFolderId}`;
            if (sortBy && sortBy !== 'recent') url += `&sort_by=${sortBy}`;

            const now = new Date();
            let start = null;
            let end = null;
            if (dateRange === 'today') {
                start = new Date(now.setHours(0, 0, 0, 0));
                end = new Date(now.setHours(23, 59, 59, 999));
            } else if (dateRange === '7days') {
                start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            } else if (dateRange === '14days') {
                start = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
            } else if (dateRange === 'month') {
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            } else if (dateRange === 'custom') {
                if (customStart) start = new Date(customStart);
                if (customEnd) end = new Date(customEnd);
            }

            if (start) url += `&start_date=${start.toISOString()}`;
            if (end) url += `&end_date=${end.toISOString()}`;

            if (triggerType && triggerType !== 'all') {
                url += `&trigger_type=${triggerType}`;
            }

            const res = await fetchWithAuth(url, {}, activeClient?.id);
            if (!res.ok) throw new Error("Falha ao carregar histórico");
            const data = await res.json();

            if (data && Array.isArray(data.items)) {
                setTriggers(data.items);
                setTotalItems(typeof data.total === 'number' ? data.total : data.items.length);
                setTotalPages(data.total ? Math.ceil(data.total / itemsPerPage) : 1);
            } else if (Array.isArray(data)) {
                setTriggers(data);
                setTotalItems(data.length);
                setTotalPages(1);
            } else {
                setTriggers([]);
                setTotalItems(0);
                setTotalPages(1);
            }
            hasLoadedOnce.current = true;
        } catch (error) {
            console.error(error);
            toast.error("Erro ao carregar histórico de disparos");
        } finally {
            setLoading(false);
        }
    }, [
        activeClient,
        page,
        itemsPerPage,
        filterName,
        filterStatus,
        dateRange,
        triggerType,
        customStart,
        customEnd,
        showTechnical,
        showOnlyPinned,
        selectedFolderId,
        sortBy,
        refreshKey
    ]);

    // 4. Ações sobre disparos (cancelar, pausar, deletar, fixar, etc)
    const {
        handleDelete,
        handleCancel,
        handleAction,
        handleBulkDeleteAction,
        handleStartNow,
        handleRetry,
        handleSyncStats,
        handleTogglePin
    } = useTriggerActions({
        activeClient,
        setTriggers,
        fetchHistory,
        setModalConfig,
        setSelectedIds,
        setMonitoringTrigger,
        selectedIds
    });

    // 5. Pastas
    const {
        folders,
        loadingFolders,
        fetchFolders,
        createFolder,
        updateFolder,
        deleteFolder,
        moveTriggerToFolder,
        bulkMoveToFolder
    } = useFolders({
        activeClient,
        setTriggers,
        fetchHistory,
        setSelectedIds,
        selectedFolderId,
        setSelectedFolderId
    });

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory, refreshKey]);

    // 6. WebSocket e sincronização em background
    useTriggerHistorySync({
        activeClient,
        monitoringTrigger,
        setMonitoringTrigger,
        fetchHistory,
        setTriggers,
        setChildrenModal
    });

    // 7. Navegação e modais de detalhe (erros, funis filhos, pipeline, edição de parâmetros)
    const {
        fetchErrors,
        fetchChildren,
        handleViewPipeline,
        handleEditParams
    } = useTriggerNavigation({
        activeClient,
        setMonitoringTrigger,
        setErrorModal,
        setChildrenModal,
        setEditParamsModal
    });

    // 8. Carregador e filtros de contatos de um disparo
    const contactsLoader = useTriggerContactsLoader({
        activeClient,
        contactsModal,
        setContactsModal,
        setTriggers
    });

    const {
        contactsFilter, setContactsFilter,
        contactsTypeFilter, setContactsTypeFilter,
        contactsErrorFilter, setContactsErrorFilter,
        contactsSearchPhone, setContactsSearchPhone,
        contactsFilterDdi, setContactsFilterDdi,
        contactsFilterDdd, setContactsFilterDdd,
        contactsDdiOptions, contactsDddOptions,
        loadingContacts,
        contactsPage, setContactsPage,
        contactsPerPage, setContactsPerPage,
        contactsTotal,
        fetchTriggerContacts,
        handleViewContacts
    } = contactsLoader;

    // Seleção de cards/linhas
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds((Array.isArray(triggers) ? triggers : []).map(t => t.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (id) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    return {
        user, activeClient, triggers, setTriggers, loading, monitoringTrigger, setMonitoringTrigger,
        modalConfig, setModalConfig, contactsModal, setContactsModal, contactsFilter, setContactsFilter,
        contactsTypeFilter, setContactsTypeFilter, contactsErrorFilter, setContactsErrorFilter, loadingContacts, editParamsModal, setEditParamsModal,
        errorModal, setErrorModal, childrenModal, setChildrenModal, selectedIds, setSelectedIds,
        filterName, setFilterName, dateRange, setDateRange, filterStatus, setFilterStatus,
        triggerType, setTriggerType, customStart, setCustomStart, customEnd, setCustomEnd,
        showTechnical, setShowTechnical, itemsPerPage, setItemsPerPage, page, setPage,
        showOnlyPinned, setShowOnlyPinned,
        selectedFolderId, setSelectedFolderId,
        folders, loadingFolders, fetchFolders, createFolder, updateFolder, deleteFolder,
        moveTriggerToFolder, bulkMoveToFolder,
        totalPages, totalItems, fetchHistory, handleDelete, handleCancel, handleAction,
        handleBulkDeleteAction, handleStartNow, handleRetry, handleSyncStats, handleTogglePin, fetchErrors, fetchChildren,
        handleViewPipeline, fetchTriggerContacts, handleSelectAll, handleSelectOne,
        handleViewContacts, handleEditParams,
        contactsPage, setContactsPage, contactsPerPage, setContactsPerPage, contactsTotal,
        contactsSearchPhone, setContactsSearchPhone,
        contactsFilterDdi, setContactsFilterDdi,
        contactsFilterDdd, setContactsFilterDdd,
        contactsDdiOptions, contactsDddOptions,
        sortBy, setSortBy
    };
};

export default useTriggerHistory;
