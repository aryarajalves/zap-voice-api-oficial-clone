import React from 'react';
import { toast } from 'react-hot-toast';

// Common Components
import ExpandTextModal from './BulkSender/common/ExpandTextModal';
import BulkGuideModal from './BulkSender/common/BulkGuideModal';
import ProcessingModal from './BulkSender/common/ProcessingModal';

// Steps
import ConfigurationStep from './BulkSender/steps/ConfigurationStep';
import ExecutionStep from './BulkSender/steps/ExecutionStep';

// Hooks
import { useBulkSender } from './BulkSender/hooks/useBulkSender';

const TemplateBulkSender = ({ onViewChange, onSuccess }) => {
    const bulk = useBulkSender(onViewChange, onSuccess);

    const selectedTemplateObj = bulk.templates.find(t => t.name === bulk.selectedTemplate);
    const templateVariables = bulk.extractTemplateVariables(selectedTemplateObj);

    // Helpers
    const handleParamChange = (key, value) => {
        bulk.setTemplateParams(prev => ({ ...prev, [key]: value }));
    };

    const handleSaveExpansion = (key, value) => {
        if (key.startsWith('param_')) {
            const paramKey = key.replace('param_', '');
            handleParamChange(paramKey, value);
        } else if (key === 'privateMessageText') {
            bulk.setPrivateMessageText(value);
        }
    };

    const cloneToPrivateNote = () => {
        const t = bulk.templates.find(x => x.name === bulk.selectedTemplate);
        if (!t) return toast.error("Selecione um template primeiro");
        const body = t.components.find(c => c.type === 'BODY')?.text || "";
        let finalBody = body;
        Object.entries(bulk.templateParams).forEach(([k, v]) => {
            if (k.startsWith('BODY_')) {
                const idx = parseInt(k.split('_')[1]) + 1;
                finalBody = finalBody.replace(`{{${idx}}}`, v || `{{${idx}}}`);
            }
        });
        bulk.setPrivateMessageText(finalBody);
        bulk.setSendPrivateMessage(true);
        toast.success("Template clonado para nota privada!");
    };

    return (
        <div className="space-y-10 p-2 sm:p-4">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-4">
                <div className="space-y-2">
                    <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-4">
                        <span className="p-3 bg-green-500/10 text-green-400 rounded-3xl border border-green-500/20 shadow-2xl shadow-green-500/5">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
                        </span>
                        Disparo em Massa
                    </h1>
                    <p className="text-slate-400 font-medium text-lg ml-1">Configure templates, teste variações e automatize seus envios oficiais.</p>
                </div>
                <div className="flex items-center gap-4">
                    {bulk.step === 2 && (
                        <button
                            onClick={() => bulk.setStep(1)}
                            className="px-8 py-4 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-2xl border border-blue-500/20 flex items-center gap-3 font-black uppercase tracking-widest text-xs transition-all shadow-xl hover:shadow-blue-500/5"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                            Voltar
                        </button>
                    )}
                    <button onClick={() => onViewChange && onViewChange('history')} className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 flex items-center gap-3 font-black uppercase tracking-widest text-xs transition-all shadow-xl hover:shadow-white/5">
                        <span className="text-xl">🕒</span> Histórico
                    </button>
                    <button onClick={() => bulk.setIsGuideOpen(true)} className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 flex items-center gap-3 font-black uppercase tracking-widest text-xs transition-all shadow-xl hover:shadow-white/5">
                        <span className="text-xl">📖</span> Guia de Uso
                    </button>
                </div>
            </div>

            {/* Stepper Visual */}
            <div className="max-w-2xl mx-auto mb-14 relative px-4">
                <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-800 -translate-y-1/2 rounded-full overflow-hidden">
                    <div className={`h-full bg-gradient-to-r from-green-600 to-emerald-500 transition-all duration-1000 ${bulk.step === 2 ? 'w-full' : 'w-1/2'}`}></div>
                </div>
                <div className="relative flex justify-between">
                    {[1, 2].map((s) => (
                        <div key={s} className="flex flex-col items-center gap-3">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg transition-all duration-700 shadow-2xl ${bulk.step >= s ? 'bg-green-600 text-white scale-110 rotate-6 shadow-green-900/40' : 'bg-slate-800 text-slate-500 border border-white/5'}`}>
                                {bulk.step > s ? <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12" /></svg> : s}
                            </div>
                            <span className={`text-[10px] font-black uppercase tracking-[0.2em] transition-all ${bulk.step >= s ? 'text-white' : 'text-slate-600'}`}>{s === 1 ? 'Configuração' : 'Destinatários'}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Steps Rendering */}
            {bulk.step === 1 ? (
                <ConfigurationStep 
                    {...bulk}
                    handleTemplateChange={bulk.handleTemplateChange}
                    selectedTemplateObj={selectedTemplateObj}
                    handleParamChange={handleParamChange}
                    openExpansion={(title, key, value) => bulk.setExpansionModal({ isOpen: true, title, key, value })}
                    cloneToPrivateNote={cloneToPrivateNote}
                />
            ) : (
                <ExecutionStep 
                    {...bulk}
                    templateVariables={templateVariables}
                    selectedInbox={bulk.selectionMetadata?.inbox_id}
                    setFinalContacts={bulk.handleRecipientSelect}
                />
            )}

            {/* Modals */}
            <ExpandTextModal 
                isOpen={bulk.expansionModal.isOpen} 
                onClose={() => bulk.setExpansionModal(prev => ({ ...prev, isOpen: false }))}
                title={bulk.expansionModal.title}
                value={bulk.expansionModal.value}
                fieldKey={bulk.expansionModal.key}
                onSave={handleSaveExpansion}
            />
            <BulkGuideModal isOpen={bulk.isGuideOpen} onClose={() => bulk.setIsGuideOpen(false)} />
            <ProcessingModal isOpen={bulk.isWorking || bulk.isSending} message={bulk.workingMessage || (bulk.isSending ? "Enviando mensagens..." : "Aguarde...")} />
        </div>
    );
};

export default TemplateBulkSender;
