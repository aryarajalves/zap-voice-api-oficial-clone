
import React from 'react';

const ContactTable = ({
    displayedContacts,
    activeVarColumns,
    showValidation,
    removeContact,
    unblockContact,
    displayLimit,
    setDisplayLimit,
    filteredContactsCount,
    variableFilters = {},
    setVariableFilters,
    exclusionList = [],
    setContacts
}) => {
    const handleVarChange = (phone, varKey, value) => {
        setContacts(prev => prev.map(c => {
            if (c.phone === phone) {
                const newVars = { ...c.vars, [varKey]: value };
                return { ...c, vars: newVars };
            }
            return c;
        }));
    };

    const toggleVarFilter = (varKey) => {
        setVariableFilters(prev => {
            const current = prev[varKey] || 'full';
            const next = current === 'full' ? 'first_name' : 'full';
            return { ...prev, [varKey]: next };
        });
    };

    return (
        <div className="bg-slate-900/60 rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl">
            <div className="max-h-[450px] overflow-y-auto premium-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-[#0f172a] sticky top-0 z-10 border-b border-white/10">
                        <tr>
                            <th className="px-4 py-5 text-[10px] font-black uppercase text-slate-600 tracking-[0.2em] text-center w-12">#</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Número</th>
                            {activeVarColumns.map(v => {
                                const isFirstName = variableFilters[v.key] === 'first_name';
                                return (
                                    <th key={v.key} className="px-4 py-5 text-[10px] font-black uppercase text-center w-48">
                                        <div className="flex flex-col items-center gap-1.5 justify-center">
                                            <span className="text-emerald-500/70 tracking-[0.2em]">{v.label}</span>
                                            <button
                                                type="button"
                                                onClick={() => toggleVarFilter(v.key)}
                                                className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all select-none border border-white/5 active:scale-95 ${
                                                    isFirstName
                                                        ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-slate-950 shadow-md shadow-green-500/20 border-green-500/20'
                                                        : 'bg-slate-800 text-slate-400 hover:bg-slate-750 hover:text-white'
                                                }`}
                                                title={isFirstName ? 'Enviando apenas a primeira palavra' : 'Enviando conteúdo completo'}
                                             >
                                                {isFirstName ? '✦ 1º Nome' : 'Inteiro'}
                                            </button>
                                        </div>
                                    </th>
                                );
                            })}
                            {showValidation && <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] text-center">Status</th>}
                            {showValidation && <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] text-center">Janela 24h</th>}
                            <th className="px-8 py-5 text-right"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {displayedContacts.map((c, i) => {
                            const isExcluded = exclusionList.includes(c.phone);
                            return (
                                <tr key={c.phone} className={`group/row hover:bg-white/[0.03] transition-colors border-l-2 border-l-transparent hover:border-l-emerald-500/50 ${isExcluded ? 'opacity-40 line-through decoration-red-500/50' : ''}`}>
                                    <td className="px-4 py-4 text-center text-[11px] font-black text-slate-600 w-12 tabular-nums">
                                        {i + 1}
                                    </td>
                                    <td className={`px-8 py-4 font-mono text-sm tracking-wider ${isExcluded ? 'text-red-400' : 'text-slate-200'}`}>
                                        {c.phone}
                                    </td>
                                    {activeVarColumns.map(v => {
                                        const val = c.vars?.[v.key] || '';
                                        const isFirstName = variableFilters[v.key] === 'first_name';
                                        const displayedVal = isFirstName ? val.split(' ')[0] : val;
                                        return (
                                            <td key={v.key} className="px-4 py-3 text-center text-xs text-emerald-300 font-medium max-w-[150px]">
                                                <input
                                                    type="text"
                                                    value={displayedVal}
                                                    onChange={(e) => handleVarChange(c.phone, v.key, e.target.value)}
                                                    placeholder="Digitar..."
                                                    className="w-full bg-black/40 border border-white/5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-center text-emerald-300 placeholder:text-slate-700 focus:outline-none focus:border-emerald-500/50 focus:bg-black/60 transition-all"
                                                />
                                            </td>
                                        );
                                    })}
                                    {showValidation && (
                                        <td className="px-8 py-4 text-center">
                                            {isExcluded ? (
                                                <span className="text-[10px] font-black text-red-500 bg-red-500/10 px-2.5 py-1 rounded-lg border border-red-500/20 uppercase">Excluído</span>
                                            ) : c.is_blocked ? (
                                                <button
                                                    type="button"
                                                    onClick={() => unblockContact(c.phone)}
                                                    className="text-[10px] font-black text-red-400 bg-red-500/10 hover:bg-red-500/25 px-3 py-1.5 rounded-xl border border-red-500/20 uppercase tracking-wider transition-all hover:scale-105 active:scale-95 cursor-pointer inline-flex items-center gap-1.5 group/unblock"
                                                    title="Remover este contato da lista de bloqueio"
                                                >
                                                    <span>Bloqueado</span>
                                                    <span className="text-[8px] text-red-500/50 group-hover/unblock:text-red-400/90 lowercase tracking-normal">(desbloquear)</span>
                                                </button>
                                            ) : c.status === 'pending' ? (
                                                <span className="inline-flex w-2 h-2 rounded-full bg-slate-700 animate-pulse"></span>
                                            ) : c.status === 'verified' ? (
                                                <span className="text-[10px] font-black text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20 uppercase">Cadastrado</span>
                                            ) : (
                                                <span className="text-[10px] font-black text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20 uppercase">Novo</span>
                                            )}
                                        </td>
                                    )}
                                {showValidation && (
                                    <td className="px-6 py-4 text-center">
                                        {c.status === 'verified' ? (
                                            c.window_open ? (
                                                <span className="text-[9px] font-black text-green-400 bg-green-500/20 px-3 py-1.5 rounded-xl border-2 border-green-500/30 uppercase flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(34,197,94,0.15)] ring-1 ring-green-500/20">
                                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                                    Sessão 24h
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-black text-red-400 bg-red-500/10 px-2.5 py-1 rounded-lg border border-red-500/20 uppercase">Fechada</span>
                                            )
                                        ) : <span className="text-slate-700 font-bold">-</span>}
                                    </td>
                                )}
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={() => removeContact(c.phone)}
                                        className="p-2 text-slate-600 hover:text-red-400 transition-all opacity-0 group-hover/row:opacity-100 transform scale-90 hover:scale-100"
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {filteredContactsCount > displayLimit && (
                    <div className="p-8 text-center bg-black/10 border-t border-white/5">
                        <button
                            onClick={() => setDisplayLimit(prev => prev + 200)}
                            className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-xl active:scale-95"
                        >
                            Carregar mais {Math.min(200, filteredContactsCount - displayLimit)} contatos
                        </button>
                        <div className="mt-3 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                            Mostrando {displayLimit} de {filteredContactsCount} números filtrados
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ContactTable;
