import React, { useState, useEffect } from 'react';
import { FiClock, FiTrash2, FiCalendar, FiRefreshCw, FiCheckCircle, FiXCircle, FiPlay, FiFilter, FiEdit2, FiUsers, FiX, FiZap } from 'react-icons/fi';
import { API_URL } from '../config';
import { useClient } from '../contexts/ClientContext';
import { fetchWithAuth } from '../AuthContext';
import { toast } from 'react-hot-toast';

export default function RecurringSchedules() {
    const { activeClient } = useClient();
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
    const [editDayOfMonth, setEditDayOfMonth] = useState(""); // Comma separated string
    const [editTime, setEditTime] = useState('09:00');

    const fetchSchedules = async () => {
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
    };

    useEffect(() => {
        fetchSchedules();
    }, [activeClient?.id]);

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
                    day_of_month: editFreq === 'monthly' ? editDays : null, // Reusing editDays for monthly too
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
        
        // Ensure both weekly and monthly use the [{day, time}] format for state
        const formattedDays = rawDays.map(d => typeof d === 'number' ? { day: d, time: schedule.scheduled_time || '09:00' } : d);
        setEditDays(formattedDays);
        
        // String format for the monthly input display (if it's just numbers)
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

    const getScheduleSummary = (schedule) => {
        const { frequency, days_of_week, day_of_month, scheduled_time } = schedule;
        const isWeekly = frequency === 'weekly';
        const days = isWeekly ? days_of_week : day_of_month;
        
        if (!days || !Array.isArray(days)) return '--';
        const names = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
        
        return days.map(d => {
            if (isWeekly) {
                if (typeof d === 'number') return `${names[d]} (${scheduled_time})`;
                return `${names[d.day]} (${d.time})`;
            } else {
                if (typeof d === 'number') return `Dia ${d} (${scheduled_time})`;
                return `Dia ${d.day} (${d.time})`;
            }
        }).join(', ');
    };

    if (isLoading && schedules.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <>
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-white tracking-tight">Disparos Recorrentes Criados</h2>
                    <p className="text-slate-400 text-sm">Gerencie suas campanhas automáticas programadas.</p>
                </div>
                <button 
                    onClick={fetchSchedules}
                    className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all active:scale-95 border border-white/5 shadow-lg"
                >
                    <FiRefreshCw className={isLoading ? 'animate-spin' : ''} />
                </button>
            </div>

            {schedules.length === 0 ? (
                <div className="bg-slate-900/40 border border-dashed border-slate-700 rounded-[2.5rem] p-16 text-center space-y-6 shadow-inner">
                    <div className="w-20 h-20 bg-slate-800 rounded-[2rem] flex items-center justify-center mx-auto text-slate-600 shadow-2xl">
                        <FiClock size={40} />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-xl font-bold text-white">Nenhum disparo recorrente</h3>
                        <p className="text-slate-500 max-w-sm mx-auto">Vá até o Disparo em Massa para criar uma nova campanha com recorrência semanal ou mensal.</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {schedules.map((schedule) => (
                        <div 
                            key={schedule.id}
                            className={`relative group overflow-hidden bg-slate-900/60 backdrop-blur-xl border-2 rounded-[2.5rem] p-8 transition-all hover:shadow-2xl hover:shadow-blue-500/10 ${schedule.is_active ? 'border-white/5' : 'border-red-500/10 grayscale opacity-60'}`}
                        >
                            {/* Accent Decoration */}
                            <div className={`absolute -top-12 -right-12 w-32 h-32 blur-[60px] rounded-full transition-colors ${schedule.is_active ? 'bg-blue-500/10' : 'bg-red-500/10'}`}></div>
                            
                            <div className="relative z-10 flex flex-col h-full space-y-6">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${schedule.is_active ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                                {schedule.is_active ? 'Ativo' : 'Inativo'}
                                            </span>
                                            <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                                                {schedule.frequency === 'weekly' ? 'Semanal' : 'Mensal'}
                                            </span>
                                        </div>
                                        <h4 className="text-lg font-black text-white truncate max-w-[180px] pt-2">
                                            {schedule.template_name?.split('|').pop() || 'Template'}
                                        </h4>
                                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                                            <FiFilter size={10} className="text-blue-500" />
                                            {schedule.tag ? `Etiqueta: ${schedule.tag}` : 'Lista Estática'}
                                        </p>
                                    </div>
                                    <div className="flex flex-col gap-2 shrink-0">
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={() => setSelectedSchedule({ ...schedule, type: 'trigger' })}
                                                className="w-10 h-10 bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-white rounded-xl flex items-center justify-center transition-all active:scale-90 border border-amber-500/20 shadow-lg"
                                                title="Disparar Agora (Manual 1 vez)"
                                                disabled={isTriggering}
                                            >
                                                <FiZap size={16} className={isTriggering ? 'animate-pulse' : ''} />
                                            </button>
                                            <button 
                                                onClick={() => fetchContacts(schedule.id)}
                                                className="w-10 h-10 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white rounded-xl flex items-center justify-center transition-all active:scale-90 border border-blue-500/20 shadow-lg"
                                                title="Ver Contatos"
                                            >
                                                <FiUsers size={16} />
                                            </button>
                                            <button 
                                                onClick={() => openEdit(schedule)}
                                                className="w-10 h-10 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl flex items-center justify-center transition-all active:scale-90 border border-white/5 shadow-lg"
                                                title="Editar Agendamento"
                                            >
                                                <FiEdit2 size={16} />
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-2 justify-end">
                                            <button 
                                                onClick={() => handleToggleStatus(schedule)}
                                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 border shadow-lg ${schedule.is_active ? 'bg-white text-slate-900 border-white hover:bg-slate-100' : 'bg-emerald-500 text-white border-emerald-400 hover:bg-emerald-400'}`}
                                                title={schedule.is_active ? 'Desativar' : 'Ativar'}
                                            >
                                                {schedule.is_active ? <FiXCircle size={18} /> : <FiPlay size={18} />}
                                            </button>
                                            <button 
                                                onClick={() => setSelectedSchedule({ ...schedule, type: 'delete' })}
                                                className="w-10 h-10 bg-slate-800 hover:bg-red-500 text-slate-400 hover:text-white rounded-xl flex items-center justify-center transition-all active:scale-90 border border-white/5 shadow-lg"
                                                title="Excluir"
                                            >
                                                <FiTrash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-black/20 p-4 rounded-2xl border border-white/5 space-y-1">
                                        <div className="flex items-center gap-2 text-slate-500 uppercase text-[8px] font-black tracking-widest">
                                            <FiClock size={10} className="text-blue-500" />
                                            Horário
                                        </div>
                                        <div className="text-lg font-black text-white tabular-nums">{schedule.scheduled_time}</div>
                                    </div>
                                    <div className="bg-black/20 p-4 rounded-2xl border border-white/5 space-y-1">
                                        <div className="flex items-center gap-2 text-slate-500 uppercase text-[8px] font-black tracking-widest">
                                            <FiCalendar size={10} className="text-purple-500" />
                                            Execução
                                        </div>
                                         <div className="text-[10px] font-black text-white leading-tight uppercase">
                                            {getScheduleSummary(schedule)}
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <div className="flex items-center justify-between text-[9px] font-black uppercase text-slate-600 tracking-widest px-1">
                                        <span>Última Execução</span>
                                        <span>Próxima Execução</span>
                                    </div>
                                    <div className="flex items-center justify-between mt-2 px-1">
                                        <span className="text-[10px] font-bold text-slate-500 tabular-nums">
                                            {schedule.last_run_at ? new Date(schedule.last_run_at).toLocaleDateString() : '--'}
                                        </span>
                                        <div className="flex-1 h-[1px] bg-white/5 mx-4"></div>
                                        <span className="text-[10px] font-bold text-blue-400 tabular-nums">
                                            {schedule.next_run_at ? new Date(schedule.next_run_at).toLocaleDateString() : '--'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>

            {/* View Contacts Modal */}
            {viewingContacts && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden shadow-2xl relative">
                        <div className="p-8 border-b border-white/5 flex items-center justify-between">
                            <div>
                                <h3 className="text-2xl font-black text-white flex items-center gap-3">
                                    <FiUsers className="text-blue-400" />
                                    Público Alvo
                                </h3>
                                <p className="text-slate-400 text-xs mt-1">
                                    {viewingContacts.mode === 'tag' 
                                        ? `Contatos atuais com a etiqueta: ${viewingContacts.tag}` 
                                        : 'Lista estática de destinatários'}
                                </p>
                            </div>
                            <button onClick={() => setViewingContacts(null)} className="p-3 hover:bg-white/5 rounded-2xl transition-colors">
                                <FiX className="text-slate-400" />
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {viewingContacts.contacts.length === 0 ? (
                                <div className="text-center py-20 text-slate-500 font-bold uppercase tracking-widest text-xs">
                                    Nenhum contato encontrado
                                </div>
                            ) : (
                                viewingContacts.contacts.map((contact, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all">
                                        <div className="space-y-0.5">
                                            <div className="text-sm font-black text-white">{contact.name}</div>
                                            <div className="text-[10px] text-slate-500 font-bold">{contact.email || '-'}</div>
                                        </div>
                                        <div className="text-blue-400 font-black text-xs tabular-nums">{contact.phone}</div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="p-6 bg-slate-800/40 border-t border-white/5 flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                Total de contatos: <span className="text-white text-sm">{viewingContacts.count}</span>
                            </span>
                            <button 
                                onClick={() => setViewingContacts(null)}
                                className="px-8 py-3 bg-white text-slate-900 rounded-2xl font-black text-xs hover:bg-slate-100 transition-all active:scale-95 shadow-xl"
                            >
                                FECHAR
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Manual Trigger Modal */}
            {selectedSchedule?.type === 'trigger' && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in zoom-in-95 duration-300">
                    <div className="bg-slate-900 border border-amber-500/20 rounded-[3rem] w-full max-w-md p-10 text-center space-y-8 shadow-[0_0_50px_rgba(245,158,11,0.1)]">
                        <div className="w-20 h-20 bg-amber-500/10 text-amber-500 rounded-[2rem] flex items-center justify-center mx-auto border border-amber-500/20 shadow-2xl shadow-amber-500/10">
                            <FiZap size={40} />
                        </div>
                        <div className="space-y-3">
                            <h3 className="text-2xl font-black text-white">Disparar Agora?</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                Isso criará uma execução manual do template <strong>{selectedSchedule.template_name?.split('|').pop()}</strong> para todos os contatos vinculados agora.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <button 
                                onClick={() => setSelectedSchedule(null)}
                                className="py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-[1.5rem] font-black text-xs transition-all active:scale-95 uppercase tracking-widest"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={() => {
                                    handleManualTrigger(selectedSchedule.id);
                                    setSelectedSchedule(null);
                                }}
                                disabled={isTriggering}
                                className="py-4 bg-amber-600 hover:bg-amber-500 text-white rounded-[1.5rem] font-black text-xs transition-all active:scale-95 shadow-xl shadow-amber-900/40 uppercase tracking-widest flex items-center justify-center gap-2"
                            >
                                {isTriggering && <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
                                CONFIRMAR DISPARO
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Delete Modal */}
            {selectedSchedule?.type === 'delete' && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in zoom-in-95 duration-300">
                    <div className="bg-slate-900 border border-red-500/20 rounded-[3rem] w-full max-w-md p-10 text-center space-y-8 shadow-[0_0_50px_rgba(239,68,68,0.1)]">
                        <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-[2rem] flex items-center justify-center mx-auto border border-red-500/20 shadow-2xl shadow-red-500/10">
                            <FiTrash2 size={40} />
                        </div>
                        <div className="space-y-3">
                            <h3 className="text-2xl font-black text-white">Excluir Agendamento?</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                Tem certeza que deseja remover permanentemente este disparo recorrente? Esta ação não pode ser desfeita.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <button 
                                onClick={() => setSelectedSchedule(null)}
                                className="py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-[1.5rem] font-black text-xs transition-all active:scale-95 uppercase tracking-widest"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={() => handleDelete(selectedSchedule.id)}
                                disabled={isDeleting}
                                className="py-4 bg-red-600 hover:bg-red-500 text-white rounded-[1.5rem] font-black text-xs transition-all active:scale-95 shadow-xl shadow-red-900/40 uppercase tracking-widest flex items-center justify-center gap-2"
                            >
                                {isDeleting && <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
                                Excluir Agora
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {selectedSchedule && !selectedSchedule.type && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in zoom-in-95 duration-300">
                    <div className="bg-slate-900 border border-white/10 rounded-[3rem] w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
                        <div className="p-8 border-b border-white/5 bg-slate-800/40">
                            <h3 className="text-2xl font-black text-white flex items-center gap-3">
                                <FiEdit2 className="text-blue-400" />
                                Editar Agendamento
                            </h3>
                            <p className="text-slate-400 text-xs mt-1">Ajuste a periodicidade e o horário do disparo.</p>
                        </div>

                        <div className="p-8 space-y-8 flex-1 overflow-y-auto premium-scrollbar">
                            <div className="grid grid-cols-2 gap-4">
                                <button 
                                    onClick={() => {
                                        setEditFreq('weekly');
                                        setEditDays([]);
                                    }}
                                    className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${editFreq === 'weekly' ? 'bg-blue-500 border-blue-400 text-white shadow-xl translate-y-[-2px]' : 'bg-black/20 border-white/5 text-slate-500 hover:bg-black/40'}`}
                                >
                                    Semanal
                                </button>
                                <button 
                                    onClick={() => {
                                        setEditFreq('monthly');
                                        setEditDays([]);
                                        setEditDayOfMonth("");
                                    }}
                                    className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${editFreq === 'monthly' ? 'bg-blue-500 border-blue-400 text-white shadow-xl translate-y-[-2px]' : 'bg-black/20 border-white/5 text-slate-500 hover:bg-black/40'}`}
                                >
                                    Mensal
                                </button>
                            </div>

                            {editFreq === 'weekly' ? (
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Dias da Semana</label>
                                        <div className="flex flex-wrap gap-2 justify-between">
                                            {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((day, idx) => {
                                                const isSelected = editDays.some(d => d.day === idx);
                                                return (
                                                    <button
                                                        key={idx}
                                                        onClick={() => {
                                                            if (isSelected) {
                                                                setEditDays(prev => prev.filter(d => d.day !== idx));
                                                            } else {
                                                                setEditDays(prev => [...prev, { day: idx, time: editTime }].sort((a, b) => a.day - b.day));
                                                            }
                                                        }}
                                                        className={`w-11 h-11 rounded-[1.2rem] flex items-center justify-center font-black text-xs transition-all shadow-md ${isSelected ? 'bg-blue-600 text-white shadow-blue-900/40 ring-2 ring-blue-400/20' : 'bg-black/40 text-slate-600 hover:bg-black/60'}`}
                                                    >
                                                        {day}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between px-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Dias do Mês</label>
                                        <span className="text-[8px] text-slate-500 font-bold uppercase italic">Ex: 1, 15, 30</span>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="1, 15, 30"
                                        value={editDayOfMonth}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setEditDayOfMonth(val);
                                            // Update editDays (shared state) to reflect these monthly days
                                            const dayNumbers = val.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d) && d >= 1 && d <= 31);
                                            const newEditDays = dayNumbers.map(d => {
                                                const existing = editDays.find(ed => ed.day === d);
                                                return existing || { day: d, time: editTime };
                                            });
                                            setEditDays(newEditDays);
                                        }}
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-bold text-xl outline-none focus:border-blue-500/50 shadow-inner"
                                    />
                                </div>
                            )}

                            {editDays.length > 0 && (
                                <div className="space-y-3 pt-4 border-t border-white/5">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest text-center block">Horários Específicos por Dia</label>
                                    <div className="grid grid-cols-1 gap-2">
                                        {editDays.map((dayConfig, i) => (
                                            <div key={i} className="flex items-center justify-between bg-black/20 p-3 rounded-2xl border border-white/5">
                                                <span className="text-[10px] font-black text-white uppercase">
                                                    {editFreq === 'weekly' 
                                                        ? ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'][dayConfig.day]
                                                        : `Dia ${dayConfig.day}`
                                                    }
                                                </span>
                                                <input 
                                                    type="time" 
                                                    value={dayConfig.time}
                                                    onChange={(e) => {
                                                        const newDays = [...editDays];
                                                        newDays[i].time = e.target.value;
                                                        setEditDays(newDays);
                                                    }}
                                                    className="bg-slate-800 text-white font-bold text-xs p-2 rounded-xl outline-none focus:ring-1 ring-blue-500/50"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">{editFreq === 'weekly' ? 'Horário Padrão (Fallback)' : 'Horário Padrão para Novos Dias'}</label>
                                <input
                                    type="time"
                                    value={editTime}
                                    onChange={(e) => {
                                        setEditTime(e.target.value);
                                        // Optional: Do NOT auto-update existing specific times unless user wants
                                    }}
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-bold text-xl outline-none focus:border-blue-500/50 shadow-inner"
                                />
                            </div>
                        </div>

                        <div className="p-8 bg-slate-800/40 border-t border-white/5 grid grid-cols-2 gap-4">
                            <button 
                                onClick={() => setSelectedSchedule(null)}
                                className="py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-[1.5rem] font-black text-xs transition-all active:scale-95 uppercase tracking-widest"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleUpdate}
                                disabled={isEditing || (editFreq === 'weekly' && editDays.length === 0)}
                                className="py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-[1.5rem] font-black text-xs transition-all active:scale-95 shadow-xl shadow-blue-900/40 uppercase tracking-widest border border-blue-400/20 flex items-center justify-center gap-2"
                            >
                                {isEditing && <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
                                Salvar Alterações
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
