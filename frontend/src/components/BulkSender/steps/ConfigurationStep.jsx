import React from 'react';
import TemplateSelectionSection from './TemplateSelectionSection';
import AutomationSection from './AutomationSection';

const ConfigurationStep = ({
    selectedTemplate,
    templates,
    isLoadingTemplates,
    templateSearch,
    setTemplateSearch,
    isTemplateDropdownOpen,
    setIsTemplateDropdownOpen,
    handleTemplateChange,
    selectedTemplateObj,
    templateParams,
    handleParamChange,
    openExpansion,
    sendPrivateMessage,
    setSendPrivateMessage,
    cloneToPrivateNote,
    chatwootLabels,
    selectedChatwootLabels,
    setSelectedChatwootLabels,
    privateMessageText,
    setPrivateMessageText,
    privateMessageDelay,
    setPrivateMessageDelay,
    privateMessageDelayUnit,
    setPrivateMessageDelayUnit,
    privateMessageConcurrency,
    setPrivateMessageConcurrency,
    setStep
}) => {
    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
            {/* Template Selection Column */}
            <section className="bg-slate-900/60 backdrop-blur-md rounded-[2.5rem] p-10 shadow-2xl border border-white/5 h-fit relative group/conf">
                <div className="absolute -top-12 -left-12 w-32 h-32 bg-green-500/5 blur-3xl rounded-full transition-all group-hover/conf:scale-150"></div>
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-10 gap-4 relative z-10">
                    <h2 className="text-2xl font-black text-white flex items-center gap-4">
                        <span className="p-3 bg-green-500/10 text-green-400 rounded-2xl border border-green-500/20 shadow-xl shadow-green-500/10">01</span>
                        Configuração do Template
                    </h2>
                </div>
                <TemplateSelectionSection 
                    selectedTemplate={selectedTemplate}
                    templates={templates}
                    isLoadingTemplates={isLoadingTemplates}
                    templateSearch={templateSearch}
                    setTemplateSearch={setTemplateSearch}
                    isTemplateDropdownOpen={isTemplateDropdownOpen}
                    setIsTemplateDropdownOpen={setIsTemplateDropdownOpen}
                    handleTemplateChange={handleTemplateChange}
                    selectedTemplateObj={selectedTemplateObj}
                    templateParams={templateParams}
                    handleParamChange={handleParamChange}
                    openExpansion={openExpansion}
                />
            </section>

            {/* Automation Column */}
            <div className="space-y-10">
                <AutomationSection 
                    sendPrivateMessage={sendPrivateMessage}
                    setSendPrivateMessage={setSendPrivateMessage}
                    cloneToPrivateNote={cloneToPrivateNote}
                    chatwootLabels={chatwootLabels}
                    selectedChatwootLabels={selectedChatwootLabels}
                    setSelectedChatwootLabels={setSelectedChatwootLabels}
                    privateMessageText={privateMessageText}
                    setPrivateMessageText={setPrivateMessageText}
                    openExpansion={openExpansion}
                    privateMessageDelay={privateMessageDelay}
                    setPrivateMessageDelay={setPrivateMessageDelay}
                    privateMessageDelayUnit={privateMessageDelayUnit}
                    setPrivateMessageDelayUnit={setPrivateMessageDelayUnit}
                    privateMessageConcurrency={privateMessageConcurrency}
                    setPrivateMessageConcurrency={setPrivateMessageConcurrency}
                />

                <button 
                    onClick={() => setStep(2)}
                    disabled={!selectedTemplate}
                    className="w-full py-8 bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white rounded-[2.5rem] font-black text-lg uppercase tracking-[0.4em] shadow-2xl shadow-green-900/40 transition-all active:scale-95 flex items-center justify-center gap-6 group disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    Avançar para Contatos
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="group-hover:translate-x-3 transition-transform"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </button>
            </div>
        </div>
    );
};

export default ConfigurationStep;
