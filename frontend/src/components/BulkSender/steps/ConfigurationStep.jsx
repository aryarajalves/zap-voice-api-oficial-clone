import React from 'react';
import { toast } from 'react-hot-toast';
import TemplateSelectionSection from './TemplateSelectionSection';

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
    chatwootLabels,
    selectedChatwootLabels,
    setSelectedChatwootLabels,
    setStep
}) => {
    const handleAdvance = () => {
        // Verifica se o template tem cabeçalho de mídia obrigatório
        const headerComp = selectedTemplateObj?.components?.find(c => c.type === 'HEADER');
        const needsMedia = headerComp && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerComp.format);

        if (needsMedia && !templateParams['HEADER_0']) {
            const mediaLabel = headerComp.format === 'IMAGE' ? 'Imagem' : headerComp.format === 'VIDEO' ? 'Vídeo' : 'Documento';
            const mediaIcon = headerComp.format === 'IMAGE' ? '🖼️' : headerComp.format === 'VIDEO' ? '🎬' : '📄';

            toast.custom((t) => (
                <div className={`${t.visible ? 'animate-in fade-in slide-in-from-bottom-4' : 'animate-out fade-out'} max-w-sm w-full bg-slate-900 border border-amber-500/30 rounded-2xl shadow-2xl shadow-black/40 p-5 flex gap-4`}>
                    <div className="flex-shrink-0 w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center text-2xl">
                        {mediaIcon}
                    </div>
                    <div className="flex-1 space-y-1">
                        <p className="text-sm font-black text-white">Mídia do Cabeçalho Pendente</p>
                        <p className="text-xs text-slate-400 leading-relaxed">
                            Este template exige uma <span className="text-amber-400 font-bold">{mediaLabel}</span> no cabeçalho.
                            Faça o upload ou cole o link antes de avançar.
                        </p>
                    </div>
                </div>
            ), {
                duration: 5000,
                position: 'top-right'
            });
            return;
        }

        setStep(2);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-10">
            {/* Template Selection Column */}
            <section className="bg-slate-900/60 backdrop-blur-md rounded-[2.5rem] p-10 shadow-2xl border border-white/5 h-fit relative group/conf z-50">
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

            <button 
                id="bulk-advance-btn"
                onClick={handleAdvance}
                disabled={!selectedTemplate}
                className="w-full py-8 bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white rounded-[2.5rem] font-black text-lg uppercase tracking-[0.4em] shadow-2xl shadow-green-900/40 transition-all active:scale-95 flex items-center justify-center gap-6 group disabled:opacity-30 disabled:cursor-not-allowed"
            >
                Avançar para Contatos
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="group-hover:translate-x-3 transition-transform"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </button>
        </div>
    );
};

export default ConfigurationStep;

