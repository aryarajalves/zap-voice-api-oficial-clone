import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { fetchWithAuth } from '../../../AuthContext';
import { useClient } from '../../../contexts/ClientContext';
import { API_URL, WS_URL } from '../../../config';

export const useCalendarEvents = (refreshKey) => {
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

    // Helpers for Date
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
        const wsBase = WS_URL.endsWith('/ws') ? WS_URL : `${WS_URL}/ws`;
        const wsToken = localStorage.getItem('token');
        const wsFinalUrl = wsToken ? `${wsBase}?token=${wsToken}` : wsBase;

        try {
            ws = new WebSocket(wsFinalUrl);

            ws.onmessage = (event) => {
                try {
                    const payload = JSON.parse(event.data);

                    // If trigger started processing or was cancelled/deleted
                    if (payload.event === "trigger_updated" || payload.event === "trigger_deleted" || payload.event === "bulk_progress") {
                        const data = payload.data;
                        const trigger_id = data.trigger_id;
                        const status = data.status;

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
            // Define start and end of current month
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
            const newDateTime = new Date(`${editDate}T${editTime}:00`);
            const isoString = newDateTime.toISOString();

            const res = await fetchWithAuth(`${API_URL}/schedules/${selectedEvent.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ new_start_time: isoString })
            }, activeClient.id);

            if (res.ok) {
                toast.success("Agendamento atualizado!");
                setEvents(prev => prev.map(e => e.id === selectedEvent.id ? { ...e, start: isoString } : e));
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

    return {
        activeClient,
        currentDate,
        setCurrentDate,
        events,
        setEvents,
        loading,
        selectedEvent,
        setSelectedEvent,
        confirmDelete,
        setConfirmDelete,
        isEditing,
        setIsEditing,
        editDate,
        setEditDate,
        editTime,
        setEditTime,
        isSaving,
        getDaysInMonth,
        getFirstDayOfMonth,
        handlePrevMonth,
        handleNextMonth,
        confirmDeleteAction,
        requestDelete,
        handleUpdateEvent
    };
};
