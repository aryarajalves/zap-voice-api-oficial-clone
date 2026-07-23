import React from 'react';

const SchedulingSection = ({
    isRecurring,
    setIsRecurring,
    setScheduledTime,
    recurrenceFrequency,
    setRecurrenceFrequency,
    recurrenceDaysOfWeek,
    setRecurrenceDaysOfWeek,
    recurrenceTime,
    setRecurrenceTime,
    recurrenceDayOfMonth,
    setRecurrenceDayOfMonth,
    scheduledTime,
    isDynamicLabel,
    setIsDynamicLabel,
    selectionMetadata,
    selectedChatwootLabels
}) => {


    return (
        <div className="space-y-6">
            <div className={`p-6 rounded-[2.5rem] border-2 transition-all shadow-lg group/recurrence ${isRecurring ? 'bg-blue-500/5 border-blue-500/30' : 'bg-slate-800/40 border-white/5 hover:border-white/10'}`}>
                <div className="flex items-center justify-between mb-6">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] group-hover/recurrence:text-slate-200 transition-colors flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg transition-all ${isRecurring ? 'bg-blue-500 text-white shadow-lg' : 'bg-slate-700 text-slate-500'}`}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M17 2.1l4 4-4 4M3 12.2v-2a4 4 0 0 1 4-4h12.8M7 21.9l-4-4 4-4M21 11.8v2a4 4 0 0 1-4 4H4.2" /></svg>
                        </div>
                        Disparo Recorrente
                    </label>
                    <div 
                        onClick={() => {
                            const newVal = !isRecurring;
                            setIsRecurring(newVal);
                            if (newVal) setScheduledTime('');
                        }}
                        className={`w-14 h-7 rounded-full relative cursor-pointer transition-all duration-500 ${isRecurring ? 'bg-blue-600 shadow-lg shadow-blue-900/40' : 'bg-slate-800 border border-white/5'}`}
                    >
                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all duration-500 shadow-md ${isRecurring ? 'left-8' : 'left-1'}`}></div>
                    </div>
                </div>

                {isRecurring && (
                    <div className="space-y-6 animate-in slide-in-from-top-4 fade-in duration-500">
                        <div className="grid grid-cols-2 gap-4">
                            <button 
                                onClick={() => setRecurrenceFrequency('weekly')}
                                className={`py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${recurrenceFrequency === 'weekly' ? 'bg-blue-500 border-blue-400 text-white shadow-lg' : 'bg-black/20 border-white/5 text-slate-500 hover:text-slate-300'}`}
                            >
                                Semanal
                            </button>
                            <button 
                                onClick={() => setRecurrenceFrequency('monthly')}
                                className={`py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${recurrenceFrequency === 'monthly' ? 'bg-blue-500 border-blue-400 text-white shadow-lg' : 'bg-black/20 border-white/5 text-slate-500 hover:text-slate-300'}`}
                            >
                                Mensal
                            </button>
                        </div>

                        {recurrenceFrequency === 'weekly' ? (
                            <div className="space-y-4">
                                <div className="flex flex-wrap gap-2 justify-center">
                                    {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((day, idx) => {
                                        const isSelected = recurrenceDaysOfWeek.some(d => d.day === idx);
                                        return (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setRecurrenceDaysOfWeek(prev => prev.filter(d => d.day !== idx));
                                                    } else {
                                                        setRecurrenceDaysOfWeek(prev => [...prev, { day: idx, time: recurrenceTime }].sort((a, b) => a.day - b.day));
                                                    }
                                                }}
                                                className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs transition-all ${isSelected ? 'bg-blue-500 text-white shadow-md border-blue-400/30' : 'bg-black/40 text-slate-600 hover:bg-black/60 border border-white/5'}`}
                                                title={['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'][idx]}
                                            >
                                                {day}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between px-1">
                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Dias do Mês</label>
                                        <span className="text-[8px] text-slate-500 font-bold uppercase italic">Ex: 1, 15, 30</span>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="1, 15, 30"
                                        value={recurrenceDayOfMonth}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setRecurrenceDayOfMonth(val);
                                            const dayNumbers = val.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d) && d >= 1 && d <= 31);
                                            const newDays = dayNumbers.map(d => {
                                                const existing = recurrenceDaysOfWeek.find(ed => ed.day === d);
                                                return existing || { day: d, time: recurrenceTime };
                                            });
                                            setRecurrenceDaysOfWeek(newDays);
                                        }}
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-blue-500/50 shadow-inner"
                                    />
                                </div>
                            </div>
                        )}

                        {recurrenceDaysOfWeek.length > 0 && (
                            <div className="space-y-3 pt-4 border-t border-white/10">
                                <label className="text-[9px] font-black text-slate-500 uppercase px-1 tracking-widest text-center block">Horários por Dia</label>
                                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto premium-scrollbar pr-1">
                                    {recurrenceDaysOfWeek.map((dayConfig, i) => (
                                        <div key={i} className="flex items-center justify-between bg-black/40 p-3 rounded-2xl border border-white/5 shadow-sm">
                                            <span className="text-[10px] font-black text-slate-300 uppercase">
                                                {recurrenceFrequency === 'weekly' 
                                                    ? ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'][dayConfig.day]
                                                    : `Dia ${dayConfig.day}`
                                                }
                                            </span>
                                            <input 
                                                type="time" 
                                                value={dayConfig.time}
                                                onChange={(e) => {
                                                    const newDays = [...recurrenceDaysOfWeek];
                                                    newDays[i].time = e.target.value;
                                                    setRecurrenceDaysOfWeek(newDays);
                                                }}
                                                className="bg-slate-800 text-white font-bold text-xs p-2 rounded-xl outline-none focus:ring-1 ring-blue-500/50"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                    </div>
                )}
            </div>

            {!isRecurring && (
                <div className="px-2 space-y-4">
                    <div className="p-6 bg-slate-800/40 border border-white/5 rounded-[2.5rem] group/input focus-within:border-emerald-500/50 transition-all shadow-lg">
                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-4 tracking-[0.2em] group-hover/input:text-slate-200 transition-colors flex items-center gap-2">
                            <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-400">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2v20M2 12h20M12 2a10 10 0 0 1 10 10 10 10 0 0 1-10 10 10 10 0 0 1-10-10 10 10 0 0 1 10-10z" /></svg>
                            </div>
                            Agendamento para o Futuro
                        </label>
                        <div className="bg-black/40 p-4 rounded-2xl border border-white/5 shadow-inner space-y-3">
                            <input
                                type="datetime-local"
                                className="w-full bg-transparent outline-none font-bold text-base sm:text-lg text-white placeholder:text-slate-800 cursor-pointer"
                                value={scheduledTime}
                                onChange={(e) => setScheduledTime(e.target.value)}
                                min={new Date().toISOString().slice(0, 16)}
                            />
                            {scheduledTime && (
                                <button
                                    type="button"
                                    onClick={() => setScheduledTime('')}
                                    className="w-full py-2.5 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-950/20 active:scale-98"
                                    title="Remover agendamento para disparar imediatamente"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                    Remover Agendamento (Disparar Agora)
                                </button>
                            )}
                        </div>


                        {!scheduledTime && (
                            <p className="mt-2 text-[11px] font-bold text-emerald-400 flex items-center gap-1.5 px-1">
                                <span>⚡</span> Disparo Imediato: O envio começará assim que você clicar em "Iniciar Disparo em Massa".
                            </p>
                        )}


                        {(selectionMetadata?.mode === 'tag' || selectionMetadata?.tag || (selectedChatwootLabels && selectedChatwootLabels.length > 0)) && (
                            <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between transition-all shadow-inner">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-white">Atualizar contatos da etiqueta no disparo 🔄</p>
                                        <p className="text-[10px] font-medium text-slate-300 leading-relaxed">
                                            Re-consulta o Chatwoot no momento exato do envio para incluir novos leads que entrarem na etiqueta
                                        </p>
                                    </div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={isDynamicLabel !== false}
                                    onChange={(e) => setIsDynamicLabel && setIsDynamicLabel(e.target.checked)}
                                    className="w-5 h-5 accent-emerald-500 rounded cursor-pointer flex-shrink-0"
                                />
                            </div>
                        )}
                    </div>
                </div>

            )}
        </div>
    );
};


export default SchedulingSection;
