import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../../config';
import { fetchWithAuth } from '../../AuthContext';
import { toast } from 'react-hot-toast';

export function useRecurringSchedules(activeClient) {
    const [schedules, setSchedules] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isTriggering, setIsTriggering] = useState(false);
    const [viewingContacts, setViewingContacts] = useState(null);
    const [selectedSchedule, setSelectedSchedule] = useState(null);
    
    // Edit States
    const [editFreq, setEditFreq] = useState('weekly');
    const [editDays, setEditDays] = useState([]); // [{day, time}]
    const [editDayOfMonth, setEditDayOfMonth] = useState("");
    const [editTime, setEditTime] = useState('09:00');

    const fetchSchedules = useCallback(async () => {
        if (!activeClient?.id) return;
        setIsLoading(true);
        try {
            const response = await fetchWithAuth(`${API_URL}/schedules/recurring`, {}, activeClient.id);
            if (response.ok) {
                const data = await response.json();
                setSchedules(data.items);
            } else {
                toast.error('Erro ao carregar agendamentos');
            }
        } catch {
            toast.error('Erro ao carregar agendamentos recorrentes');
        } finally {
            setIsLoading(false);
        }
    }, [activeClient?.id]);

    useEffect(() => {
        fetchSchedules();
    }, [fetchSchedules]);

    const handleToggleStatus = async (schedule) => {
        try {
            const response = await fetchWithAuth(`${API_URL}/schedules/recurring/${schedule.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: !schedule.is_active })
            }, activeClient.id);
            
            if (response.ok) {
                toast.success(schedule.is_active ? 'Desativado' : 'Ativado');
                fetchSchedules();
            } else {
                toast.error('Erro ao alterar status');
            }
        } catch {
            toast.error('Erro ao alterar status');
        }
    };

    const handleDelete = async (id) => {
        setIsDeleting(true);
        try {
            const response = await fetchWithAuth(`${API_URL}/schedules/recurring/${id}`, {
                method: 'DELETE'
            }, activeClient.id);

            if (response.ok) {
                toast.success('Agendamento removido');
                setSelectedSchedule(null);
                fetchSchedules();
            } else {
                toast.error('Erro ao excluir agendamento');
            }
        } catch {
            toast.error('Erro ao excluir agendamento');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleUpdate = async () => {
        if (!selectedSchedule) return;
        setIsEditing(true);
        try {
            const response = await fetchWithAuth(`${API_URL}/schedules/recurring/${selectedSchedule.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    frequency: editFreq,
                    days_of_week: editFreq === 'weekly' ? editDays : null,
                    day_of_month: editFreq === 'monthly' ? editDays : null,
                    scheduled_time: editTime
                })
            }, activeClient.id);

            if (response.ok) {
                toast.success('Agendamento atualizado');
                setSelectedSchedule(null);
                fetchSchedules();
            } else {
                toast.error('Erro ao atualizar agendamento');
            }
        } catch {
            toast.error('Erro ao atualizar agendamento');
        } finally {
            setIsEditing(false);
        }
    };

    const fetchContacts = async (id) => {
        try {
            const response = await fetchWithAuth(`${API_URL}/schedules/recurring/${id}/contacts`, {}, activeClient.id);
            if (response.ok) {
                const data = await response.json();
                setViewingContacts(data);
            } else {
                toast.error('Erro ao buscar contatos');
            }
        } catch {
            toast.error('Erro ao buscar contatos');
        }
    };

    const openEdit = (schedule) => {
        setSelectedSchedule(schedule);
        setEditFreq(schedule.frequency);
        
        const isWeekly = schedule.frequency === 'weekly';
        const rawDays = isWeekly ? (schedule.days_of_week || []) : (schedule.day_of_month || []);
        
        const formattedDays = rawDays.map(d => typeof d === 'number' ? { day: d, time: schedule.scheduled_time || '09:00' } : d);
        setEditDays(formattedDays);
        
        if (!isWeekly) {
            const daysOnly = rawDays.map(d => typeof d === 'number' ? d : d.day);
            setEditDayOfMonth(daysOnly.join(', '));
        } else {
            setEditDayOfMonth("");
        }
        
        setEditTime(schedule.scheduled_time || '09:00');
    };

    const handleManualTrigger = async (id) => {
        if (isTriggering) return;
        setIsTriggering(true);
        try {
            const response = await fetchWithAuth(`${API_URL}/schedules/recurring/${id}/trigger`, {
                method: 'POST'
            }, activeClient.id);

            if (response.ok) {
                toast.success('Disparo manual iniciado com sucesso!');
            } else {
                const err = await response.json();
                toast.error(err.detail || 'Erro ao disparar manualmente');
            }
        } catch {
            toast.error('Erro na comunicação com o servidor');
        } finally {
            setIsTriggering(false);
        }
    };

    return {
        schedules,
        isLoading,
        isDeleting,
        isEditing,
        isTriggering,
        viewingContacts,
        setViewingContacts,
        selectedSchedule,
        setSelectedSchedule,
        editFreq,
        setEditFreq,
        editDays,
        setEditDays,
        editDayOfMonth,
        setEditDayOfMonth,
        editTime,
        setEditTime,
        fetchSchedules,
        handleToggleStatus,
        handleDelete,
        handleUpdate,
        fetchContacts,
        openEdit,
        handleManualTrigger
    };
}
