import React from 'react';

const ExclusionListManager = ({
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
    isWorking
}) => {
    return (
        <div className="relative z-10 pt-10 border-t border-white/5 animate-in fade-in duration-700 delay-150">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 px-2 gap-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                    <span className="p-3 bg-red-500/10 text-red-400 rounded-2xl border border-red-500/20 shadow-xl shadow-red-500/10">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                    </span>
                    Filtro de Exclusão
                </h3>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 text-xs font-black text-slate-400 uppercase tracking-widest bg-black/40 px-5 py-2.5 rounded-2xl border border-white/5 shadow-inner">
                        Ignorando: <span className="text-red-400 text-sm">{exclusionList.length}</span>
                    </div>
                    {exclusionList.length > 0 && (
                        <button
                            onClick={() => setExclusionList([])}
                            className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 hover:bg-red-500 text-white rounded-2xl border border-red-500/20 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-red-900/10 group"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="group-hover:rotate-12 transition-transform"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            Limpar Tudo
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-slate-900/60 backdrop-blur-md rounded-[3rem] p-8 border border-white/5 space-y-8 shadow-2xl">
                {!exclusionColSelector ? (
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 bg-slate-800/50 p-1.5 rounded-2xl border border-white/10 shadow-inner">
                            {['manual', 'upload', 'tag'].map(mode => (
                                <button
                                    key={mode}
                                    onClick={() => setExclusionMode(mode)}
                                    className={`flex-1 py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-300 ${exclusionMode === mode ? 'bg-white/10 text-white shadow-lg ring-1 ring-white/10' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    {mode === 'manual' ? 'Entrada Manual' : mode === 'upload' ? 'Upload Planilha' : 'Etiquetas'}
                                </button>
                            ))}
                        </div>

                        {exclusionMode === 'manual' ? (
                            <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                                <div className="relative group/field">
                                    <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-3xl blur opacity-0 group-hover/field:opacity-100 transition duration-500"></div>
                                    <textarea
                                        className="relative w-full bg-black/40 border border-white/10 rounded-3xl p-8 text-white text-sm outline-none focus:border-red-500/50 transition-all font-mono min-h-[160px] shadow-inner placeholder:text-slate-800"
                                        placeholder="Insira um número por linha (ex: 5511999999999)..."
                                        value={exclusionText}
                                        onChange={(e) => setExclusionText(e.target.value)}
                                    />
                                </div>
                                <div className="flex gap-4">
                                    <button
                                        onClick={handleSaveExclusion}
                                        disabled={!exclusionText.trim()}
                                        className="flex-1 py-5 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black text-xs uppercase tracking-[0.26em] border border-white/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.98] shadow-xl"
                                    >
                                        ATUALIZAR LISTA
                                    </button>
                                    {exclusionText.trim().length > 0 && (
                                        <button
                                            onClick={add55ToExclusionText}
                                            className="px-8 bg-slate-800/80 hover:bg-slate-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest border border-white/5 transition-all shadow-md hover:shadow-lg active:scale-95 animate-in zoom-in duration-300"
                                            title="Adicionar 55 aos números abaixo"
                                        >
                                            +55
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : exclusionMode === 'upload' ? (
                            <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                                <div className="relative h-56 flex flex-col items-center justify-center border-2 border-dashed border-slate-700/50 rounded-[2.5rem] p-8 hover:border-red-500/30 transition-all group cursor-pointer bg-slate-900/40 hover:bg-slate-800/40 overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <input
                                        type="file"
                                        accept=".csv,.xlsx,.xls"
                                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                        onChange={handleExclusionFileUpload}
                                    />
                                    <div className="w-20 h-20 bg-slate-800/80 rounded-[2rem] flex items-center justify-center mb-6 group-hover:scale-110 group-hover:text-red-400 transition-all shadow-2xl border border-white/5">
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
                                    </div>
                                    <h4 className="font-bold text-white text-lg">Carregar CSV ou Excel</h4>
                                    <p className="text-slate-500 text-[10px] mt-2 font-black uppercase tracking-[0.3em]">Clique ou arraste o arquivo</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                                <div className="p-8 bg-slate-800/10 border border-white/5 rounded-3xl space-y-6">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 text-center">Selecione a Etiqueta para Excluir</label>
                                        <div className="relative group/tag-select-exclusion">
                                            <select
                                                className="w-full p-4 pl-5 bg-black/60 border border-white/10 rounded-2xl focus:border-red-500/50 outline-none transition-all text-white font-bold"
                                                value={selectedExclusionTag}
                                                onChange={(e) => setSelectedExclusionTag(e.target.value)}
                                                disabled={isLoadingExclusionTags}
                                            >
                                                <option value="">{isLoadingExclusionTags ? 'Carregando etiquetas...' : '-- Escolha uma etiqueta --'}</option>
                                                {exclusionAvailableTags.map(tag => (
                                                    <option key={tag} value={tag} className="bg-slate-900">{tag}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <button
                                        onClick={loadExclusionContactsByTag}
                                        disabled={!selectedExclusionTag || isWorking}
                                        className="w-full py-5 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl active:scale-[0.98] border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                        Adicionar Etiquetas à Exclusão
                                    </button>
                                </div>
                            </div>
                        )}

                        {exclusionList.length > 0 && (
                            <div className="pt-8 space-y-4 border-t border-white/5">
                                <div className="flex items-center justify-between px-2">
                                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Base de Exclusão</h4>
                                    <button
                                        onClick={add55ToLoadedExclusionList}
                                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/10 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                                    >
                                        <span>PADRONIZAR +55</span>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14" /></svg>
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-3 max-h-56 overflow-y-auto premium-scrollbar p-2 bg-black/20 rounded-3xl border border-white/5">
                                    {exclusionList.map(num => (
                                        <div key={num} className="group flex items-center gap-3 pl-4 pr-2 py-2 bg-slate-800/40 rounded-xl text-xs font-mono text-slate-400 border border-white/5 hover:border-red-500/30 hover:text-red-400 transition-all shadow-sm">
                                            <span className="tracking-widest">{num}</span>
                                            <button onClick={() => setExclusionList(prev => prev.filter(n => n !== num))} className="p-1 px-2 hover:bg-red-500/10 rounded-lg text-slate-600 hover:text-red-500 font-black transition-colors">
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-8 animate-in slide-in-from-right-8 duration-500 p-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <h4 className="text-xl font-bold text-white">Mapeamento de Importação</h4>
                                <p className="text-xs text-slate-500 font-medium">Selecione a coluna que contém os números de telefone.</p>
                            </div>
                            <button onClick={() => setExclusionColSelector(false)} className="px-4 py-2 bg-slate-800 text-slate-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Cancelar</button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {exclusionCsvData?.headers.map((h, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setExclusionSelectedCol(idx)}
                                    className={`p-6 rounded-3xl border-2 text-left transition-all relative overflow-hidden group/col ${exclusionSelectedCol === idx ? 'bg-red-500/10 border-red-500 text-white shadow-xl shadow-red-500/10' : 'bg-slate-800/40 border-slate-700/50 text-slate-500 hover:border-slate-500'}`}
                                >
                                    <div className={`text-[9px] font-black uppercase mb-2 tracking-widest ${exclusionSelectedCol === idx ? 'text-red-400' : 'text-slate-600'}`}>Coluna {idx + 1}</div>
                                    <div className="font-bold text-sm truncate">{h || `Sem Nome`}</div>
                                    {exclusionSelectedCol === idx && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={confirmExclusionColumn}
                            disabled={exclusionSelectedCol === null}
                            className="w-full py-6 bg-red-600 hover:bg-red-500 text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.3em] shadow-2xl shadow-red-900/30 transition-all disabled:opacity-20 active:scale-[0.98]"
                        >
                            Confirmar Importação de Exclusão
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExclusionListManager;
