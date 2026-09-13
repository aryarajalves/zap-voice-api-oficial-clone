import React from 'react';
import { FiRotateCcw, FiTrash2 } from 'react-icons/fi';

export const ViewContactsList = ({
    displayedContacts,
    localExclusions,
    onToggleExclusion
}) => {
    if (displayedContacts.length === 0) {
        return (
            <div className="flex-1 overflow-y-auto p-6 space-y-2 premium-scrollbar">
                <div className="text-center py-20 text-slate-500 font-bold uppercase tracking-widest text-xs">
                    Nenhum contato nesta visualização
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto p-6 space-y-2 premium-scrollbar">
            {displayedContacts.map((contact, i) => {
                const isExcluded = localExclusions.includes(contact.phone);
                return (
                    <div 
                        key={contact.phone || i} 
                        className={`flex items-center justify-between p-4 border rounded-2xl transition-all ${isExcluded ? 'bg-rose-950/10 border-rose-500/10 opacity-60' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                    >
                        <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                                <div className="text-sm font-black text-white">{contact.name}</div>
                                {isExcluded && (
                                    <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 rounded-full font-black text-[9px] uppercase tracking-widest border border-rose-500/20">
                                        Removido
                                    </span>
                                )}
                            </div>
                            <div className="text-[10px] text-slate-500 font-bold">{contact.email || '-'}</div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className={`font-black text-xs tabular-nums ${isExcluded ? 'text-slate-500 line-through' : 'text-blue-400'}`}>
                                {contact.phone}
                            </div>
                            <button
                                type="button"
                                onClick={() => onToggleExclusion(contact.phone)}
                                className={`p-2 rounded-xl border transition-all cursor-pointer ${isExcluded ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20 text-rose-400'}`}
                                title={isExcluded ? "Adicionar de volta ao disparo" : "Remover do disparo"}
                            >
                                {isExcluded ? <FiRotateCcw size={14} /> : <FiTrash2 size={14} />}
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
