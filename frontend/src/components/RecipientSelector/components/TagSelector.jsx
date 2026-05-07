
import React from 'react';
import { VAR_OPTIONS } from '../utils';

const TagSelector = ({
    selectedTag,
    setSelectedTag,
    availableTags,
    isLoadingTags,
    templateVariables,
    tagVariables,
    setTagVariables,
    activeDropdown,
    setActiveDropdown,
    loadContactsByTag,
    isProcessing
}) => {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="p-8 bg-slate-800/20 border border-white/5 rounded-3xl space-y-6">
                <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Selecione a Etiqueta Interna</label>
                    <div className="relative group/tag-select">
                        <select
                            className="w-full p-4 pl-5 bg-black/40 border border-white/10 rounded-2xl focus:border-emerald-500/50 outline-none transition-all text-white font-bold"
                            value={selectedTag}
                            onChange={(e) => setSelectedTag(e.target.value)}
                            disabled={isLoadingTags}
                        >
                            <option value="">{isLoadingTags ? 'Carregando etiquetas...' : '-- Escolha uma etiqueta --'}</option>
                            {availableTags.map(tag => (
                                <option key={tag} value={tag} className="bg-slate-900">{tag}</option>
                            ))}
                        </select>
                        {isLoadingTags && (
                            <div className="absolute right-12 top-1/2 -translate-y-1/2">
                                <div className="w-4 h-4 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Template Variables for Tags */}
                {templateVariables && templateVariables.length > 0 && (
                    <div className="space-y-4 pt-6 border-t border-white/10">
                        <div className="flex items-center justify-between px-1">
                            <div className="space-y-0.5">
                                <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Variáveis do Template</h4>
                                <p className="text-[8px] text-slate-500 font-bold uppercase">Configure os valores para este disparo</p>
                            </div>
                            <div className="text-[8px] font-black text-slate-600 bg-slate-800/50 px-2 py-1 rounded border border-white/5 uppercase tracking-widest">
                                Dica: Use {"{{nome}}"} ou {"{{telefone}}"}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {templateVariables.map(v => (
                                <div key={v.key} className="space-y-2 group/var relative">
                                    <div className="flex items-center justify-between ml-1">
                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider group-focus-within/var:text-emerald-400 transition-colors">{v.label}</label>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            className="w-full p-4 pr-12 bg-black/40 border border-white/5 rounded-2xl focus:border-emerald-500/50 outline-none text-white text-xs transition-all shadow-inner placeholder:text-slate-700 font-bold"
                                            placeholder={`Valor para ${v.label}...`}
                                            value={tagVariables[v.key] || ''}
                                            onChange={(e) => setTagVariables(prev => ({ ...prev, [v.key]: e.target.value }))}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setActiveDropdown(activeDropdown === v.key ? null : v.key)}
                                            className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all ${activeDropdown === v.key ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:text-emerald-400 border border-white/5'}`}
                                            title="Campos Mágicos"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></svg>
                                        </button>
                                    </div>

                                    {/* Magic Dropdown */}
                                    {activeDropdown === v.key && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setActiveDropdown(null)}></div>
                                            <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-slate-900 border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                                <div className="p-3 bg-slate-800/50 border-b border-white/5 text-[8px] font-black text-slate-500 uppercase tracking-widest text-center">Campos Disponíveis do Lead</div>
                                                <div className="grid grid-cols-1 divide-y divide-white/5 max-h-64 overflow-y-auto premium-scrollbar">
                                                    {VAR_OPTIONS.map(opt => (
                                                        <button
                                                            key={opt.value}
                                                            type="button"
                                                            onClick={() => {
                                                                setTagVariables(prev => ({ ...prev, [v.key]: opt.value }));
                                                                setActiveDropdown(null);
                                                            }}
                                                            className="flex items-center gap-3 p-3 text-left hover:bg-emerald-500/10 transition-colors group/opt"
                                                        >
                                                            <span className="text-sm">{opt.icon}</span>
                                                            <div className="flex-1">
                                                                <div className="text-[10px] font-black text-slate-200 uppercase tracking-wide group-hover/opt:text-emerald-400 transition-colors">{opt.label}</div>
                                                                <div className="text-[8px] font-bold text-slate-600 font-mono">{opt.value}</div>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                <button
                    onClick={loadContactsByTag}
                    disabled={!selectedTag || isProcessing}
                    className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-blue-900/20 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                    Carregar Leads da Etiqueta
                </button>
                
                <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl text-center">
                    <p className="text-[10px] text-blue-300/60 font-bold uppercase tracking-widest leading-relaxed">
                        💡 Isso buscará todos os contatos capturados via Webhook ou Importação que possuem esta etiqueta interna.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default TagSelector;
