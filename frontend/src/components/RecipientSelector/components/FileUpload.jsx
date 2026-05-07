import React from 'react';
import { VAR_OPTIONS } from '../utils';

const FileUpload = ({ 
    handleFileUpload,
    templateVariables,
    fileVariables,
    setFileVariables,
    activeDropdown,
    setActiveDropdown
}) => {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="border-2 border-dashed border-slate-700/50 hover:border-emerald-500/50 rounded-3xl p-12 text-center transition-all cursor-pointer group/upload relative bg-slate-900/20 hover:bg-slate-800/40">
                <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="absolute inset-0 opacity-0 cursor-pointer z-20"
                    onChange={(e) => {
                        handleFileUpload(e);
                        e.target.value = null; // Fix the "cannot select same file again" issue
                    }}
                />
                <div className="space-y-6 relative z-10 pointer-events-none">
                    <div className="w-20 h-20 bg-slate-800 rounded-[2rem] flex items-center justify-center mx-auto group-hover/upload:scale-110 group-hover/upload:bg-emerald-500/10 group-hover/upload:text-emerald-400 transition-all duration-300 shadow-xl shadow-black/50 border border-white/5">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                    </div>
                    <div>
                        <h4 className="font-bold text-white text-lg mb-2 group-hover/upload:text-emerald-300 transition-colors">Selecione seu Arquivo</h4>
                        <p className="text-xs text-slate-400 font-medium">Suporta Excel (.xlsx) ou CSV</p>
                    </div>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-[10px] font-black uppercase text-emerald-400 tracking-widest opacity-0 group-hover/upload:opacity-100 transition-all transform translate-y-2 group-hover/upload:translate-y-0">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14" /></svg>
                        Clique para buscar
                    </div>
                </div>
            </div>

            {/* Template Variables for File Upload */}
            {templateVariables && templateVariables.length > 0 && (
                <div className="p-8 bg-slate-800/20 border border-white/5 rounded-3xl space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <div className="space-y-0.5">
                                <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Valores Globais para Variáveis</h4>
                                <p className="text-[8px] text-slate-500 font-bold uppercase">Configure valores fixos caso não venham nas colunas da planilha</p>
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
                                            placeholder={`Ex: Valor para ${v.label}...`}
                                            value={fileVariables[v.key] || ''}
                                            onChange={(e) => setFileVariables(prev => ({ ...prev, [v.key]: e.target.value }))}
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
                                                <div className="p-3 bg-slate-800/50 border-b border-white/5 text-[8px] font-black text-slate-500 uppercase tracking-widest text-center">Campos Mágicos</div>
                                                <div className="grid grid-cols-1 divide-y divide-white/5 max-h-64 overflow-y-auto premium-scrollbar">
                                                    {VAR_OPTIONS.map(opt => (
                                                        <button
                                                            key={opt.value}
                                                            type="button"
                                                            onClick={() => {
                                                                setFileVariables(prev => ({ ...prev, [v.key]: opt.value }));
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
                </div>
            )}
        </div>
    );
};

export default FileUpload;
