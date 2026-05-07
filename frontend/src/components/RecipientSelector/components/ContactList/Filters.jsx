
import React from 'react';

const Filters = ({
    searchTerm,
    setSearchTerm,
    dddSearch,
    setDddSearch,
    filterOpenOnly,
    setFilterOpenOnly,
    filterBlockedOnly,
    setFilterBlockedOnly,
    blockedCount,
    hasStatus,
    addBrazilCode,
    copyToClipboard
}) => {
    return (
        <div className="flex items-center gap-3 flex-wrap">
            <div className="relative group/search">
                <input
                    type="text"
                    placeholder="BUSCAR POR NOME OU NÚMERO..."
                    className="bg-slate-800/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-black uppercase text-white placeholder:text-slate-600 outline-none focus:border-blue-500/50 focus:bg-slate-800 transition-all w-full md:w-64 shadow-inner"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <svg className="absolute right-3 top-3 text-slate-600 group-focus-within/search:text-blue-500 transition-colors" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            </div>

            <div className="relative group/search-ddd">
                <input
                    type="text"
                    placeholder="DDD..."
                    maxLength={3}
                    className="bg-slate-800/60 border border-white/10 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase text-white placeholder:text-slate-600 outline-none focus:border-emerald-500/50 focus:bg-slate-800 transition-all w-16 md:w-20 shadow-inner text-center"
                    value={dddSearch}
                    onChange={(e) => setDddSearch(e.target.value)}
                />
            </div>

            <div className="flex items-center bg-slate-800/40 rounded-xl border border-white/5 p-1 gap-1">
                <button
                    onClick={addBrazilCode}
                    title="Adicionar 55 (Brasil)"
                    className="px-3 py-2 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all flex items-center gap-1.5"
                >
                    <span className="text-[10px] font-black">+55</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14" /></svg>
                </button>
                <div className="w-[1px] h-4 bg-white/5 mx-1"></div>
                <button
                    onClick={copyToClipboard}
                    title="Copiar lista"
                    className="p-2.5 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 4h2a2 2 0 0 1-2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /></svg>
                </button>
            </div>

            <div className="flex items-center gap-2">
                {hasStatus && (
                    <label className={`flex items-center gap-2 cursor-pointer px-4 py-2.5 rounded-xl border transition-all whitespace-nowrap group ${filterBlockedOnly ? 'bg-red-500/10 border-red-500/30' : 'bg-slate-800/60 border-white/10 hover:bg-slate-800 hover:border-white/20'}`}>
                        <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-red-500 focus:ring-red-500/30 transition-all cursor-pointer"
                            checked={filterBlockedOnly}
                            onChange={(e) => setFilterBlockedOnly(e.target.checked)}
                        />
                        <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${filterBlockedOnly ? 'text-red-400' : 'text-slate-400 group-hover:text-slate-300'}`}>Bloqueados</span>
                        {blockedCount > 0 && (
                            <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{blockedCount}</span>
                        )}
                    </label>
                )}

                <label className="flex items-center gap-2 cursor-pointer px-4 py-2.5 bg-slate-800/60 rounded-xl border border-white/10 hover:bg-slate-800 hover:border-white/20 transition-all whitespace-nowrap group">
                    <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-green-500 focus:ring-green-500/30 transition-all cursor-pointer"
                        checked={filterOpenOnly}
                        onChange={(e) => setFilterOpenOnly(e.target.checked)}
                    />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-300 transition-colors">Janela Aberta</span>
                </label>
            </div>
        </div>
    );
};

export default Filters;
