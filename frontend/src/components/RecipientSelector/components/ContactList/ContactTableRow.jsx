import React from 'react';
import { FiCopy } from 'react-icons/fi';
import ContactTagsCell from './ContactTagsCell';

const ContactTableRow = ({
    contact,
    globalIndex,
    isSelected,
    isExcluded,
    showValidation,
    showContactTags,
    activeVarColumns = [],
    variableFilters = {},
    contactsTagsMap = {},
    isLoadingTags = false,
    onToggleSelect,
    onCopyPhone,
    onVarChange,
    onUnblock,
    onRemove
}) => {
    const c = contact;

    return (
        <tr className={`group/row hover:bg-white/[0.03] transition-colors border-l-2 ${
            isSelected ? 'bg-red-500/10 border-l-red-500' : 'border-l-transparent hover:border-l-emerald-500/50'
        } ${isExcluded ? 'opacity-75 bg-amber-500/[0.04]' : ''}`}>
            {/* Checkbox de seleção */}
            <td className="px-4 py-4 text-center">
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect && onToggleSelect(c.phone)}
                    className="rounded border-white/10 text-red-600 focus:ring-red-500 bg-slate-800 cursor-pointer"
                />
            </td>

            {/* Índice */}
            <td className="px-4 py-4 text-center text-[11px] font-black text-slate-600 w-12 tabular-nums">
                {globalIndex}
            </td>

            {/* Número com cópia ao clicar */}
            <td className={`px-8 py-4 font-mono text-sm tracking-wider ${isExcluded ? 'text-amber-400' : 'text-slate-200'}`}>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        data-no-drag="true"
                        onClick={() => onCopyPhone && onCopyPhone(c.phone)}
                        className="group/phone flex items-center gap-2 hover:text-emerald-400 transition-colors cursor-pointer text-left focus:outline-none"
                        title="Clique para copiar o número"
                    >
                        <span className="font-semibold">{c.phone}</span>
                        <FiCopy className="opacity-40 group-hover/phone:opacity-100 group-hover/phone:scale-110 transition-all text-xs text-slate-400 group-hover/phone:text-emerald-400" />
                    </button>
                    {isExcluded && (
                        <span className="text-[8px] font-black text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30 uppercase tracking-wider whitespace-nowrap">
                            Filtro Exclusão
                        </span>
                    )}
                </div>
            </td>

            {/* Colunas de Variáveis */}
            {activeVarColumns.map(v => {
                const rawVal = c.vars?.[v.key];
                const val = typeof rawVal === 'string' ? rawVal : (rawVal !== null && rawVal !== undefined ? String(rawVal) : '');
                const isFirstName = variableFilters[v.key] === 'first_name';
                const displayedVal = isFirstName ? val.split(' ')[0] : val;

                return (
                    <td key={v.key} className="px-4 py-3 text-center text-xs text-emerald-300 font-medium min-w-[240px]">
                        <input
                            type="text"
                            value={displayedVal}
                            onChange={(e) => onVarChange && onVarChange(c.phone, v.key, e.target.value)}
                            placeholder="Digitar..."
                            title={displayedVal}
                            className="w-full min-w-[220px] bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-center text-emerald-300 placeholder:text-slate-700 focus:outline-none focus:border-emerald-500/70 focus:bg-black/80 transition-all shadow-inner"
                        />
                    </td>
                );
            })}

            {/* Validação de Status */}
            {showValidation && (
                <td className="px-8 py-4 text-center">
                    {isExcluded ? (
                        <span className="text-[10px] font-black text-amber-400 bg-amber-500/15 px-2.5 py-1 rounded-lg border border-amber-500/30 uppercase whitespace-nowrap">Filtro Exclusão</span>
                    ) : c.is_blocked ? (
                        <button
                            type="button"
                            onClick={() => onUnblock && onUnblock(c.phone)}
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

            {/* Janela de 24h */}
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

            {/* Etiquetas da Aba Contatos */}
            {showContactTags && (
                <td className="px-6 py-4 text-center">
                    <ContactTagsCell 
                        phone={c.phone} 
                        tagsInfo={contactsTagsMap[c.phone] || contactsTagsMap[c.phone.replace(/\D/g, '')]} 
                        isLoading={isLoadingTags}
                    />
                </td>
            )}

            {/* Ação de Remover Contato */}
            <td className="px-6 py-4 text-right">
                <button
                    type="button"
                    onClick={() => onRemove && onRemove(c.phone)}
                    className="p-2 text-slate-600 hover:text-red-400 transition-all opacity-0 group-hover/row:opacity-100 transform scale-90 hover:scale-100 cursor-pointer"
                    title="Remover este contato"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
            </td>
        </tr>
    );
};

export default ContactTableRow;
