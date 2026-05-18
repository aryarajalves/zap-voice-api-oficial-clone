import React from 'react';
import { FiClock, FiCalendar, FiUsers, FiEdit2, FiXCircle, FiPlay, FiTrash2, FiZap, FiFilter, FiEye } from 'react-icons/fi';

export function ScheduleCard({ schedule, onTrigger, onFetchContacts, onOpenEdit, onToggleStatus, onConfirmDelete, onViewMessage, isTriggering }) {
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

    return (
        <div 
            className={`relative group overflow-hidden bg-slate-900/60 backdrop-blur-xl border-2 rounded-[2.5rem] p-8 transition-all hover:shadow-2xl hover:shadow-blue-500/10 ${schedule.is_active ? 'border-white/5' : 'border-red-500/10 grayscale opacity-60'}`}
        >
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
                                onClick={() => onViewMessage(schedule)}
                                className="w-10 h-10 bg-purple-500/10 hover:bg-purple-500 text-purple-400 hover:text-white rounded-xl flex items-center justify-center transition-all active:scale-90 border border-purple-500/20 shadow-lg"
                                title="Ver Conteúdo / Alterar Template"
                            >
                                <FiEye size={16} />
                            </button>
                            <button 
                                onClick={() => onTrigger(schedule)}
                                className="w-10 h-10 bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-white rounded-xl flex items-center justify-center transition-all active:scale-90 border border-amber-500/20 shadow-lg"
                                title="Disparar Agora (Manual 1 vez)"
                                disabled={isTriggering}
                            >
                                <FiZap size={16} className={isTriggering ? 'animate-pulse' : ''} />
                            </button>
                            <button 
                                onClick={() => onFetchContacts(schedule.id)}
                                className="w-10 h-10 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white rounded-xl flex items-center justify-center transition-all active:scale-90 border border-blue-500/20 shadow-lg"
                                title="Ver Contatos"
                            >
                                <FiUsers size={16} />
                            </button>
                            <button 
                                onClick={() => onOpenEdit(schedule)}
                                className="w-10 h-10 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl flex items-center justify-center transition-all active:scale-90 border border-white/5 shadow-lg"
                                title="Editar Agendamento"
                            >
                                <FiEdit2 size={16} />
                            </button>
                        </div>
                        <div className="flex items-center gap-2 justify-end">
                            <button 
                                onClick={() => onToggleStatus(schedule)}
                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 border shadow-lg ${schedule.is_active ? 'bg-white text-slate-900 border-white hover:bg-slate-100' : 'bg-emerald-500 text-white border-emerald-400 hover:bg-emerald-400'}`}
                                title={schedule.is_active ? 'Desativar' : 'Ativar'}
                            >
                                {schedule.is_active ? <FiXCircle size={18} /> : <FiPlay size={18} />}
                            </button>
                            <button 
                                onClick={() => onConfirmDelete(schedule)}
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
    );
}
