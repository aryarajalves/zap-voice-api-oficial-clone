import React, { useEffect, useState, useCallback } from 'react';
import { API_URL, WS_URL } from '../config';
import { toast } from 'react-hot-toast';
import { fetchWithAuth } from '../AuthContext';
import { useClient } from '../contexts/ClientContext';
import ConfirmModal from './ConfirmModal';
import useScrollLock from '../hooks/useScrollLock';

const TriggerHistory = ({ refreshKey }) => {
    const { activeClient } = useClient();
    const [triggers, setTriggers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalConfig, setModalConfig] = useState({
        isOpen: false,
        type: null, // 'delete' or 'cancel'
        id: null,
        title: '',
        message: '',
        confirmText: '',
        isDangerous: false
    });

    // Contacts Modal State
    const [contactsModal, setContactsModal] = useState({
        isOpen: false,
        title: '',
        triggerId: null,
        contacts: []
    });
    const [contactsFilter, setContactsFilter] = useState('all');
    const [loadingContacts, setLoadingContacts] = useState(false);

    // Edit Params Modal State
    const [editParamsModal, setEditParamsModal] = useState({
        isOpen: false,
        id: null,
        delay: 5,
        concurrency: 1,
        contacts: [],
        scheduledTime: ''
    });

    // Apply scroll lock when either modal is open
    useScrollLock(contactsModal.isOpen || editParamsModal.isOpen);

    // Filter States
    const [filterName, setFilterName] = useState('');
    const [dateRange, setDateRange] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [triggerType, setTriggerType] = useState('all');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    // Pagination
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const handleAction = async () => {
        const { type, id } = modalConfig;
        if (!type || !id) return;

        const url = type === 'delete'
            ? `${API_URL}/triggers/${id}`
            : `${API_URL}/triggers/${id}/cancel`;

        const method = type === 'delete' ? 'DELETE' : 'POST';

        try {
            const res = await fetchWithAuth(url, { method }, activeClient?.id);
            if (res.ok) {
                toast.success(type === 'delete' ? "Histórico excluído" : "Envio cancelado");
                fetchHistory(); // Refresh
            } else {
                const data = await res.json();
                toast.error(data.detail || "Erro na operação");
            }
        } catch (e) {
            console.error(e);
            toast.error("Erro na operação");
        }
        setModalConfig(prev => ({ ...prev, isOpen: false }));
    };

    const fetchHistory = useCallback(async () => {
        if (!activeClient) return;
        setLoading(true);
        try {
            const skip = (page - 1) * itemsPerPage;
            let url = `${API_URL}/triggers?limit=${itemsPerPage}&skip=${skip}`;

            if (filterName) url += `&funnel_name=${encodeURIComponent(filterName)}`;
            if (filterStatus && filterStatus !== 'all') url += `&status=${filterStatus}`;

            const now = new Date();
            let start = null;
            let end = null;
            // ... (rest of date logic)
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

            // Handle new pagination response structure
            if (data.items) {
                setTriggers(data.items);
                setTotalPages(Math.ceil(data.total / itemsPerPage));
            } else {
                // Fallback for old API just in case
                setTriggers(data);
                setTotalPages(1);
            }

        } catch (error) {
            console.error(error);
            toast.error("Erro ao carregar histórico de disparos");
        } finally {
            setLoading(false);
        }
    }, [filterName, dateRange, customStart, customEnd, filterStatus, itemsPerPage, page, triggerType, activeClient]);

    useEffect(() => {
        if (contactsModal.isOpen && contactsModal.triggerId) {
            fetchTriggerContacts();
        }
    }, [contactsFilter, contactsModal.isOpen, contactsModal.triggerId]);

    const fetchTriggerContacts = async () => {
        if (!contactsModal.triggerId) return;
        setLoadingContacts(true);
        try {
            let url = `${API_URL}/triggers/${contactsModal.triggerId}/messages`;
            if (contactsFilter !== 'all') {
                url += `?status_filter=${contactsFilter}`;
            }

            const res = await fetchWithAuth(url, {}, activeClient?.id);
            if (res.ok) {
                const data = await res.json();
                setContactsModal(prev => ({ ...prev, contacts: data }));
            }
        } catch (e) {
            console.error(e);
            toast.error("Erro ao carregar lista de contatos");
        } finally {
            setLoadingContacts(false);
        }
    };

    useEffect(() => {
        console.log("DEBUG: fetchHistory called. Active Client:", activeClient);
        fetchHistory();
    }, [refreshKey, fetchHistory]);

    // WebSocket Realtime Updates
    useEffect(() => {
        let ws;
        console.log("🔌 Tentando conectar WebSocket em", WS_URL);
        try {
            ws = new WebSocket(`${WS_URL}/ws`);

            ws.onopen = () => console.log("🟢 WebSocket Conectado!");

            ws.onmessage = (event) => {
                try {
                    const payload = JSON.parse(event.data);

                    if (payload.event === "bulk_progress") {
                        // Atualiza estado local sem re-fetch
                        setTriggers(prev => prev.map(t => {
                            if (t.id === payload.data.trigger_id) {
                                return {
                                    ...t,
                                    status: payload.data.status,
                                    total_sent: payload.data.sent,
                                    total_failed: payload.data.failed,
                                    total_delivered: payload.data.delivered,
                                    total_read: payload.data.read,
                                    total_interactions: payload.data.interactions,
                                    total_blocked: payload.data.blocked,
                                    total_cost: payload.data.cost
                                };
                            }
                            return t;
                        }));
                    }
                } catch (e) {
                    console.error("WS Parse Error", e);
                }
            };

            ws.onerror = (e) => console.error("🔴 WS Error", e);

        } catch (e) {
            // Silently fail, it will retry
            // console.error("WS Connection Failed", e);
        }

        // Falback: Polling a cada 60s (SÓ para garantir sincronia se WS cair)
        const interval = setInterval(fetchHistory, 60000);

        return () => {
            if (ws) ws.close();
            clearInterval(interval);
        };
    }, [fetchHistory]);

    const handleDelete = (id) => {
        setModalConfig({
            isOpen: true,
            type: 'delete',
            id,
            title: 'Excluir Histórico',
            message: 'Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.',
            confirmText: 'Excluir',
            isDangerous: true
        });
    };

    const handleStartNow = async (id) => {
        try {
            const res = await fetchWithAuth(`${API_URL}/triggers/${id}/start-now`, { method: 'POST' }, activeClient?.id);
            if (res.ok) {
                toast.success("Disparo iniciado com sucesso!");
                fetchHistory();
            } else {
                const data = await res.json();
                toast.error(data.detail || "Erro ao iniciar");
            }
        } catch (e) {
            console.error(e);
            toast.error("Erro de conexão");
        }
    };

    const handleCancel = (id) => {
        setModalConfig({
            isOpen: true,
            type: 'cancel',
            id,
            title: 'Cancelar Envio',
            message: 'Tem certeza que deseja interromper este envio em andamento?',
            confirmText: 'Sim, Cancelar',
            isDangerous: true
        });
    };

    // View Contacts Handler
    const handleViewContacts = (trigger) => {
        setContactsFilter('all');
        setContactsModal({
            isOpen: true,
            title: `Contatos - ${trigger.funnel?.name || 'Envio em Massa'}`,
            triggerId: trigger.id,
            contacts: [] // will fetch
        });
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'completed':
                return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">Enviado</span>;
            case 'pending':
                return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700">Agendado</span>;
            case 'processing':
                return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">Enviando...</span>;
            case 'failed':
                return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">Falha no Envio</span>;
            case 'cancelled':
                return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-200 text-gray-700">Cancelado</span>;
            default:
                return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">{status}</span>;
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';

        let date = new Date(dateString);

        // Check if dateString is strictly naive ISO (no Z, no +, no - after time part)
        // Heuristic: If it ends in a digit, it's likely naive.
        if (!dateString.endsWith('Z') && !dateString.includes('+') && dateString.slice(19).indexOf('-') === -1) {
            // It's naive (or just YYYY-MM-DDTHH:MM:SS), treat as UTC to show correctly in Local
            date = new Date(dateString + 'Z');
        }

        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }).format(date);
    };

    const handleEditParams = (trigger) => {
        let formattedDate = '';
        if (trigger.scheduled_time) {
            // Create date object
            let d = new Date(trigger.scheduled_time);

            // Handle potential naive string from backend treated as UTC by convention
            if (trigger.scheduled_time.indexOf('Z') === -1 && trigger.scheduled_time.indexOf('+') === -1 && trigger.scheduled_time.slice(19).indexOf('-') === -1) {
                d = new Date(trigger.scheduled_time + 'Z');
            }

            // Adjust to local time string for input
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

    const saveParams = async () => {
        try {
            const res = await fetchWithAuth(`${API_URL}/triggers/${editParamsModal.id}/update-params`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    delay_seconds: Number(editParamsModal.delay),
                    concurrency_limit: Number(editParamsModal.concurrency),
                    contacts_list: editParamsModal.contacts,
                    scheduled_time: editParamsModal.scheduledTime ? new Date(editParamsModal.scheduledTime).toISOString() : null
                })
            });

            if (res.ok) {
                toast.success("Parâmetros atualizados!");
                setEditParamsModal({ ...editParamsModal, isOpen: false });
                fetchHistory();
            } else {
                const data = await res.json();
                toast.error(data.detail || "Erro ao atualizar");
            }
        } catch (error) {
            console.error(error);
            toast.error("Erro de conexão");
        }
    };

    // Bulk Selection State
    const [selectedIds, setSelectedIds] = useState([]);

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(triggers.map(t => t.id));
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

    const confirmBulkDelete = () => {
        setModalConfig({
            isOpen: true,
            type: 'bulk_delete',
            id: 'batch', // Dummy ID
            title: `Excluir ${selectedIds.length} Itens`,
            message: `Tem certeza que deseja excluir ${selectedIds.length} registros de histórico selecionados? Esta ação não pode ser desfeita.`,
            confirmText: 'Excluir Selecionados',
            isDangerous: true
        });
    };

    const handleBulkDeleteAction = async () => {
        setLoading(true);
        let successCount = 0;
        let failCount = 0;

        for (const id of selectedIds) {
            try {
                const res = await fetchWithAuth(`${API_URL}/triggers/${id}`, { method: 'DELETE' }, activeClient?.id);
                if (res.ok) successCount++;
                else failCount++;
            } catch (e) {
                console.error(e);
                failCount++;
            }
        }

        if (successCount > 0) toast.success(`${successCount} itens excluídos.`);
        if (failCount > 0) toast.error(`${failCount} falhas na exclusão.`);

        setSelectedIds([]);
        fetchHistory();
        setModalConfig(prev => ({ ...prev, isOpen: false }));
    };

    // Intercept standard handleAction to support bulk delete
    const handleActionWrapper = () => {
        if (modalConfig.type === 'bulk_delete') {
            handleBulkDeleteAction();
        } else {
            handleAction();
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mt-8 transition-colors duration-200">
            <ConfirmModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                onConfirm={handleActionWrapper}
                title={modalConfig.title}
                message={modalConfig.message}
                confirmText={modalConfig.confirmText}
                isDangerous={modalConfig.isDangerous}
            />

            {/* Edit Params Modal */}
            {editParamsModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm animated-fade-in">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-sm w-full p-6">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Editar Parâmetros de Envio</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Data/Hora Agendada</label>
                                <input
                                    type="datetime-local"
                                    value={editParamsModal.scheduledTime}
                                    onChange={(e) => setEditParamsModal({ ...editParamsModal, scheduledTime: e.target.value })}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Delay (segundos)</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={editParamsModal.delay}
                                    onChange={(e) => setEditParamsModal({ ...editParamsModal, delay: e.target.value })}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Concorrência</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="50"
                                    value={editParamsModal.concurrency}
                                    onChange={(e) => setEditParamsModal({ ...editParamsModal, concurrency: e.target.value })}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                            <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    Adicionar Mais Contatos (CSV):
                                </label>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                    Atual: <b>{editParamsModal.contacts?.length || 0}</b> contatos.
                                </div>
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={(e) => {
                                        const file = e.target.files[0];
                                        if (!file) return;

                                        const reader = new FileReader();
                                        reader.onload = (event) => {
                                            const text = event.target.result;
                                            const lines = text.split('\n').map(line => line.trim()).filter(line => line);
                                            if (lines.length > 0 && !lines[0].toLowerCase().includes('numero')) {
                                                toast.error('O CSV deve ter a coluna "Numero"');
                                                return;
                                            }
                                            const newContacts = lines.slice(1).map(line => {
                                                const rawNum = line.split(',')[0].trim();
                                                return rawNum.replace(/\D/g, '');
                                            }).filter(num => num && num.length >= 8);

                                            const existing = new Set(editParamsModal.contacts || []);
                                            let addedCount = 0;
                                            newContacts.forEach(c => {
                                                if (!existing.has(c)) {
                                                    existing.add(c);
                                                    addedCount++;
                                                }
                                            });
                                            setEditParamsModal(prev => ({ ...prev, contacts: [...existing] }));
                                            if (addedCount > 0) toast.success(`${addedCount} novos contatos!`);
                                            else toast('Nenhum contato novo.', { icon: 'ℹ️' });
                                        };
                                        reader.readAsText(file);
                                    }}
                                    className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                />
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button onClick={() => setEditParamsModal({ ...editParamsModal, isOpen: false })} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium">Cancelar</button>
                            <button onClick={saveParams} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">Salvar Alterações</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Contacts Viewer Modal - Filterable */}
            {contactsModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm animated-fade-in">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[85vh]" style={{ userSelect: 'none', cursor: 'default' }}>
                        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                            <h3 className="font-bold text-gray-800 dark:text-white text-lg">{contactsModal.title}</h3>
                            <button onClick={() => setContactsModal({ ...contactsModal, isOpen: false })} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>

                        {/* Filters */}
                        <div className="px-4 pt-2 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex gap-2 overflow-x-auto no-scrollbar">
                            {[
                                { id: 'all', label: 'Todos', icon: '📋' },
                                { id: 'delivered', label: 'Recebidas', icon: '📬' }, // Delivered+Read
                                { id: 'read', label: 'Viram', icon: '👀' },
                                { id: 'interaction', label: 'Interagiram', icon: '👆' },
                                { id: 'blocked', label: 'Bloquearam', icon: '🚫' },
                                { id: 'failed', label: 'Falharam', icon: '❌' },
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setContactsFilter(tab.id)}
                                    className={`pb-2 px-3 text-sm font-medium border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${contactsFilter === tab.id
                                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                        }`}
                                >
                                    <span>{tab.icon}</span>
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </div>

                        <div className="p-0 overflow-y-auto flex-1 bg-gray-50 dark:bg-gray-900/30 min-h-[300px]">
                            {loadingContacts ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {contactsModal.contacts.map((contact, i) => (
                                        <div key={i} className="p-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition flex justify-between items-center group">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2 h-2 rounded-full ${contact.status === 'read' ? 'bg-blue-500' :
                                                    contact.status === 'delivered' ? 'bg-green-500' :
                                                        contact.status === 'sent' ? 'bg-blue-300 animate-pulse' :
                                                            contact.status === 'failed' ? 'bg-red-500' :
                                                                contact.failure_reason === 'BLOCKED_VIA_BUTTON' ? 'bg-orange-500' :
                                                                    contact.is_interaction ? 'bg-purple-500' : 'bg-gray-300'
                                                    }`} title={contact.status === 'sent' ? 'Enviado ao WhatsApp (Aguardando Retorno)' : contact.status} />
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900 dark:text-white font-mono">
                                                        {contact.phone_number || contact.phone || 'Desconhecido'}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {new Date(contact.updated_at || contact.timestamp).toLocaleString()}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                {contact.status === 'sent' && !contact.failure_reason && (
                                                    <div className="text-xs text-blue-400 italic">
                                                        Aguardando entrega...
                                                    </div>
                                                )}
                                                {contact.failure_reason && (
                                                    <div className="text-xs text-red-500 max-w-[200px] truncate" title={contact.failure_reason}>
                                                        {contact.failure_reason === 'BLOCKED_VIA_BUTTON' ? 'Bloqueou o contato' : contact.failure_reason}
                                                    </div>
                                                )}
                                                {contact.is_interaction && !contact.failure_reason && (
                                                    <div className="text-xs text-purple-600 font-semibold bg-purple-50 dark:bg-purple-900/20 px-2 py-0.5 rounded">
                                                        Interagiu
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {contactsModal.contacts.length === 0 && (
                                        <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                                            <svg className="w-10 h-10 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                            <p className="text-sm">Nenhum contato encontrado neste filtro.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex justify-end gap-3 z-10">
                            <button onClick={() => {
                                const text = contactsModal.contacts.map(c => c.phone_number || c.phone).join('\n');
                                navigator.clipboard.writeText(text);
                                toast.success('Lista copiada!');
                            }} className="px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition font-medium flex items-center gap-2"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>Copiar Lista</button>
                            <button onClick={() => setContactsModal({ ...contactsModal, isOpen: false })} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition font-medium">Fechar</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 dark:text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                        Histórico de Disparos
                    </h2>

                    {selectedIds.length > 0 && (
                        <button
                            onClick={confirmBulkDelete}
                            className="flex items-center gap-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-3 py-1 rounded-full text-sm font-semibold hover:bg-red-200 dark:hover:bg-red-900/50 transition shadow-sm"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Excluir ({selectedIds.length})
                        </button>
                    )}

                    <div className="flex items-center gap-2">
                        <select
                            value={itemsPerPage}
                            onChange={(e) => setItemsPerPage(Number(e.target.value))}
                            className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-xs text-gray-600 dark:text-gray-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700"
                        >
                            <option value={10}>10 itens</option>
                            <option value={25}>25 itens</option>
                            <option value={50}>50 itens</option>
                            <option value={100}>100 itens</option>
                        </select>
                        <button
                            onClick={fetchHistory}
                            className="p-2 text-gray-400 hover:text-blue-600 transition"
                            title="Atualizar"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 items-center">
                    <input type="text" placeholder="Buscar por funil..." value={filterName} onChange={(e) => setFilterName(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm w-48 focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                    <select value={triggerType} onChange={(e) => setTriggerType(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                        <option value="all">Todos os tipos</option>
                        <option value="funnel">Disparos de Funil</option>
                        <option value="bulk">Envio em Massa</option>
                    </select>
                    <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                        <option value="all">Todo o período</option>
                        <option value="today">Hoje</option>
                        <option value="7days">Últimos 7 dias</option>
                        <option value="14days">Últimos 14 dias</option>
                        <option value="month">Este mês</option>
                        <option value="custom">Personalizado</option>
                    </select>
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                        <option value="all">Todos os status</option>
                        <option value="pending">Agendado</option>
                        <option value="processing">Enviando</option>
                        <option value="completed">Enviado</option>
                        <option value="failed">Falha</option>
                        <option value="cancelled">Cancelado</option>
                    </select>
                    {dateRange === 'custom' && (<><input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /><span className="text-gray-400">-</span><input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /></>)}
                </div>
            </div>

            <div className="overflow-x-auto">
                {loading && triggers.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 animate-pulse">Carregando histórico...</div>
                ) : triggers.filter(t => {
                    if (t.template_name === "HIDDEN_CHILD") return false;
                    if (triggerType === 'funnel') return !t.is_bulk;
                    if (triggerType === 'bulk') return t.is_bulk;
                    return true;
                }).length === 0 ? (
                    <div className="p-8 text-center text-gray-400">Nenhum disparo registrado.</div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                <th className="p-4 w-8">
                                    <input
                                        type="checkbox"
                                        onChange={handleSelectAll}
                                        checked={triggers.length > 0 && selectedIds.length === triggers.length}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                </th>
                                <th className="p-4 font-semibold">Data/Hora</th>
                                <th className="p-4 font-semibold">Funil</th>
                                <th className="p-4 font-semibold">Contato</th>
                                <th className="p-4 font-semibold text-center">Status</th>
                                <th className="p-4 font-semibold text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                            {triggers
                                .filter(t => {
                                    if (t.template_name === "HIDDEN_CHILD") return false; // Hide execution children
                                    if (triggerType === 'funnel') return !t.is_bulk;
                                    if (triggerType === 'bulk') return t.is_bulk;
                                    return true;
                                })
                                .map((trigger) => (
                                    <tr key={trigger.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 transition ${selectedIds.includes(trigger.id) ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}>
                                        <td className="p-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(trigger.id)}
                                                onChange={() => handleSelectOne(trigger.id)}
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                        </td>
                                        <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                                            {formatDate(trigger.scheduled_time)}
                                        </td>
                                        <td className="p-4 text-sm font-medium text-gray-800 dark:text-gray-200">
                                            {trigger.is_bulk ? (
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-blue-600 dark:text-blue-400">📤 {trigger.template_name || trigger.funnel?.name || 'Disparo em Massa'}</span>
                                                        <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">Bulk</span>
                                                    </div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                        ✅ {trigger.total_sent} enviados •
                                                        {trigger.total_delivered > 0 && <span className="text-green-600 font-semibold" title="Entregues"> 📬 {trigger.total_delivered} •</span>}
                                                        {trigger.total_read > 0 && <span className="text-blue-500 font-semibold" title="Lidos"> 👀 {trigger.total_read} •</span>}
                                                        {trigger.total_interactions > 0 && <span className="text-purple-600 font-bold" title="Cliques em Botão"> 👆 {trigger.total_interactions} •</span>}
                                                        {trigger.total_blocked > 0 && <span className="text-orange-600 font-bold" title="Bloqueios (Sair/Bloquear)"> 🚫 {trigger.total_blocked} •</span>}
                                                        {trigger.total_failed > 0 && <span className="text-red-500 font-semibold" title="Falhas"> ❌ {trigger.total_failed} •</span>}
                                                        <span className="text-gray-500 dark:text-gray-400"> ⏳ Faltam: {Math.max(0, (trigger.contacts_list?.length || 0) - (trigger.total_sent + trigger.total_failed))}</span>
                                                    </div>
                                                    {trigger.total_failed > 0 && (
                                                        <button
                                                            onClick={async () => {
                                                                try {
                                                                    const res = await fetchWithAuth(`${API_URL}/triggers/${trigger.id}/failures-csv`, {}, activeClient?.id);
                                                                    if (res.ok) {
                                                                        const blob = await res.blob();
                                                                        const url = window.URL.createObjectURL(blob);
                                                                        const a = document.createElement('a');
                                                                        a.href = url;
                                                                        a.download = `falhas_disparo_${trigger.id}.csv`;
                                                                        document.body.appendChild(a);
                                                                        a.click();
                                                                        a.remove();
                                                                    } else {
                                                                        toast.error("Erro ao baixar relatório");
                                                                    }
                                                                } catch (e) {
                                                                    toast.error("Erro na conexão");
                                                                }
                                                            }}
                                                            className="text-[10px] sm:text-xs mt-1 text-red-600 dark:text-red-400 font-medium hover:underline flex items-center gap-1"
                                                        >
                                                            📥 Baixar Relatório de Falhas ({trigger.total_failed})
                                                        </button>
                                                    )}
                                                    {trigger.total_delivered > 0 && trigger.total_cost > 0 && (
                                                        <div className="text-xs text-green-600 dark:text-green-400 font-semibold mt-1">
                                                            💰 R$ {trigger.total_cost.toFixed(2)} ({trigger.total_delivered} entregues)
                                                        </div>
                                                    )}
                                                </div>
                                            ) : trigger.funnel ? (
                                                trigger.funnel.name
                                            ) : (
                                                <span className="text-gray-400 italic">Funil Apagado (ID: {trigger.funnel_id})</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                                            {trigger.is_bulk ? (
                                                <div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold mb-1 flex items-center gap-2">
                                                        📋 Contatos ({trigger.contacts_list?.length || 0}):
                                                        <button onClick={() => handleViewContacts(trigger)} className="text-blue-500 hover:text-blue-700 hover:underline">Ver Lista</button>
                                                    </div>
                                                    <div className="text-xs text-gray-400 truncate max-w-[150px]">
                                                        {(() => {
                                                            const first = trigger.contacts_list?.[0];
                                                            if (!first) return '';
                                                            if (typeof first === 'string') return first;
                                                            return first.name || first.phone || 'Contato';
                                                        })()}...
                                                    </div>
                                                </div>
                                            ) : trigger.contact_name ? (
                                                <div>
                                                    <div className="font-medium text-gray-900 dark:text-white">{trigger.contact_name}</div>
                                                    <div className="text-xs text-gray-400">{trigger.contact_phone}</div>
                                                </div>
                                            ) : (
                                                <span className="font-mono text-xs text-gray-500">#{trigger.conversation_id}</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-center">
                                            {getStatusBadge(trigger.status)}
                                        </td>
                                        <td className="p-4 text-right flex justify-end gap-2">
                                            {(trigger.status === 'pending' || trigger.status === 'processing') ? (
                                                <>
                                                    {trigger.is_bulk && trigger.status === 'pending' && (<button onClick={() => handleEditParams(trigger)} className="p-1 text-blue-500 hover:bg-blue-50 rounded" title="Editar Parâmetros (Delay/Concorrência)"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>)}
                                                    <button onClick={() => handleStartNow(trigger.id)} className="p-1 text-green-500 hover:bg-green-50 rounded" title="Iniciar Agora (Ignorar Agendamento)"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></button>
                                                    <button onClick={() => handleCancel(trigger.id)} className="p-1 text-red-500 hover:bg-red-50 rounded" title="Cancelar Envio"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                                                </>
                                            ) : (
                                                <button onClick={() => handleDelete(trigger.id)} className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded" title="Excluir Histórico"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default TriggerHistory;
