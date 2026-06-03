import React from 'react';
import { FiZap, FiSlash, FiMinus } from 'react-icons/fi';

const TYPE_OPTIONS = [
    { value: 'none',        label: 'Nenhum',    icon: FiMinus,  color: 'slate' },
    { value: 'interaction', label: 'Interação', icon: FiZap,    color: 'emerald' },
    { value: 'block',       label: 'Bloqueio',  icon: FiSlash,  color: 'rose' },
];

const COLOR = {
    slate:   { ring: 'ring-slate-500/30',   bg: 'bg-slate-500/10',   text: 'text-slate-400',   border: 'border-slate-500/20' },
    emerald: { ring: 'ring-emerald-500/30', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    rose:    { ring: 'ring-rose-500/30',    bg: 'bg-rose-500/10',    text: 'text-rose-400',    border: 'border-rose-500/20' },
};

const ButtonActionsSection = ({ templateButtons, buttonActions, setButtonActions, funnels }) => {
    if (!templateButtons || templateButtons.length === 0) return null;

    const getAction = (btnText) =>
        buttonActions[btnText] || { type: 'none', funnel_id: null };

    const setType = (btnText, type) => {
        setButtonActions(prev => ({
            ...prev,
            [btnText]: { ...getAction(btnText), type, funnel_id: null }
        }));
    };

    const setFunnel = (btnText, funnel_id) => {
        setButtonActions(prev => ({
            ...prev,
            [btnText]: { ...getAction(btnText), funnel_id: funnel_id ? parseInt(funnel_id) : null }
        }));
    };

    return (
        <section className="bg-slate-900/60 backdrop-blur-md rounded-[2.5rem] p-10 shadow-2xl border border-white/5 h-fit relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-violet-500/5 blur-3xl rounded-full" />

            <h2 className="text-2xl font-black text-white flex items-center gap-4 mb-8 relative z-10">
                <span className="p-3 bg-violet-500/10 text-violet-400 rounded-2xl border border-violet-500/20 shadow-xl shadow-violet-500/10">
                    03
                </span>
                Ação dos Botões
            </h2>

            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-8 relative z-10">
                Defina o que acontece quando o contato clicar em cada botão do template
            </p>

            <div className="space-y-5 relative z-10">
                {templateButtons.map((btnText) => {
                    const action = getAction(btnText);
                    const activeOpt = TYPE_OPTIONS.find(o => o.value === action.type) || TYPE_OPTIONS[0];
                    const c = COLOR[activeOpt.color];
                    const showFunnel = action.type !== 'none';

                    return (
                        <div
                            key={btnText}
                            className={`p-6 rounded-3xl border transition-all ${showFunnel ? `bg-slate-800/30 ${c.border} border` : 'bg-slate-800/10 border border-white/5'}`}
                        >
                            {/* Button label */}
                            <div className="flex items-center gap-3 mb-5">
                                <span className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-xl text-white font-black text-sm truncate max-w-[220px]">
                                    {btnText}
                                </span>
                                <span className="text-slate-600 text-xs font-bold uppercase tracking-widest">→ ação</span>
                            </div>

                            {/* Type selector */}
                            <div className="flex gap-3 flex-wrap mb-5">
                                {TYPE_OPTIONS.map((opt) => {
                                    const Icon = opt.icon;
                                    const sel = action.type === opt.value;
                                    const clr = COLOR[opt.color];
                                    return (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setType(btnText, opt.value)}
                                            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl border font-black text-xs uppercase tracking-widest transition-all
                                                ${sel
                                                    ? `${clr.bg} ${clr.text} ${clr.border} shadow-lg`
                                                    : 'bg-slate-800/40 text-slate-600 border-white/5 hover:border-white/10 hover:text-slate-400'
                                                }`}
                                        >
                                            <Icon size={14} />
                                            {opt.label}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Funnel selector (optional) */}
                            {showFunnel && (
                                <div>
                                    <label className="block text-[9px] font-black text-slate-600 uppercase mb-2 px-1 tracking-widest">
                                        Funil a disparar — <span className="text-slate-500 normal-case">opcional</span>
                                    </label>
                                    <select
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-violet-500/20 transition-all"
                                        value={action.funnel_id || ''}
                                        onChange={(e) => setFunnel(btnText, e.target.value || null)}
                                    >
                                        <option value="" className="bg-slate-900 text-white">— Nenhum funil —</option>
                                        {funnels.map((f) => (
                                            <option key={f.id} value={f.id} className="bg-slate-900 text-white">{f.is_pinned ? '📌 ' : ''}{f.name}{f.tag ? ` [${f.tag}]` : ''}</option>
                                        ))}
                                    </select>
                                    {action.type === 'block' && (
                                        <p className="text-rose-400/70 text-[10px] font-bold mt-2 px-1">
                                            O contato será adicionado à lista de bloqueados automaticamente.
                                        </p>
                                    )}
                                    {action.type === 'interaction' && (
                                        <p className="text-emerald-400/70 text-[10px] font-bold mt-2 px-1">
                                            O funil será iniciado após 5–8 segundos da resposta.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </section>
    );
};

export default ButtonActionsSection;
