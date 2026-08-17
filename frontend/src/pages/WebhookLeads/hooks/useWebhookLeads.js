import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../../config';
import { fetchWithAuth } from '../../../AuthContext';

// Sub-módulos e utilitários
import { resolveDateRange } from './utils/dateRangeResolver';
import { buildLeadsQueryParams } from './utils/leadsQueryHelpers';
import { useLeadSelection } from './useLeadSelection';
import { useLeadModals } from './useLeadModals';
import { useLeadActions } from './useLeadActions';

export function useWebhookLeads(activeClient) {
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(50);
  
  // Filtros base
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [eventType, setEventType] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [excludedTags, setExcludedTags] = useState([]);
  const [importedByClientId, setImportedByClientId] = useState('');
  const [origin, setOrigin] = useState('');
  const [lockedFilter, setLockedFilter] = useState('');
  const [bsudFilter, setBsudFilter] = useState('');
  const [filterDdi, setFilterDdiState] = useState('');
  const [filterDdd, setFilterDddState] = useState('');
  
  // Opções dinâmicas de DDI/DDD e status
  const [ddiOptions, setDdiOptions] = useState([]);
  const [dddOptions, setDddOptions] = useState([]);
  const [blockStatusFilter, setBlockStatusFilterState] = useState('');
  const [hasBlockedLeads, setHasBlockedLeads] = useState(false);
  const [hasRestingLeads, setHasRestingLeads] = useState(false);
  const [availableFilters, setAvailableFilters] = useState({ event_types: [], product_names: [], tags: [], imported_by_clients: [] });

  // Filtros de data
  const [datePreset, setDatePreset] = useState('');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');

  // Sub-hooks modulares
  const {
    selectedLeads, setSelectedLeads,
    selectAllPages, setSelectAllPages,
    handleSelectAll, handleSelectLead,
    handleSelectAllPages, handleClearSelectAllPages
  } = useLeadSelection(leads);

  const {
    isDeleteModalOpen, setIsDeleteModalOpen,
    leadToDelete, setLeadToDelete,
    isDeleting, setIsDeleting,
    isImportModalOpen, setIsImportModalOpen,
    isCreateModalOpen, setIsCreateModalOpen,
    isEditModalOpen, setIsEditModalOpen,
    leadToEdit, setLeadToEdit,
    isExportModalOpen, setIsExportModalOpen,
    isExporting, setIsExporting,
    exportStatus, setExportStatus,
    exportError, setExportError,
    handleCloseExportModal,
    isCleaningTags, setIsCleaningTags,
    isCleanConfirmOpen, setIsCleanConfirmOpen,
    isBulkTagModalOpen, setIsBulkTagModalOpen,
    isBulkTagging, setIsBulkTagging,
    blockTarget, isBlocking, setIsBlocking,
    handleOpenBlockModal, closeBlockModal
  } = useLeadModals();

  const getActiveFilterState = useCallback((overrides = {}) => ({
    search: overrides.search !== undefined ? overrides.search : debouncedSearch,
    eventType: overrides.eventType !== undefined ? overrides.eventType : eventType,
    selectedTags: overrides.tags !== undefined ? overrides.tags : selectedTags,
    excludedTags: overrides.excludedTags !== undefined ? overrides.excludedTags : excludedTags,
    skip: (overrides.page !== undefined ? overrides.page : page) * limit,
    limit,
    datePreset: overrides.datePreset !== undefined ? overrides.datePreset : datePreset,
    customDateFrom: overrides.customDateFrom !== undefined ? overrides.customDateFrom : customDateFrom,
    customDateTo: overrides.customDateTo !== undefined ? overrides.customDateTo : customDateTo,
    importedByClientId: overrides.importedByClientId !== undefined ? overrides.importedByClientId : importedByClientId,
    origin: overrides.origin !== undefined ? overrides.origin : origin,
    lockedFilter: overrides.lockedFilter !== undefined ? overrides.lockedFilter : lockedFilter,
    bsudFilter: overrides.bsudFilter !== undefined ? overrides.bsudFilter : bsudFilter,
    filterDdi: overrides.filterDdi !== undefined ? overrides.filterDdi : filterDdi,
    filterDdd: overrides.filterDdd !== undefined ? overrides.filterDdd : filterDdd,
    blockStatusFilter: overrides.blockStatusFilter !== undefined ? overrides.blockStatusFilter : blockStatusFilter,
  }), [debouncedSearch, eventType, selectedTags, excludedTags, page, limit, datePreset, customDateFrom, customDateTo, importedByClientId, origin, lockedFilter, bsudFilter, filterDdi, filterDdd, blockStatusFilter]);

  const fetchLeads = useCallback(async (overrides = {}) => {
    if (!activeClient?.id) return;
    const filterState = getActiveFilterState(overrides);
    const queryString = buildLeadsQueryParams(filterState);

    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/leads?${queryString}`, {}, activeClient.id);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.items || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar leads.");
    } finally {
      setLoading(false);
    }
  }, [activeClient?.id, getActiveFilterState]);

  const fetchFilters = useCallback(async () => {
    if (!activeClient?.id) return;
    try {
      const res = await fetchWithAuth(`${API_URL}/leads/filters`, {}, activeClient.id);
      if (res.ok) {
        const data = await res.json();
        setAvailableFilters(data);
      }
    } catch (err) {
      console.error(err);
    }
  }, [activeClient?.id]);

  const fetchDdiDddOptions = useCallback(async (overrides = {}) => {
    if (!activeClient?.id) return;
    const filterState = getActiveFilterState(overrides);
    const { from, to } = resolveDateRange(filterState.datePreset, filterState.customDateFrom, filterState.customDateTo);

    try {
      let url = `${API_URL}/leads/ddi-ddd-filters?`;
      if (filterState.search) url += `&search=${encodeURIComponent(filterState.search)}`;
      if (filterState.eventType) url += `&event_type=${encodeURIComponent(filterState.eventType)}`;
      if (filterState.importedByClientId) url += `&imported_by_client_id=${filterState.importedByClientId}`;
      if (filterState.origin) url += `&origin=${encodeURIComponent(filterState.origin)}`;
      if (filterState.lockedFilter !== '') url += `&is_locked=${filterState.lockedFilter}`;
      if (filterState.bsudFilter !== '') url += `&has_bsud=${filterState.bsudFilter}`;
      if (filterState.selectedTags?.length > 0) {
        filterState.selectedTags.forEach(t => { url += `&tag=${encodeURIComponent(t)}`; });
      }
      if (from) url += `&date_from=${from}`;
      if (to) url += `&date_to=${to}`;

      const res = await fetchWithAuth(url, {}, activeClient.id);
      if (res.ok) {
        const data = await res.json();
        setDdiOptions(data.ddis || []);
        setDddOptions(data.ddds || []);
        setHasBlockedLeads(!!data.has_blocked);
        setHasRestingLeads(!!data.has_resting);
      }
    } catch (err) {
      console.error(err);
    }
  }, [activeClient?.id, getActiveFilterState]);

  // Setters com reset de página
  const setFilterDdi = (val) => { setFilterDdiState(val); setPage(0); };
  const setFilterDdd = (val) => { setFilterDddState(val); setPage(0); };
  const setBlockStatusFilter = (val) => { setBlockStatusFilterState(val); setPage(0); };

  useEffect(() => {
    setPage(0);
  }, [
    debouncedSearch, eventType, selectedTags, importedByClientId, origin,
    lockedFilter, bsudFilter, filterDdi, filterDdd, blockStatusFilter,
    datePreset, customDateFrom, customDateTo
  ]);

  useEffect(() => {
    if (activeClient?.id) {
      fetchLeads();
      fetchFilters();
    } else {
      setLoading(false);
    }
  }, [activeClient?.id, page, debouncedSearch, eventType, selectedTags, limit, datePreset, customDateFrom, customDateTo, importedByClientId, origin, lockedFilter, bsudFilter, filterDdi, filterDdd, blockStatusFilter, fetchLeads, fetchFilters]);

  useEffect(() => {
    if (activeClient?.id) {
      fetchDdiDddOptions();
    }
  }, [activeClient?.id, debouncedSearch, eventType, selectedTags, datePreset, customDateFrom, customDateTo, importedByClientId, origin, lockedFilter, bsudFilter, fetchDdiDddOptions]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 600);
    return () => clearTimeout(timer);
  }, [search]);

  // Sub-hook de ações e mutações
  const {
    handleCleanTags,
    handleExport,
    executeDelete,
    handleBulkTag,
    handleConfirmBlock,
    handleUnblockSelected,
    handleUnblockSingle,
  } = useLeadActions({
    activeClient,
    getActiveFilterState,
    selectedLeads,
    setSelectedLeads,
    selectAllPages,
    setSelectAllPages,
    fetchLeads,
    fetchFilters,
    fetchDdiDddOptions,
    total,
    search,
    leadToDelete,
    setLeadToDelete,
    setIsDeleting,
    setIsDeleteModalOpen,
    setIsExportModalOpen,
    setIsExporting,
    setExportStatus,
    setExportError,
    setIsCleaningTags,
    setIsCleanConfirmOpen,
    setIsBulkTagging,
    setIsBulkTagModalOpen,
    blockTarget,
    closeBlockModal,
    setIsBlocking
  });

  const handleSetDatePreset = (val) => { setDatePreset(val); setPage(0); };
  const handleSetCustomDateFrom = (val) => { setCustomDateFrom(val); setPage(0); };
  const handleSetCustomDateTo = (val) => { setCustomDateTo(val); setPage(0); };

  const handleClearDateFilters = () => {
    setDatePreset('');
    setCustomDateFrom('');
    setCustomDateTo('');
    setPage(0);
  };

  const updateLeadInPlace = useCallback((leadId, updates) => {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...updates } : l));
  }, []);

  return {
    leads, total, loading, page, setPage, limit, setLimit,
    search, setSearch, eventType, setEventType, selectedTags, setSelectedTags, excludedTags, setExcludedTags, availableFilters,
    importedByClientId, setImportedByClientId,
    origin, setOrigin,
    lockedFilter, setLockedFilter,
    bsudFilter, setBsudFilter,
    filterDdi, setFilterDdi,
    filterDdd, setFilterDdd,
    ddiOptions, dddOptions,
    blockStatusFilter, setBlockStatusFilter,
    hasBlockedLeads, hasRestingLeads,
    datePreset, setDatePreset: handleSetDatePreset,
    customDateFrom, setCustomDateFrom: handleSetCustomDateFrom,
    customDateTo, setCustomDateTo: handleSetCustomDateTo,
    handleClearDateFilters,
    selectedLeads, setSelectedLeads, isDeleteModalOpen, setIsDeleteModalOpen, leadToDelete, setLeadToDelete, isDeleting,
    isImportModalOpen, setIsImportModalOpen, isCreateModalOpen, setIsCreateModalOpen,
    isEditModalOpen, setIsEditModalOpen, leadToEdit, setLeadToEdit,
    isCleaningTags, isCleanConfirmOpen, setIsCleanConfirmOpen,
    selectAllPages, handleSelectAllPages, handleClearSelectAllPages,
    fetchLeads, fetchFilters, handleCleanTags, handleExport, executeDelete, handleSelectAll, handleSelectLead,
    updateLeadInPlace,
    isExportModalOpen, setIsExportModalOpen, isExporting, exportStatus, exportError, handleCloseExportModal,
    isBulkTagModalOpen, setIsBulkTagModalOpen, isBulkTagging, handleBulkTag,
    blockTarget, handleOpenBlockModal, closeBlockModal, handleConfirmBlock, handleUnblockSelected, handleUnblockSingle, isBlocking
  };
}
