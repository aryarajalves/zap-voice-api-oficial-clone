import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { API_URL, WS_URL } from '../../../config';
import { fetchWithAuth } from '../../../AuthContext';
import { useClient } from '../../../contexts/ClientContext';
import { useAuth } from '../../../AuthContext';
import { useTriggerModals } from './useTriggerModals';
import { useTriggerActions } from './useTriggerActions';
import { useFolders } from './useFolders';
import { handleWebSocketMessage, fetchErrorsHelper, fetchChildrenHelper } from '../utils/triggerHistoryUtils';
import { getAvailableDdiDdd } from '../../../utils/dddInfo';


export const useTriggerHistory = (refreshKey, initialTriggerType = 'bulk') => {
    const { activeClient } = useClient();
    const { user } = useAuth();
    
    const [triggers, setTriggers] = useState([]);
    const [loading, setLoading] = useState(true);
    const hasLoadedOnce = useRef(false);
    const [monitoringTrigger, setMonitoringTrigger] = useState(null);
    const [triggerType, setTriggerType] = useState(initialTriggerType);

    // Auto-refresh do pipeline modal enquanto o trigger ainda está em execução ou suspenso/falhado
    useEffect(() => {
        const ACTIVE_STATUSES = ['processing', 'queued', 'suspended', 'failed'];
        if (!monitoringTrigger || !ACTIVE_STATUSES.includes(monitoringTrigger.status)) return;

        const interval = setInterval(async () => {
            try {
                const res = await fetchWithAuth(`${API_URL}/triggers/${monitoringTrigger.id}`, {}, activeClient?.id);
                if (res.ok) {
                    const updated = await res.json();
                    setMonitoringTrigger(updated);
                    // Para o polling quando o trigger concluiu
                    if (!ACTIVE_STATUSES.includes(updated.status)) {
                        clearInterval(interval);
                    }
                }
            } catch (_) {
                // Silencioso — não interrompe a UI por falha de refresh
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [monitoringTrigger?.id, monitoringTrigger?.status, activeClient?.id]);

    useEffect(() => {
        setTriggerType(initialTriggerType);
    }, [initialTriggerType]);

    
    // Hooks modularizados
    const {
        modalConfig, setModalConfig,
        contactsModal, setContactsModal,
        editParamsModal, setEditParamsModal,
        errorModal, setErrorModal,
        childrenModal, setChildrenModal
    } = useTriggerModals();

    // Filter & Pagination States
    const [contactsFilter, setContactsFilter] = useState('all');
    const [contactsTypeFilter, setContactsTypeFilter] = useState('all');
    const [contactsErrorFilter, setContactsErrorFilter] = useState('all');
    const [contactsSearchPhone, setContactsSearchPhone] = useState('');
    const [contactsFilterDdi, setContactsFilterDdi] = useState('');
    const [contactsFilterDdd, setContactsFilterDdd] = useState('');
    // Opções de DDI/DDD calculadas dinamicamente a partir dos contatos que
    // batem com os filtros atuais (status/tipo/busca) — nunca uma lista fixa.
    const [contactsDdiOptions, setContactsDdiOptions] = useState([]);
    const [contactsDddOptions, setContactsDddOptions] = useState([]);
    const [loadingContacts, setLoadingContacts] = useState(false);
    const [contactsPage, setContactsPage] = useState(1);
    const [contactsPerPage, setContactsPerPage] = useState(20);
    const [contactsTotal, setContactsTotal] = useState(0);
    const [selectedIds, setSelectedIds] = useState([]);
    const [filterName, setFilterName] = useState('');
    const [dateRange, setDateRange] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [showTechnical, setShowTechnical] = useState(false);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [showOnlyPinned, setShowOnlyPinned] = useState(false);
    const [selectedFolderId, setSelectedFolderId] = useState(null);
    const [sortBy, setSortBy] = useState('recent'); // 'recent' ou 'largest'

    const fetchHistory = useCallback(async () => {
        if (!activeClient) return;
        // Só mostra loading visual na primeira carga; refreshes seguintes são silenciosos
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
    }, [activeClient, page, itemsPerPage, filterName, filterStatus, dateRange, triggerType, customStart, customEnd, showTechnical, showOnlyPinned, selectedFolderId, sortBy, refreshKey]);

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

    // WebSocket handling
    useEffect(() => {
        let ws;
        const wsBase = WS_URL.endsWith('/ws') ? WS_URL : `${WS_URL}/ws`;
        const wsToken = localStorage.getItem('token');
        const wsFinalUrl = wsToken ? `${wsBase}?token=${wsToken}` : wsBase;

        try {
            ws = new WebSocket(wsFinalUrl);
            ws.onmessage = (event) => {
                try {
                    const payload = JSON.parse(event.data);
                    handleWebSocketMessage(payload, activeClient, setTriggers, setChildrenModal);
                } catch (e) {}
            };
        } catch (e) {}
        const interval = setInterval(fetchHistory, 60000);
        return () => {
            if (ws) ws.close();
            clearInterval(interval);
        };
    }, [activeClient?.id, fetchHistory]);

    // Internal logic helpers
    const fetchErrors = async (triggerId) => {
        await fetchErrorsHelper(triggerId, activeClient?.id, setErrorModal);
    };

    const fetchChildren = async (trigger, filterType = 'all', silent = false) => {
        await fetchChildrenHelper(trigger, activeClient?.id, setChildrenModal, filterType, silent);
    };

    const handleViewPipeline = async (triggerId) => {
        if (!triggerId) return;
        try {
            const res = await fetchWithAuth(`${API_URL}/triggers/${triggerId}`, {}, activeClient?.id);
            if (res.ok) {
                const data = await res.json();
                setMonitoringTrigger(data);
            } else {
                toast.error("Erro ao carregar pipeline");
            }
        } catch (e) {
            toast.error("Erro ao conectar ao servidor");
        }
    };

    const fetchTriggerContacts = async () => {
        if (!contactsModal.triggerId) return;
        setLoadingContacts(true);
        try {
            let url = `${API_URL}/triggers/${contactsModal.triggerId}/messages`;
            const params = new URLSearchParams();

            if (contactsFilter === 'total') {
                const resT = await fetchWithAuth(`${API_URL}/triggers/${contactsModal.triggerId}`, {}, activeClient?.id);
                if (resT.ok) {
                    const trig = await resT.json();
                    const raw = trig.contacts_list || [];

                    // Formata primeiro para poder filtrar por telefone/DDI/DDD (a lista "total"
                    // vem crua de trig.contacts_list e não passava pelos filtros — bug corrigido aqui).
                    const allFormatted = raw.map(c => {
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

                    const cleanSearch = contactsSearchPhone ? contactsSearchPhone.replace(/\D/g, '') : '';
                    const cleanDdi = contactsFilterDdi ? contactsFilterDdi.replace(/\D/g, '') : '';
                    const cleanDdd = contactsFilterDdd ? contactsFilterDdd.replace(/\D/g, '') : '';

                    const filtered = allFormatted.filter(c => {
                        const digits = (c.phone_number || '').replace(/\D/g, '');
                        if (cleanSearch && !digits.includes(cleanSearch)) return false;
                        if (cleanDdi && !digits.startsWith(cleanDdi)) return false;
                        if (cleanDdd && !(digits.startsWith(`55${cleanDdd}`) || digits.startsWith(cleanDdd))) return false;
                        return true;
                    });

                    const start = (contactsPage - 1) * contactsPerPage;
                    const paginated = filtered.slice(start, start + contactsPerPage);

                    // Opções do dropdown = DDI/DDD presentes em TODOS os contatos que já
                    // batem com busca por telefone (mas ainda sem aplicar o filtro de
                    // DDI/DDD em si — senão, ao selecionar um DDD o dropdown "encolheria"
                    // para mostrar só ele mesmo).
                    const optionsSource = cleanSearch
                        ? allFormatted.filter(c => (c.phone_number || '').replace(/\D/g, '').includes(cleanSearch))
                        : allFormatted;
                    const { ddis, ddds } = getAvailableDdiDdd(optionsSource.map(c => c.phone_number));
                    if (!contactsFilterDdi) setContactsDdiOptions(ddis);
                    if (!contactsFilterDdd) setContactsDddOptions(ddds);

                    setContactsTotal(filtered.length);
                    setContactsModal(prev => ({
                        ...prev,
                        contacts: paginated,
                        counts: { total: filtered.length }
                    }));
                    setLoadingContacts(false);
                    return;
                }
            }



            if (contactsFilter !== 'all') params.append('status_filter', contactsFilter);
            if (contactsTypeFilter !== 'all') params.append('message_type', contactsTypeFilter);
            if ((contactsFilter === 'failed' || contactsFilter === 'blocked') && contactsErrorFilter !== 'all') {
                params.append('failure_reason', contactsErrorFilter);
            }
            if (contactsSearchPhone) params.append('search_phone', contactsSearchPhone);
            if (contactsFilterDdi) params.append('filter_ddi', contactsFilterDdi);
            if (contactsFilterDdd) params.append('filter_ddd', contactsFilterDdd);
            
            params.append('limit', contactsPerPage);
            params.append('skip', (contactsPage - 1) * contactsPerPage);
            const queryString = params.toString();
            if (queryString) url += `?${queryString}`;

            const res = await fetchWithAuth(url, {}, activeClient?.id);
            if (res.ok) {
                const data = await res.json();
                setContactsTotal(typeof data.total === 'number' ? data.total : (data.counts?.all || 0));
                setContactsModal(prev => ({
                    ...prev,
                    contacts: data.items || [],
                    counts: data.counts || {},
                    failureReasons: data.failure_reasons || []
                }));

                // Popula DDI e DDD a partir dos contatos recebidos (sem encolher opções se um filtro estiver ativo)
                const phones = (data.items || []).map(i => i.phone_number || i.phone).filter(Boolean);
                const { ddis, ddds } = getAvailableDdiDdd(phones);
                if (!contactsFilterDdi) setContactsDdiOptions(ddis);
                if (!contactsFilterDdd) setContactsDddOptions(ddds);

                // Atualiza a linha na lista usando os contadores já calculados e retornados pelo backend
                if (data.counts) {
                    const countsPatch = {
                        total_sent: data.counts.sent,
                        total_delivered: data.counts.delivered,
                        total_read: data.counts.read,
                        total_interactions: data.counts.interaction,
                        total_failed: data.counts.failed,
                        total_blocked: data.counts.blocked,
                        queue_count: data.counts.queue,
                        total_contacts: data.counts.all
                    };
                    setTriggers(prev => prev.map(t => t.id === contactsModal.triggerId ? { ...t, ...countsPatch } : t));
                }
            }
        } catch (e) {
            console.error("Erro ao carregar lista de contatos:", e);
            toast.error("Erro ao carregar lista de contatos: " + e.message);
        } finally {
            setLoadingContacts(false);
        }
    };

    useEffect(() => {
        if (contactsModal.isOpen && contactsModal.triggerId) {
            fetchTriggerContacts();
        }
    }, [contactsFilter, contactsTypeFilter, contactsErrorFilter, contactsSearchPhone, contactsFilterDdi, contactsFilterDdd, contactsModal.isOpen, contactsModal.triggerId, contactsPage, contactsPerPage]);

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

    const handleViewContacts = (trigger, initialFilter = 'all') => {
        const filterLabels = { total: 'Total na Lista', sent: 'Enviados', queue: 'Fila (Meta)', delivered: 'Recebidas', read: 'Lidos', failed: 'Falhas', interaction: 'Interações', blocked: 'Bloqueados', skipped: 'Pulados (24h)', free: 'Gratuitas', template: 'Templates', private_note: 'Notas Privadas' };
        setContactsFilter(initialFilter);
        setContactsPage(1); // Resetar para página 1 ao abrir
        setContactsPerPage(20); // Resetar para 20 itens por página (menor valor) ao abrir popup
        setContactsErrorFilter('all');
        const label = filterLabels[initialFilter];
        setContactsModal({
            isOpen: true,
            title: label ? `${label} — ${trigger.funnel?.name || trigger.template_name || 'Envio em Massa'}` : `Contatos — ${trigger.funnel?.name || 'Envio em Massa'}`,
            triggerId: trigger.id,
            triggerStatus: trigger.status,
            isTemplate: !!trigger.template_name,
            showTabs: initialFilter === 'all',
            contacts: [],
            counts: {}
        });
    };

    const handleEditParams = (trigger) => {
        let formattedDate = '';
        if (trigger.scheduled_time) {
            let d = new Date(trigger.scheduled_time);
            if (trigger.scheduled_time.indexOf('Z') === -1 && trigger.scheduled_time.indexOf('+') === -1 && trigger.scheduled_time.slice(19).indexOf('-') === -1) {
                d = new Date(trigger.scheduled_time + 'Z');
            }
            const offset = d.getTimezoneOffset() * 60000;
            const localDate = new Date(d.getTime() - offset);
            formattedDate = localDate.toISOString().slice(0, 16);
        }

        setEditParamsModal({
            isOpen: true,
            id: trigger.id,
            delay: trigger.delay_seconds || 5,
            concurrency: trigger.concurrency_limit || 1,
            contacts: trigger.contacts_list || [],
            scheduledTime: formattedDate
        });
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
