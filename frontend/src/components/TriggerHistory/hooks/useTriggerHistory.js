import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { API_URL, WS_URL } from '../../../config';
import { fetchWithAuth } from '../../../AuthContext';
import { useClient } from '../../../contexts/ClientContext';
import { useAuth } from '../../../AuthContext';
import { useTriggerModals } from './useTriggerModals';
import { useTriggerActions } from './useTriggerActions';

export const useTriggerHistory = (refreshKey, initialTriggerType = 'all') => {
    const { activeClient } = useClient();
    const { user } = useAuth();
    
    const [triggers, setTriggers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [monitoringTrigger, setMonitoringTrigger] = useState(null);
    const [triggerType, setTriggerType] = useState(initialTriggerType);

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
    const [loadingContacts, setLoadingContacts] = useState(false);
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

    const fetchHistory = useCallback(async () => {
        if (!activeClient) return;
        setLoading(true);
        try {
            const skip = (page - 1) * itemsPerPage;
            let url = `${API_URL}/triggers?limit=${itemsPerPage}&skip=${skip}`;

            if (filterName) url += `&funnel_name=${encodeURIComponent(filterName)}`;
            if (filterStatus && filterStatus !== 'all') url += `&status=${filterStatus}`;
            if (showTechnical) url += `&show_technical=true`;

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
        } catch (error) {
            console.error(error);
            toast.error("Erro ao carregar histórico de disparos");
        } finally {
            setLoading(false);
        }
    }, [filterName, dateRange, customStart, customEnd, filterStatus, itemsPerPage, page, triggerType, showTechnical, activeClient]);

    const {
        handleDelete,
        handleCancel,
        handleAction,
        handleBulkDeleteAction,
        handleStartNow,
        handleRetry
    } = useTriggerActions({
        activeClient,
        setTriggers,
        fetchHistory,
        setModalConfig,
        setSelectedIds,
        setMonitoringTrigger,
        selectedIds
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
                    if (payload.event === "bulk_progress") {
                        setTriggers(prev => prev.map(t => {
                            if (t.id === payload.data.trigger_id) {
                                return {
                                    ...t,
                                    status: payload.data.status,
                                    total_sent: payload.data.sent,
                                    total_failed: payload.data.failed,
                                    total_contacts: payload.data.total_contacts || payload.data.total,
                                    total_delivered: payload.data.delivered,
                                    total_read: payload.data.read,
                                    total_interactions: payload.data.interactions,
                                    total_blocked: payload.data.blocked,
                                    total_cost: payload.data.cost,
                                    total_memory_sent: payload.data.memory_sent
                                };
                            }
                            return t;
                        }));
                    } else if (payload.event === "trigger_deleted") {
                        if (payload.data.client_id === activeClient?.id) {
                            setTriggers(prev => prev.filter(t => t.id !== payload.data.trigger_id));
                        }
                    } else if (payload.event === "trigger_updated") {
                        if (payload.data.client_id === activeClient?.id) {
                            setTriggers(prev => prev.map(t => {
                                if (t.id === payload.data.trigger_id) {
                                    return { ...t, status: payload.data.status };
                                }
                                return t;
                            }));
                            setChildrenModal(prev => {
                                if (!prev.isOpen || !prev.children) return prev;
                                return {
                                    ...prev,
                                    children: prev.children.map(child => {
                                        if (child.id === payload.data.trigger_id) {
                                            return { ...child, status: payload.data.status };
                                        }
                                        return child;
                                    })
                                };
                            });
                        }
                    }
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
        setErrorModal({ isOpen: true, triggerId, errors: [], isLoading: true });
        try {
            const res = await fetchWithAuth(`${API_URL}/triggers/${triggerId}/failures`, {}, activeClient?.id);
            if (res.ok) {
                const data = await res.json();
                setErrorModal(prev => ({ ...prev, errors: data, isLoading: false }));
            } else {
                toast.error("Erro ao buscar relatório de falhas");
                setErrorModal(prev => ({ ...prev, isLoading: false }));
            }
        } catch (e) {
            toast.error("Erro de conexão");
            setErrorModal(prev => ({ ...prev, isLoading: false }));
        }
    };

    const fetchChildren = async (trigger) => {
        setChildrenModal({ isOpen: true, triggerId: trigger.id, triggerName: trigger.template_name || trigger.funnel?.name || 'Disparo', children: [], isLoading: true });
        try {
            const res = await fetchWithAuth(`${API_URL}/triggers/${trigger.id}/children`, {}, activeClient?.id);
            if (res.ok) {
                const data = await res.json();
                setChildrenModal(prev => ({ ...prev, children: data, isLoading: false }));
            } else {
                const errorData = await res.json().catch(() => ({}));
                toast.error(`Erro ${res.status}: ${errorData.detail || "Falha ao buscar funis iniciados"}`);
                setChildrenModal(prev => ({ ...prev, isLoading: false }));
            }
        } catch (err) {
            toast.error("Erro de conexão ao buscar funis iniciados");
            setChildrenModal(prev => ({ ...prev, isLoading: false }));
        }
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
                    const formatted = raw.map(c => {
                        const phone = typeof c === 'string' ? c : (c.phone || c.whatsapp || c.telefone || c.contact_phone || c.number || '');
                        const name = typeof c === 'object' ? (c.nome || c.name || c.full_name || c.contact_name || c['{{1}}'] || c['1'] || '') : '';
                        return {
                            phone_number: phone,
                            contact_name: name,
                            status: 'pending',
                            timestamp: trig.created_at,
                            is_bulk_raw: true
                        };
                    });
                    setContactsModal(prev => ({
                        ...prev,
                        contacts: formatted,
                        counts: { total: formatted.length }
                    }));
                    setLoadingContacts(false);
                    return;
                }
            }

            if (contactsFilter !== 'all') params.append('status_filter', contactsFilter);
            if (contactsTypeFilter !== 'all') params.append('message_type', contactsTypeFilter);
            const queryString = params.toString();
            if (queryString) url += `?${queryString}`;

            const res = await fetchWithAuth(url, {}, activeClient?.id);
            if (res.ok) {
                const data = await res.json();
                setContactsModal(prev => ({
                    ...prev,
                    contacts: data.items || [],
                    counts: data.counts || {}
                }));
            }
        } catch (e) {
            toast.error("Erro ao carregar lista de contatos");
        } finally {
            setLoadingContacts(false);
        }
    };

    useEffect(() => {
        if (contactsModal.isOpen && contactsModal.triggerId) {
            fetchTriggerContacts();
        }
    }, [contactsFilter, contactsTypeFilter, contactsModal.isOpen, contactsModal.triggerId]);

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
        const filterLabels = { total: 'Total na Lista', sent: 'Enviados', delivered: 'Recebidas', read: 'Lidos', failed: 'Falhas', interaction: 'Interações', blocked: 'Bloqueados', free: 'Gratuitas', template: 'Templates', private_note: 'Notas Privadas' };
        setContactsFilter(initialFilter);
        const label = filterLabels[initialFilter];
        setContactsModal({
            isOpen: true,
            title: label ? `${label} — ${trigger.funnel?.name || trigger.template_name || 'Envio em Massa'}` : `Contatos — ${trigger.funnel?.name || 'Envio em Massa'}`,
            triggerId: trigger.id,
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
        contactsTypeFilter, setContactsTypeFilter, loadingContacts, editParamsModal, setEditParamsModal,
        errorModal, setErrorModal, childrenModal, setChildrenModal, selectedIds, setSelectedIds,
        filterName, setFilterName, dateRange, setDateRange, filterStatus, setFilterStatus,
        triggerType, setTriggerType, customStart, setCustomStart, customEnd, setCustomEnd,
        showTechnical, setShowTechnical, itemsPerPage, setItemsPerPage, page, setPage,
        totalPages, totalItems, fetchHistory, handleDelete, handleCancel, handleAction,
        handleBulkDeleteAction, handleStartNow, handleRetry, fetchErrors, fetchChildren,
        handleViewPipeline, fetchTriggerContacts, handleSelectAll, handleSelectOne,
        handleViewContacts, handleEditParams
    };
};
