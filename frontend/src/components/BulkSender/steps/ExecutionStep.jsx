import React from 'react';
import RecipientSelector from '../../RecipientSelector';
import ExclusionListManager from './ExclusionListManager';
import SchedulingSection from './SchedulingSection';

const ExecutionStep = ({
    activeClient,
    finalContacts,
    setFinalContacts,
    selectionMetadata,
    setSelectionMetadata,
    templateVariables,
    isSending,
    delaySeconds,
    setDelaySeconds,
    delayUnit,
    setDelayUnit,
    concurrency,
    setConcurrency,
    handleSend,
    handleCopyFinalList,
    exclusionList,
    setExclusionList,
    exclusionMode,
    setExclusionMode,
    exclusionText,
    setExclusionText,
    handleSaveExclusion,
    add55ToExclusionText,
    handleExclusionFileUpload,
    exclusionColSelector,
    setExclusionColSelector,
    exclusionCsvData,
    exclusionSelectedCol,
    setExclusionSelectedCol,
    confirmExclusionColumn,
    selectedExclusionTag,
    setSelectedExclusionTag,
    isLoadingExclusionTags,
    exclusionAvailableTags,
    loadExclusionContactsByTag,
    add55ToLoadedExclusionList,
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
    setStep
}) => {
    return (
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-10">
            {/* Contacts Column */}
            <section className="xl:col-span-3 bg-slate-900/60 backdrop-blur-md rounded-[2.5rem] p-10 shadow-2xl border border-white/5 h-fit relative overflow-hidden group/contacts">
                <div className="absolute -top-12 -left-12 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full"></div>
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-10 gap-4 relative z-10">
                    <h2 className="text-2xl font-black text-white flex items-center gap-4">
                        <span className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20 shadow-xl shadow-blue-500/10">03</span>
                        Base de Contatos
                    </h2>
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Selecionado</span>
                            <span className="text-2xl font-black text-white tabular-nums">{finalContacts.length} <span className="text-blue-400 text-xs">Leads</span></span>
                        </div>
                    </div>
                </div>

                <div className="relative z-10">
                    <RecipientSelector 
                        activeClient={activeClient}
                        selectedInbox={selectionMetadata?.inbox_id}
                        onSelect={setFinalContacts}
                        templateVariables={templateVariables}
                    />
                </div>

                <ExclusionListManager 
                    exclusionList={exclusionList}
                    setExclusionList={setExclusionList}
                    exclusionMode={exclusionMode}
                    setExclusionMode={setExclusionMode}
                    exclusionText={exclusionText}
                    setExclusionText={setExclusionText}
                    handleSaveExclusion={handleSaveExclusion}
                    add55ToExclusionText={add55ToExclusionText}
                    handleExclusionFileUpload={handleExclusionFileUpload}
                    exclusionColSelector={exclusionColSelector}
                    setExclusionColSelector={setExclusionColSelector}
                    exclusionCsvData={exclusionCsvData}
                    exclusionSelectedCol={exclusionSelectedCol}
                    setExclusionSelectedCol={setExclusionSelectedCol}
                    confirmExclusionColumn={confirmExclusionColumn}
                    selectedExclusionTag={selectedExclusionTag}
                    setSelectedExclusionTag={setSelectedExclusionTag}
                    isLoadingExclusionTags={isLoadingExclusionTags}
                    exclusionAvailableTags={exclusionAvailableTags}
                    loadExclusionContactsByTag={loadExclusionContactsByTag}
                    add55ToLoadedExclusionList={add55ToLoadedExclusionList}
                    isWorking={isSending}
                />
            </section>

            {/* Config & Send Column */}
            <div className="xl:col-span-2 space-y-8">
                <section className="bg-slate-900/60 backdrop-blur-md rounded-[2.5rem] p-10 shadow-2xl border border-white/5 h-fit relative overflow-hidden group/exec">
                    <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full"></div>
                    
                    <h2 className="text-2xl font-black text-white flex items-center gap-4 mb-10 relative z-10">
                        <span className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20 shadow-xl shadow-emerald-500/10">04</span>
                        Configuração de Envio
                    </h2>

                    <div className="space-y-8 relative z-10">
                        <div className="grid grid-cols-2 gap-5">
                            <div className="p-5 bg-slate-800/40 border border-white/5 rounded-3xl group/param transition-all hover:bg-slate-800/60">
                                <label className="block text-[9px] font-black text-slate-600 uppercase mb-3 px-1 tracking-widest group-hover/param:text-emerald-400 transition-colors">Atraso de Envio</label>
                                <div className="flex items-center gap-3 bg-black/40 p-2.5 rounded-2xl border border-white/5 shadow-inner">
                                    <input 
                                        type="number" 
                                        className="flex-1 bg-transparent outline-none font-black text-xl text-white tabular-nums w-12"
                                        value={delaySeconds}
                                        onChange={(e) => setDelaySeconds(parseInt(e.target.value))}
                                    />
                                    <select 
                                        className="bg-slate-700 text-[10px] font-black text-slate-200 outline-none px-3 py-1.5 rounded-xl border border-white/10"
                                        value={delayUnit}
                                        onChange={(e) => setDelayUnit(e.target.value)}
                                    >
                                        <option value="seconds">SEG</option>
                                        <option value="minutes">MIN</option>
                                    </select>
                                </div>
                            </div>
                            <div className="p-5 bg-slate-800/40 border border-white/5 rounded-3xl group/param transition-all hover:bg-slate-800/60">
                                <label className="block text-[9px] font-black text-slate-600 uppercase mb-3 px-1 tracking-widest group-hover/param:text-emerald-400 transition-colors">Concorrência</label>
                                <div className="bg-black/40 p-2.5 rounded-2xl border border-white/5 shadow-inner flex items-center">
                                    <input 
                                        type="number" 
                                        className="w-full bg-transparent outline-none font-black text-xl text-white tabular-nums"
                                        value={concurrency}
                                        onChange={(e) => setConcurrency(parseInt(e.target.value))}
                                    />
                                    <span className="text-[10px] font-black text-slate-700 uppercase">Jobs</span>
                                </div>
                            </div>
                        </div>

                        <SchedulingSection 
                            isRecurring={isRecurring}
                            setIsRecurring={setIsRecurring}
                            setScheduledTime={setScheduledTime}
                            recurrenceFrequency={recurrenceFrequency}
                            setRecurrenceFrequency={setRecurrenceFrequency}
                            recurrenceDaysOfWeek={recurrenceDaysOfWeek}
                            setRecurrenceDaysOfWeek={setRecurrenceDaysOfWeek}
                            recurrenceTime={recurrenceTime}
                            setRecurrenceTime={setRecurrenceTime}
                            recurrenceDayOfMonth={recurrenceDayOfMonth}
                            setRecurrenceDayOfMonth={setRecurrenceDayOfMonth}
                            scheduledTime={scheduledTime}
                        />

                        <div className="flex flex-col gap-4 pt-6">
                            <button
                                onClick={handleSend}
                                disabled={isSending || finalContacts.length === 0}
                                className={`w-full py-7 rounded-[2rem] font-black text-xl uppercase tracking-[0.4em] shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-6 group relative overflow-hidden ${isSending ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-emerald-900/40'}`}
                            >
                                <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 skew-x-12"></div>
                                {isSending ? 'Processando...' : scheduledTime || isRecurring ? 'Agendar Disparo' : 'Iniciar Disparo'}
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className={isSending ? 'animate-spin' : 'group-hover:translate-x-2 transition-transform'}><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                            </button>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setStep(1)}
                                    className="py-4 bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-white rounded-2xl font-black text-[10px] uppercase tracking-widest border border-white/5 transition-all"
                                >
                                    Voltar Etapa
                                </button>
                                <button
                                    onClick={handleCopyFinalList}
                                    className="py-4 bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-white rounded-2xl font-black text-[10px] uppercase tracking-widest border border-white/5 transition-all flex items-center justify-center gap-2"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                                    Copiar Lista
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="p-8 bg-blue-500/5 rounded-[2.5rem] border border-blue-500/10">
                    <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                        Dica de Segurança
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed font-medium">
                        Recomendamos um intervalo de pelo menos <b className="text-white">15 segundos</b> para disparos acima de 500 contatos para evitar o bloqueio preventivo da Meta.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ExecutionStep;
