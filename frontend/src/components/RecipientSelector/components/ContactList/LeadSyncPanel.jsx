
import React from 'react';

const LeadSyncPanel = ({
    saveLeadsTags,
    setSaveLeadsTags,
    isSaveTagsDropdownOpen,
    setIsSaveTagsDropdownOpen,
    saveTagsSearch,
    setSaveTagsSearch,
    availableTags,
    handleSaveToLeads,
    isSavingLeads,
    selectedListCount
}) => {
    return (
        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-[2rem] p-6 mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex flex-col lg:flex-row items-center gap-6">
                <div className="flex-1 space-y-1">
                    <h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
                        Sincronizar com Banco de Contatos
                    </h4>
                    <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                        Adicione estes números à aba "Contatos" para capturar leads e manter o histórico unificado.
                    </p>
                </div>

                <div className="w-full lg:w-auto flex flex-col sm:flex-row items-center gap-3">
                    <div className="relative flex-1 sm:w-72 save-tags-dropdown-container">
                        <div 
                            onClick={() => setIsSaveTagsDropdownOpen(!isSaveTagsDropdownOpen)}
                            className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-[10px] font-bold text-white cursor-pointer hover:border-emerald-500/30 transition-all flex justify-between items-center group shadow-inner"
                        >
                            <span className={saveLeadsTags ? 'text-white' : 'text-slate-600'}>
                                {saveLeadsTags || "ADICIONAR ETIQUETAS (OPCIONAL)..."}
                            </span>
                            <svg className={`w-3 h-3 text-slate-600 group-hover:text-emerald-500 transition-all ${isSaveTagsDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                                <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>

                        {isSaveTagsDropdownOpen && (
                            <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-slate-900 border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                <div className="p-3 bg-slate-800/50 border-b border-white/5 relative">
                                    <input
                                        type="text"
                                        autoFocus
                                        placeholder="Filtrar etiquetas..."
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-9 py-2 text-[10px] font-bold text-white placeholder:text-slate-600 outline-none focus:border-emerald-500/50 transition-all"
                                        value={saveTagsSearch}
                                        onChange={(e) => setSaveTagsSearch(e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                    <svg className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                                </div>
                                <div className="max-h-60 overflow-y-auto premium-scrollbar">
                                    {availableTags
                                        .filter(tag => tag.toLowerCase().includes(saveTagsSearch.toLowerCase()))
                                        .map(tag => (
                                            <div 
                                                key={tag}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSaveLeadsTags(tag);
                                                    setIsSaveTagsDropdownOpen(false);
                                                    setSaveTagsSearch('');
                                                }}
                                                className={`px-5 py-3 hover:bg-emerald-500/10 cursor-pointer transition-colors flex items-center justify-between group/item ${saveLeadsTags === tag ? 'bg-emerald-500/5' : ''}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 opacity-40 group-hover/item:opacity-100 transition-opacity"></div>
                                                    <span className="text-[10px] font-bold text-slate-200 uppercase tracking-wider">{tag}</span>
                                                </div>
                                                {saveLeadsTags === tag && (
                                                    <svg className="w-3 h-3 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="4">
                                                        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                )}
                                            </div>
                                        ))}
                                    {availableTags.filter(tag => tag.toLowerCase().includes(saveTagsSearch.toLowerCase())).length === 0 && (
                                        <div className="p-8 text-center">
                                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Nenhuma etiqueta encontrada</p>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSaveLeadsTags(saveTagsSearch);
                                                    setIsSaveTagsDropdownOpen(false);
                                                    setSaveTagsSearch('');
                                                }}
                                                className="mt-2 text-[10px] font-black text-emerald-500 hover:text-emerald-400 underline uppercase tracking-widest"
                                            >
                                                Criar "{saveTagsSearch}"
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleSaveToLeads}
                        disabled={isSavingLeads || selectedListCount === 0}
                        className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-emerald-900/20 active:scale-95 flex items-center justify-center gap-2"
                    >
                        {isSavingLeads ? (
                            <span className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                        ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
                        )}
                        Salvar Contatos
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LeadSyncPanel;
