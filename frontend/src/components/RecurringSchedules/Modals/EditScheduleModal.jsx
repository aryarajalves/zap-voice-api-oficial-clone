import React from 'react';
import { FiEdit2 } from 'react-icons/fi';

export function EditScheduleModal({
    selectedSchedule,
    editFreq,
    setEditFreq,
    editDays,
    setEditDays,
    editDayOfMonth,
    setEditDayOfMonth,
    editTime,
    setEditTime,
    onCancel,
    onSave,
    isEditing
}) {
    if (!selectedSchedule || selectedSchedule.type) return null;

    return (
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
                            type="button"
                            onClick={() => { setEditFreq('weekly'); setEditDays([]); }}
                            className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all cursor-pointer ${editFreq === 'weekly' ? 'bg-blue-500 border-blue-400 text-white shadow-xl translate-y-[-2px]' : 'bg-black/20 border-white/5 text-slate-500 hover:bg-black/40'}`}
                        >
                            Semanal
                        </button>
                        <button 
                            type="button"
                            onClick={() => { setEditFreq('monthly'); setEditDays([]); setEditDayOfMonth(""); }}
                            className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all cursor-pointer ${editFreq === 'monthly' ? 'bg-blue-500 border-blue-400 text-white shadow-xl translate-y-[-2px]' : 'bg-black/20 border-white/5 text-slate-500 hover:bg-black/40'}`}
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
                                                type="button"
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setEditDays(prev => prev.filter(d => d.day !== idx));
                                                    } else {
                                                        setEditDays(prev => [...prev, { day: idx, time: editTime }].sort((a, b) => a.day - b.day));
                                                    }
                                                }}
                                                className={`w-11 h-11 rounded-[1.2rem] flex items-center justify-center font-black text-xs transition-all shadow-md cursor-pointer ${isSelected ? 'bg-blue-600 text-white shadow-blue-900/40 ring-2 ring-blue-400/20' : 'bg-black/40 text-slate-600 hover:bg-black/60'}`}
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

                </div>

                <div className="p-8 bg-slate-800/40 border-t border-white/5 grid grid-cols-2 gap-4">
                    <button 
                        type="button"
                        onClick={onCancel}
                        className="py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-[1.5rem] font-black text-xs transition-all active:scale-95 uppercase tracking-widest cursor-pointer"
                    >
                        Cancelar
                    </button>
                    <button 
                        type="button"
                        onClick={onSave}
                        disabled={isEditing || (editFreq === 'weekly' && editDays.length === 0)}
                        className="py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-[1.5rem] font-black text-xs transition-all active:scale-95 shadow-xl shadow-blue-900/40 uppercase tracking-widest border border-blue-400/20 flex items-center justify-center gap-2 cursor-pointer"
                    >
                        {isEditing && <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
                        Salvar Alterações
                    </button>
                </div>
            </div>
        </div>
    );
}
