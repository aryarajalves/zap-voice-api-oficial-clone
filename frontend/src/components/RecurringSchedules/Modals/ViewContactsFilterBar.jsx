import React from 'react';

export const ViewContactsFilterBar = ({
    filterType,
    setFilterType,
    contactsCount,
    activeCount,
    excludedCount,
    pageSize,
    setPageSize
}) => {
    return (
        <div className="px-8 py-4 bg-slate-950/20 border-b border-white/5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => setFilterType('all')}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${filterType === 'all' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white/5 hover:bg-white/10 text-slate-400'}`}
                >
                    Todos ({contactsCount})
                </button>
                <button
                    type="button"
                    onClick={() => setFilterType('active')}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${filterType === 'active' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white/5 hover:bg-white/10 text-slate-400'}`}
                >
                    Ativos ({activeCount})
                </button>
                <button
                    type="button"
                    onClick={() => setFilterType('excluded')}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${filterType === 'excluded' ? 'bg-rose-600 text-white shadow-lg' : 'bg-white/5 hover:bg-white/10 text-slate-400'}`}
                >
                    Removidos ({excludedCount})
                </button>
            </div>
            
            {/* Seletor de Contatos por Página */}
            <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Exibir:</span>
                <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="bg-slate-800 border border-white/10 text-white text-xs font-black rounded-lg px-2.5 py-1.5 outline-none cursor-pointer"
                >
                    <option value={20}>20 contatos</option>
                    <option value={50}>50 contatos</option>
                    <option value={100}>100 contatos</option>
                    <option value={500}>500 contatos</option>
                    <option value={1000}>1000 contatos</option>
                </select>
            </div>
        </div>
    );
};
