import React from 'react';
import { VAR_OPTIONS } from '../utils';

const FileUpload = ({ 
    handleFileUpload,
    templateVariables,
    fileVariables,
    setFileVariables,
    activeDropdown,
    setActiveDropdown,
    availableTags = [],
    saveLeadsTags = '',
    setSaveLeadsTags,
    isSaveTagsDropdownOpen = false,
    setIsSaveTagsDropdownOpen,
    saveTagsSearch = '',
    setSaveTagsSearch
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
        </div>
    );
};

export default FileUpload;
