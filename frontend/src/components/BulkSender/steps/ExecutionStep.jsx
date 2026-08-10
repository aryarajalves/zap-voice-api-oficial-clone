import React from 'react';
import RecipientSelector from '../../RecipientSelector';
import ExclusionListManager from './ExclusionListManager';
import SchedulingSection from './SchedulingSection';
import ButtonActionsSection from './ButtonActionsSection';
import { getTemplateCategoryInfo } from '../utils/templateUtils';

const ExecutionStep = ({
    activeClient,
    finalContacts = [],
    setFinalContacts,
    selectionMetadata = {},
    setSelectionMetadata,
    templateVariables = [],
    isSending = false,
    delaySeconds = 5,
    setDelaySeconds,
    delayUnit = 'seconds',
    setDelayUnit,
    concurrency = 10,
    setConcurrency,
    handleSend,
    handleCopyFinalList,
    exclusionList = [],
    setExclusionList,
    exclusionMode = 'manual',
    setExclusionMode,
    exclusionText = '',
    setExclusionText,
    handleSaveExclusion,
    add55ToExclusionText,
    handleExclusionFileUpload,
    exclusionColSelector = false,
    setExclusionColSelector,
    exclusionCsvData,
    exclusionSelectedCol,
    setExclusionSelectedCol,
    confirmExclusionColumn,
    selectedExclusionTag = [],
    setSelectedExclusionTag,
    exclusionTagMode = 'OR',
    setExclusionTagMode,
    isLoadingExclusionTags = false,
    exclusionAvailableTags = [],
    loadExclusionContactsByTag,
    add55ToLoadedExclusionList,
    isRecurring = false,
    setIsRecurring,
    setScheduledTime,
    recurrenceFrequency = 'weekly',
    setRecurrenceFrequency,
    recurrenceDaysOfWeek = [],
    setRecurrenceDaysOfWeek,
    recurrenceTime = '09:00',
    setRecurrenceTime,
    recurrenceDayOfMonth = '',
    setRecurrenceDayOfMonth,
    scheduledTime = '',
    isDynamicLabel = true,
    setIsDynamicLabel,
    selectedChatwootLabels = [],
    setStep,

    templateButtons = [],
    buttonActions = {},
    setButtonActions,
    funnels = [],
    selectedTemplate = '',
    templates = [],
    whatsappProfile = null
}) => {
    const [showQualityWarningModal, setShowQualityWarningModal] = React.useState(false);

    const safeContacts = Array.isArray(finalContacts) ? finalContacts : [];
    const categoryInfo = getTemplateCategoryInfo(selectedTemplate, templates || []) || { type: 'Outros', price: 0.10, key: 'OTHERS' };
    const estimatedCost = safeContacts.length * (categoryInfo.price || 0);
    const formatBRL = (val) => (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const handleSendWithQualityCheck = () => {
        // Se a qualidade for LOW (ou vermelha/ruim), abrimos o popup
        const quality = String(whatsappProfile?.quality_rating || '').toUpperCase();
        if (quality === 'LOW' || quality === 'RED' || quality === 'BAD') {
            setShowQualityWarningModal(true);
        } else {
            handleSend();
        }
    };

    const confirmSend = () => {
        setShowQualityWarningModal(false);
        handleSend();
    };

    return (
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-10">
            {/* Modal de confirmação de qualidade de número */}
            {showQualityWarningModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-red-500/30 w-full max-w-md rounded-[2rem] p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 text-red-500 mb-4">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                <line x1="12" y1="9" x2="12" y2="13" />
                                <line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                            <h3 className="text-lg font-black uppercase tracking-wider">Aviso de Qualidade Baixa</h3>
                        </div>
                        <p className="text-slate-300 text-sm leading-relaxed mb-6">
                            A qualidade atual deste número no WhatsApp é considerada <b className="text-red-400 uppercase">{whatsappProfile?.quality_rating === 'MEDIUM' ? 'Média' : 'Baixa'}</b>.
                            Fazer disparos em massa nessas condições aumenta drasticamente os riscos de banimento permanente do seu número pela Meta.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={() => setShowQualityWarningModal(false)}
                                className="flex-1 py-3.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all border border-white/5"
                            >
                                Cancelar Disparo
                            </button>
                            <button
                                onClick={confirmSend}
                                className="flex-1 py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-red-950/40"
                            >
                                Confirmar e Enviar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Contacts Column */}
            <section className="xl:col-span-3 bg-slate-900/60 backdrop-blur-md rounded-[2.5rem] p-10 shadow-2xl border border-white/5 h-fit relative group/contacts">
                <div className="absolute -top-12 -left-12 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full"></div>
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-10 gap-4 relative z-10">
                    <h2 className="text-2xl font-black text-white flex items-center gap-4">
                        <span className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20 shadow-xl shadow-blue-500/10">02</span>
                        Base de Contatos
                    </h2>
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Selecionado</span>
                            <span className="text-2xl font-black text-white tabular-nums">{safeContacts.length} <span className="text-blue-400 text-xs">Leads</span></span>
                        </div>
                        {safeContacts.length > 0 && (categoryInfo?.price || 0) > 0 && (
                            <div className="flex flex-col items-end pl-6 border-l border-white/5">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Custo Estimado</span>
                                <span className="text-2xl font-black text-amber-400 tabular-nums">{formatBRL(estimatedCost)}</span>
                                <span className="text-[9px] font-bold text-slate-600 mt-0.5">{categoryInfo.type} · {formatBRL(categoryInfo.price)}/msg</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="relative z-20">
                    <RecipientSelector 
                        activeClient={activeClient}
                        selectedInbox={selectionMetadata?.inbox_id}
                        onSelect={setFinalContacts}
                        templateVariables={templateVariables}
                        exclusionList={exclusionList}
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
                    exclusionTagMode={exclusionTagMode}
                    setExclusionTagMode={setExclusionTagMode}
                    isLoadingExclusionTags={isLoadingExclusionTags}
                    exclusionAvailableTags={exclusionAvailableTags}
                    loadExclusionContactsByTag={loadExclusionContactsByTag}
                    add55ToLoadedExclusionList={add55ToLoadedExclusionList}
                    isWorking={isSending}
                />
            </section>

            {/* Config & Send Column */}
            <div className="xl:col-span-2 space-y-8">
                <ButtonActionsSection
                    templateButtons={templateButtons}
                    buttonActions={buttonActions}
                    setButtonActions={setButtonActions}
                    funnels={funnels}
                />

                <section className="bg-slate-900/60 backdrop-blur-md rounded-[2.5rem] p-10 shadow-2xl border border-white/5 h-fit relative overflow-hidden group/exec">
                    <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full"></div>
                    <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-teal-500/5 blur-3xl rounded-full"></div>

                    <div className="flex items-center gap-4 mb-10 relative z-10">
                        <h2 className="text-2xl font-black text-white flex items-center gap-4">
                            <span className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20 shadow-xl shadow-emerald-500/10">03</span>
                            Opções de Disparo
                        </h2>
                    </div>

                    <div className="space-y-6 relative z-10">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Intervalo</label>
                                <div className="bg-black/40 p-2.5 rounded-2xl border border-white/5 shadow-inner flex items-center gap-2">
                                    <input 
                                        type="number" 
                                        className="w-full bg-transparent outline-none font-black text-xl text-white tabular-nums"
                                        value={delaySeconds}
                                        onChange={(e) => setDelaySeconds(parseInt(e.target.value))}
                                    />
                                    <select 
                                        className="bg-slate-800 text-slate-300 font-bold text-xs rounded-xl px-2 py-1 outline-none border border-white/5"
                                        value={delayUnit}
                                        onChange={(e) => setDelayUnit(e.target.value)}
                                    >
                                        <option value="seconds">Seg</option>
                                        <option value="minutes">Min</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Concorrência</label>
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
                            isDynamicLabel={isDynamicLabel}
                            setIsDynamicLabel={setIsDynamicLabel}
                            selectionMetadata={selectionMetadata}
                            selectedChatwootLabels={selectedChatwootLabels}
                        />



                        <div className="flex flex-col gap-4 pt-6">
                            <button
                                onClick={handleSendWithQualityCheck}
                                disabled={isSending}
                                className={`w-full py-7 rounded-[2rem] font-black text-xl uppercase tracking-[0.4em] shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-6 group relative overflow-hidden ${isSending ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-emerald-900/40'}`}
                            >
                                <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 skew-x-12"></div>
                                {isSending ? 'Processando...' : isRecurring ? 'Agendar Disparo Recorrente' : scheduledTime ? 'Agendar Disparo' : 'Iniciar Disparo'}
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
                        Recomendamos um intervalo de pelo menos <b className="text-white">15 seconds</b> para disparos acima de 500 contatos para evitar o bloqueio preventivo da Meta.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ExecutionStep;
