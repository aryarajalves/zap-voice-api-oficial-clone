import React, { useState, useEffect } from 'react';
import { FiChevronLeft, FiChevronRight, FiClock, FiTrash2, FiEdit2, FiRepeat, FiUsers, FiZap, FiInfo } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { fetchWithAuth } from '../AuthContext';
import { useClient } from '../contexts/ClientContext';
import { API_URL, WS_URL } from '../config';
import ConfirmModal from './ConfirmModal';

const ScheduleCalendar = ({ refreshKey }) => {
    const { activeClient } = useClient();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null); // { event: ..., isOpen: true }

    // Edit States
    const [isEditing, setIsEditing] = useState(false);
    const [editDate, setEditDate] = useState("");
    const [editTime, setEditTime] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Reset edit states when modal closes (selectedEvent becomes null)
    useEffect(() => {
        if (!selectedEvent) {
            setIsEditing(false);
            setEditDate("");
            setEditTime("");
        } else {
            // Pre-fill fields
            const d = new Date(selectedEvent.start);
            setEditDate(d.toISOString().split('T')[0]);
            setEditTime(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }
    }, [selectedEvent]);

    // Funções de Ajuda para Data
    const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

    useEffect(() => {
        if (activeClient?.id) {
            fetchEvents();
        }
    }, [currentDate, refreshKey, activeClient?.id]);

    // WebSocket Realtime Updates for Calendar
    useEffect(() => {
        if (!activeClient?.id) return;

        let ws;
        const wsFinalUrl = WS_URL.endsWith('/ws') ? WS_URL : `${WS_URL}/ws`;

        try {
            ws = new WebSocket(wsFinalUrl);

            ws.onmessage = (event) => {
                try {
                    const payload = JSON.parse(event.data);

                    // Se o trigger começou a ser processado ou foi cancelado/deletado
                    if (payload.event === "trigger_updated" || payload.event === "trigger_deleted" || payload.event === "bulk_progress") {
                        const data = payload.data;
                        const trigger_id = data.trigger_id;
                        const status = data.status;

                        // Note: bulk_progress might not always have client_id in the message,
                        // but trigger_updated and trigger_deleted do.
                        // We can still filter by ID if it's in our local list.

                        // Se o status não for mais 'pending' ou 'queued', remove do calendário
                        if (payload.event === "trigger_deleted" || !['pending', 'queued', 'Queued'].includes(status)) {
                            setEvents(prev => prev.filter(e => e.id !== trigger_id));

                            // Se for o evento selecionado no modal, fecha ele ou atualiza
                            setSelectedEvent(prev => (prev?.id === trigger_id ? null : prev));
                        }
                    }
                } catch (err) {
                    console.error("Erro no processamento da mensagem WebSocket:", err);
                }
            };

            ws.onclose = () => console.log("🔌 Calendar WebSocket Desconectado");

        } catch (e) {
            console.error("Falha ao criar WebSocket:", e);
        }

        return () => {
            if (ws) ws.close();
        };
    }, [activeClient?.id]);

    const fetchEvents = async () => {
        if (!activeClient?.id) return;

        setLoading(true);
        try {
            // Define start e end do mês atual para buscar
            const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
            const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59).toISOString();

            const res = await fetchWithAuth(
                `${API_URL}/schedules/?start=${start}&end=${end}`,
                {},
                activeClient.id
            );
            if (res.ok) {
                const data = await res.json();
                // Filter to show only scheduled/pending events as requested
                const filtered = data.filter(e => ['pending', 'queued', 'Queued'].includes(e.status));
                setEvents(filtered);
            }
        } catch (error) {
            console.error("Erro ao buscar agenda:", error);
            toast.error("Erro ao carregar calendário");
        } finally {
            setLoading(false);
        }
    };

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const confirmDeleteAction = async () => {
        if (!confirmDelete?.event) return;
        const targetEvent = confirmDelete.event;

        try {
            const res = await fetchWithAuth(`${API_URL}/schedules/${targetEvent.id}`, {
                method: 'DELETE'
            }, activeClient.id);

            if (res.ok) {
                toast.success(targetEvent.status === 'pending' ? "Agendamento cancelado!" : "Registro excluído!");
                setEvents(prev => prev.filter(e => e.id !== targetEvent.id));
                setSelectedEvent(null);
            } else {
                const err = await res.json();
                toast.error(err.detail || "Erro ao excluir");
            }
        } catch (e) {
            toast.error("Erro de conexão");
        } finally {
            setConfirmDelete(null);
        }
    };

    const requestDelete = (event) => {
        setConfirmDelete({ event, isOpen: true });
    };

    const handleUpdateEvent = async () => {
        if (!editDate || !editTime) {
            toast.error("Data e hora são obrigatórios");
            return;
        }

        setIsSaving(true);
        try {
            // Construct ISO String from Date + Time
            const newDateTime = new Date(`${editDate}T${editTime}:00`);
            const isoString = newDateTime.toISOString();

            const res = await fetchWithAuth(`${API_URL}/schedules/${selectedEvent.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ new_start_time: isoString })
            }, activeClient.id);

            if (res.ok) {
                toast.success("Agendamento atualizado!");
                // Update local list
                setEvents(prev => prev.map(e => e.id === selectedEvent.id ? { ...e, start: isoString } : e));
                // Update currently open modal data
                setSelectedEvent(prev => ({ ...prev, start: isoString }));
                setIsEditing(false);
            } else {
                const err = await res.json();
                toast.error(err.detail || "Erro ao atualizar");
            }
        } catch (e) {
            toast.error("Erro de conexão");
        } finally {
            setIsSaving(false);
        }
    };

    // Renderização do Grid
    const renderCalendar = () => {
        const daysInMonth = getDaysInMonth(currentDate);
        const firstDay = getFirstDayOfMonth(currentDate);
        const days = [];

        // Preenchimento vazio antes do dia 1
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-32 bg-gray-50/50 dark:bg-gray-800/20 border border-gray-100 dark:border-gray-700/50"></div>);
        }

        // Dias do mês
        for (let day = 1; day <= daysInMonth; day++) {
            // const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toISOString().split('T')[0];
            // Fix: Compare using local date objects to handle timezone offsets
            const dayEvents = events.filter(e => {
                const d = new Date(e.start);
                return d.getDate() === day &&
                    d.getMonth() === currentDate.getMonth() &&
                    d.getFullYear() === currentDate.getFullYear();
            }).sort((a, b) => new Date(a.start) - new Date(b.start));

            const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toISOString().split('T')[0];
            const isToday = new Date().toISOString().split('T')[0] === dateStr;

            days.push(
                <div
                    key={day}
                    className={`h-32 border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 overflow-y-auto hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-colors group relative ${isToday ? 'ring-2 ring-blue-500/30 dark:ring-blue-500/50 z-10' : ''}`}
                >
                    <span className={`text-xs font-bold mb-1 block w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                        {day}
                    </span>

                    <div className="space-y-1">
                        {dayEvents.map(event => (
                            <button
                                key={event.id}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedEvent(event);
                                }}
                                className={`w-full text-left text-[10px] px-2 py-1 rounded border overflow-hidden truncate flex items-center gap-1 shadow-sm transition-all hover:scale-[1.02]
                                    bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800
                                    ${event.type === 'bulk'
                                        ? 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800'
                                        : ''}
                                    ${event.status === 'completed' ? 'opacity-60 saturate-50' : ''}
                                `}
                            >
                                {event.type === 'bulk' ? <FiUsers size={10} /> : <FiZap size={10} />}
                                <span className="font-semibold">{new Date(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                <span className="truncate ml-1">
                                    {event.template_name
                                        ? event.template_name
                                        : (event.funnel_name ? event.funnel_name : `${event.contact_count} contatos`)}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            );
        }

        return days;
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Header do Calendário */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white capitalize">
                        {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                        <span className="text-sm font-normal text-gray-500 ml-2">({events.length})</span>
                    </h2>
                    {loading && <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full ml-3"></div>}
                </div>
                <div className="flex gap-2">
                    <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 transition"><FiChevronLeft /></button>
                    <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition">Hoje</button>
                    <button onClick={handleNextMonth} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 transition"><FiChevronRight /></button>
                </div>
            </div>

            {/* Dias da Semana Header */}
            <div className="grid grid-cols-7 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                    <div key={day} className="py-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {day}
                    </div>
                ))}
            </div>

            {/* Grid de Dias */}
            <div className="grid grid-cols-7 flex-1 auto-rows-fr overflow-y-auto">
                {renderCalendar()}
            </div>

            {/* Modal de Detalhes do Evento */}
            {selectedEvent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-2xl p-6 border border-gray-200 dark:border-gray-700 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                {selectedEvent.type === 'bulk' ? <FiUsers className="text-purple-500" /> : <FiZap className="text-blue-500" />}
                                Detalhes do Agendamento
                            </h3>
                            <button onClick={() => setSelectedEvent(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none">&times;</button>
                        </div>

                        <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
                            {!isEditing ? (
                                <>
                                    {/* --- VIEW MODE --- */}
                                    <div>
                                        <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Título</label>
                                        <p className="font-semibold text-gray-900 dark:text-white text-base">
                                            {selectedEvent.template_name
                                                ? `Template: ${selectedEvent.template_name}`
                                                : (selectedEvent.funnel_name ? `Funil: ${selectedEvent.funnel_name}` : selectedEvent.title)}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Data</label>
                                            <p>{new Date(selectedEvent.start).toLocaleDateString()}</p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Horário</label>
                                            <p className="flex items-center gap-1 font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded w-fit">
                                                <FiClock size={12} />
                                                {new Date(selectedEvent.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Contatos</label>
                                            <p>{selectedEvent.contact_count}</p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Status</label>
                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold capitalize
                                        ${['pending', 'queued', 'Queued'].includes(selectedEvent.status) ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' :
                                                    selectedEvent.status === 'processing' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                        selectedEvent.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                            'bg-red-100 text-red-700'}`}>
                                                {selectedEvent.status}
                                            </span>
                                        </div>
                                    </div>

                                    {selectedEvent.private_message && (
                                        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/50 rounded-lg shadow-sm">
                                            <label className="block text-[10px] font-bold uppercase text-indigo-500 dark:text-indigo-400 mb-1 tracking-wider italic font-black flex items-center gap-1">
                                                <FiInfo size={10} /> Mensagem Privada Ativada 🔓
                                            </label>
                                            <p className="text-xs text-indigo-700 dark:text-indigo-300 italic truncate" title={selectedEvent.private_message}>
                                                &quot;{selectedEvent.private_message}&quot;
                                            </p>
                                        </div>
                                    )}

                                    <div className="flex gap-2 pt-2">
                                        {['pending', 'queued', 'Queued'].includes(selectedEvent.status) && (
                                            <button
                                                onClick={() => setIsEditing(true)}
                                                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/50 transition-colors font-bold text-xs"
                                            >
                                                <FiEdit2 size={14} /> Editar
                                            </button>
                                        )}

                                        {selectedEvent.status !== 'processing' && (
                                            <button
                                                onClick={() => requestDelete(selectedEvent)}
                                                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/50 transition-colors font-bold text-xs"
                                            >
                                                <FiTrash2 size={14} />
                                                {['pending', 'queued', 'Queued'].includes(selectedEvent.status) ? 'Cancelar' : 'Excluir'}
                                            </button>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* --- EDIT MODE --- */}
                                    <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700 space-y-4">
                                        <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                            <FiEdit2 className="text-blue-500" /> Editar Agendamento
                                        </h4>

                                        <div>
                                            <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1">Nova Data</label>
                                            <input
                                                type="date"
                                                value={editDate}
                                                onChange={e => setEditDate(e.target.value)}
                                                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1">Novo Horário</label>
                                            <input
                                                type="time"
                                                value={editTime}
                                                onChange={e => setEditTime(e.target.value)}
                                                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            />
                                        </div>

                                        <div className="flex gap-2 pt-2">
                                            <button
                                                onClick={() => setIsEditing(false)}
                                                className="flex-1 py-2 rounded-lg text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700 transition"
                                                disabled={isSaving}
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                onClick={handleUpdateEvent}
                                                disabled={isSaving}
                                                className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                {isSaving ? <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></div> : "Salvar Alterações"}
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={!!confirmDelete}
                onClose={() => setConfirmDelete(null)}
                onConfirm={confirmDeleteAction}
                title="Confirmar Exclusão"
                message={confirmDelete?.event?.status === 'pending'
                    ? "Tem certeza que deseja cancelar este agendamento pendente? Ele não será enviado."
                    : "Tem certeza que deseja remover este registro do histórico? Essa ação é irreversível."}
                confirmText={confirmDelete?.event?.status === 'pending' ? "Cancelar Agendamento" : "Excluir"}
                isDangerous={true}
            />
        </div>
    );
};

export default ScheduleCalendar;
