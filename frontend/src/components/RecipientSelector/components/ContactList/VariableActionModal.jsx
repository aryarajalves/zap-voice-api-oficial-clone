import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiFilter, FiEdit3, FiTrash2, FiCheck } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

export const isVariableNumeric = (val) => {
    if (val === null || val === undefined) return false;
    const str = String(val).trim();
    if (!str) return false;
    const digitsOnly = str.replace(/\D/g, '');
    if (digitsOnly.length === 0) return false;
    // Valida se a string é composta exclusivamente por dígitos e caracteres comuns de pontuação de telefone
    const cleanChars = str.replace(/[\s\+\-\(\)\.]/g, '');
    return cleanChars.length > 0 && /^\d+$/.test(cleanChars);
};

export const isVariableEmpty = (val) => {
    if (val === null || val === undefined) return true;
    return String(val).trim() === '';
};

const VariableActionModal = ({
    isOpen,
    onClose,
    varKey,
    varLabel,
    contacts = [],
    setContacts,
    currentFilter = 'all',
    onSetFilter
}) => {
    const [batchText, setBatchText] = useState('Amigo');

    const stats = useMemo(() => {
        let empty = 0;
        let numeric = 0;
        let valid = 0;

        contacts.forEach(c => {
            const val = c.vars?.[varKey];
            if (isVariableEmpty(val)) {
                empty++;
            } else if (isVariableNumeric(val)) {
                numeric++;
            } else {
                valid++;
            }
        });

        return { empty, numeric, valid, total: contacts.length };
    }, [contacts, varKey]);

    if (!isOpen) return null;

    // Aplicar substituição em lote
    const handleApplyBatch = (targetGroup) => {
        const textToSet = batchText.trim();
        if (!textToSet && targetGroup !== 'clear') {
            return toast.error('Digite um texto para aplicar (ex: Amigo, Cliente)');
        }

        let updatedCount = 0;
        setContacts(prev => prev.map(c => {
            const val = c.vars?.[varKey];
            let shouldUpdate = false;

            if (targetGroup === 'numeric') {
                shouldUpdate = isVariableNumeric(val);
            } else if (targetGroup === 'empty') {
                shouldUpdate = isVariableEmpty(val);
            } else if (targetGroup === 'numeric_or_empty') {
                shouldUpdate = isVariableNumeric(val) || isVariableEmpty(val);
            } else if (targetGroup === 'all') {
                shouldUpdate = true;
            }

            if (shouldUpdate) {
                updatedCount++;
                return {
                    ...c,
                    vars: {
                        ...c.vars,
                        [varKey]: textToSet
                    }
                };
            }
            return c;
        }));

        toast.success(`${updatedCount} contatos atualizados com "${textToSet}"!`);
        onClose();
    };

    // Limpar variável de todos do grupo selecionado
    const handleClearBatch = (targetGroup) => {
        let clearedCount = 0;
        setContacts(prev => prev.map(c => {
            const val = c.vars?.[varKey];
            let shouldClear = false;

            if (targetGroup === 'numeric') {
                shouldClear = isVariableNumeric(val);
            } else if (targetGroup === 'all') {
                shouldClear = true;
            }

            if (shouldClear) {
                clearedCount++;
                const newVars = { ...c.vars };
                delete newVars[varKey];
                return {
                    ...c,
                    vars: newVars
                };
            }
            return c;
        }));

        toast.success(`Variável ${varLabel} removida de ${clearedCount} contatos!`);
        onClose();
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 w-screen h-screen">
            <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 space-y-6">
                
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <div className="flex items-center gap-3">
                        <span className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                            <FiEdit3 size={18} />
                        </span>
                        <div>
                            <h3 className="text-base font-black text-white">Gerenciar Variável {varLabel}</h3>
                            <p className="text-[11px] text-slate-400">Filtrar e padronizar valores de {varLabel} na lista de contatos</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-500 hover:text-white rounded-xl hover:bg-slate-800 transition"
                    >
                        <FiX size={18} />
                    </button>
                </div>

                {/* Estatísticas / Diagnóstico da Variável */}
                <div className="grid grid-cols-3 gap-2.5 text-center">
                    <div className="bg-slate-800/50 border border-white/5 p-3 rounded-2xl">
                        <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Com Nome</div>
                        <div className="text-lg font-black text-emerald-400 mt-0.5">{stats.valid}</div>
                    </div>
                    <div className={`border p-3 rounded-2xl ${stats.numeric > 0 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-slate-800/50 border-white/5'}`}>
                        <div className={`text-[10px] font-black uppercase tracking-wider ${stats.numeric > 0 ? 'text-amber-400' : 'text-slate-400'}`}>Só Números</div>
                        <div className={`text-lg font-black mt-0.5 ${stats.numeric > 0 ? 'text-amber-400' : 'text-slate-300'}`}>{stats.numeric}</div>
                    </div>
                    <div className={`border p-3 rounded-2xl ${stats.empty > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-slate-800/50 border-white/5'}`}>
                        <div className={`text-[10px] font-black uppercase tracking-wider ${stats.empty > 0 ? 'text-red-400' : 'text-slate-400'}`}>Vazios</div>
                        <div className={`text-lg font-black mt-0.5 ${stats.empty > 0 ? 'text-red-400' : 'text-slate-300'}`}>{stats.empty}</div>
                    </div>
                </div>

                {/* Seção 1: Filtrar Tabela */}
                <div className="space-y-2">
                    <div className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                        <FiFilter size={14} className="text-emerald-400" />
                        1. Filtrar Visualização na Tabela
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            type="button"
                            onClick={() => { onSetFilter('all'); onClose(); }}
                            className={`py-2 px-3 rounded-xl border text-[11px] font-bold transition ${
                                currentFilter === 'all'
                                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow'
                                    : 'bg-slate-800/60 text-slate-400 border-white/5 hover:text-white'
                            }`}
                        >
                            Todos ({stats.total})
                        </button>
                        <button
                            type="button"
                            onClick={() => { onSetFilter('numeric'); onClose(); }}
                            className={`py-2 px-3 rounded-xl border text-[11px] font-bold transition ${
                                currentFilter === 'numeric'
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow'
                                    : 'bg-slate-800/60 text-slate-400 border-white/5 hover:text-white'
                            }`}
                        >
                            Só Números ({stats.numeric})
                        </button>
                        <button
                            type="button"
                            onClick={() => { onSetFilter('empty'); onClose(); }}
                            className={`py-2 px-3 rounded-xl border text-[11px] font-bold transition ${
                                currentFilter === 'empty'
                                    ? 'bg-red-500/20 text-red-400 border-red-500/40 shadow'
                                    : 'bg-slate-800/60 text-slate-400 border-white/5 hover:text-white'
                            }`}
                        >
                            Vazios ({stats.empty})
                        </button>
                    </div>
                </div>

                {/* Seção 2: Preencher / Substituir em Lote */}
                <div className="space-y-3 pt-2 border-t border-white/5">
                    <div className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                        <FiEdit3 size={14} className="text-emerald-400" />
                        2. Preencher Nome em Lote
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={batchText}
                            onChange={(e) => setBatchText(e.target.value)}
                            placeholder="Digite o texto (ex: Amigo, Cliente)..."
                            className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-emerald-500 transition"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        {stats.numeric > 0 && (
                            <button
                                type="button"
                                onClick={() => handleApplyBatch('numeric')}
                                className="w-full py-2.5 px-4 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-black uppercase tracking-wider transition active:scale-95 flex items-center justify-between"
                            >
                                <span>Substituir {stats.numeric} que têm Apenas Números por "{batchText || '...'}"</span>
                                <FiCheck size={14} />
                            </button>
                        )}
                        {stats.empty > 0 && (
                            <button
                                type="button"
                                onClick={() => handleApplyBatch('empty')}
                                className="w-full py-2.5 px-4 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-black uppercase tracking-wider transition active:scale-95 flex items-center justify-between"
                            >
                                <span>Preencher {stats.empty} que estão Vazios com "{batchText || '...'}"</span>
                                <FiCheck size={14} />
                            </button>
                        )}
                        {(stats.numeric > 0 || stats.empty > 0) && (
                            <button
                                type="button"
                                onClick={() => handleApplyBatch('numeric_or_empty')}
                                className="w-full py-2.5 px-4 bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 rounded-xl text-xs font-black uppercase tracking-wider transition active:scale-95 flex items-center justify-between"
                            >
                                <span>Preencher {stats.numeric + stats.empty} (Números + Vazios) com "{batchText || '...'}"</span>
                                <FiCheck size={14} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Seção 3: Remover / Limpar */}
                <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                    <button
                        type="button"
                        disabled={stats.numeric === 0}
                        onClick={() => handleClearBatch('numeric')}
                        className="py-2 px-3 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-30 disabled:cursor-not-allowed text-red-400 border border-red-500/20 rounded-xl text-[11px] font-bold transition flex items-center gap-1.5 active:scale-95"
                    >
                        <FiTrash2 size={13} /> Limpar {stats.numeric} com apenas números
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default VariableActionModal;