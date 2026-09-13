import React from 'react';
import { FiSliders } from 'react-icons/fi';

const ContactTableHeader = ({
    isAllPageSelected,
    onToggleSelectPage,
    activeVarColumns = [],
    variableFilters = {},
    varContentFilters = {},
    showValidation,
    showContactTags,
    onOpenVarModal,
    onToggleVarFilter,
    onSetVarContentFilter
}) => {
    return (
        <thead className="bg-[#0f172a] sticky top-0 z-10 border-b border-white/10">
            <tr>
                <th className="px-4 py-5 text-center w-10">
                    <input
                        type="checkbox"
                        checked={isAllPageSelected}
                        onChange={(e) => onToggleSelectPage(e.target.checked)}
                        className="rounded border-white/10 text-red-600 focus:ring-red-500 bg-slate-800 cursor-pointer"
                        title="Selecionar todos os contatos desta página"
                    />
                </th>
                <th className="px-4 py-5 text-[10px] font-black uppercase text-slate-600 tracking-[0.2em] text-center w-12">#</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Número</th>
                {activeVarColumns.map(v => {
                    const isFirstName = variableFilters[v.key] === 'first_name';
                    const currentFilter = varContentFilters[v.key] || 'all';
                    const isFiltered = currentFilter !== 'all';

                    return (
                        <th key={v.key} className="px-4 py-4 text-[10px] font-black uppercase text-center min-w-[240px]">
                            <div className="flex flex-col items-center gap-1.5 justify-center">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-emerald-500/80 tracking-[0.2em]">{v.label}</span>
                                    <button
                                        type="button"
                                        data-no-drag="true"
                                        onClick={() => onOpenVarModal({ isOpen: true, varKey: v.key, varLabel: v.label })}
                                        className={`px-2 py-0.5 rounded-lg text-[9px] font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                                            isFiltered
                                                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 ring-1 ring-amber-500/30'
                                                : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border-white/10'
                                        }`}
                                        title="Ações e Filtros desta Variável"
                                    >
                                        <FiSliders size={11} />
                                        <span>Ações</span>
                                    </button>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        data-no-drag="true"
                                        onClick={() => onToggleVarFilter(v.key)}
                                        className={`px-2 py-0.5 rounded-lg text-[8.5px] font-black uppercase tracking-wider transition-all select-none border border-white/5 active:scale-95 cursor-pointer ${
                                            isFirstName
                                                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-slate-950 shadow-md shadow-green-500/20 border-green-500/20'
                                                : 'bg-slate-800 text-slate-400 hover:bg-slate-750 hover:text-white'
                                        }`}
                                        title={isFirstName ? 'Enviando apenas a primeira palavra' : 'Enviando conteúdo completo'}
                                    >
                                        {isFirstName ? '✦ 1º Nome' : 'Inteiro'}
                                    </button>
                                    {isFiltered && (
                                        <button
                                            type="button"
                                            data-no-drag="true"
                                            onClick={() => onSetVarContentFilter(v.key, 'all')}
                                            className="text-[8px] bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 px-1.5 py-0.5 rounded border border-amber-500/30 font-bold flex items-center gap-0.5 cursor-pointer"
                                            title="Remover filtro de conteúdo desta coluna"
                                        >
                                            <span>{currentFilter === 'numeric' ? 'Só Núm.' : 'Vazios'}</span>
                                            <span className="text-[10px] leading-none">×</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </th>
                    );
                })}
                {showValidation && <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] text-center">Status</th>}
                {showValidation && <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] text-center">Janela 24h</th>}
                {showContactTags && (
                    <th className="px-6 py-5 text-[10px] font-black uppercase text-emerald-400 tracking-[0.2em] text-center min-w-[200px]">
                        Aba Contatos / Etiquetas
                    </th>
                )}
                <th className="px-8 py-5 text-right"></th>
            </tr>
        </thead>
    );
};

export default ContactTableHeader;
