import React from 'react';
import { FiX } from 'react-icons/fi';

export default function CancelFunnelModal({
    isOpen,
    onClose,
    funnelName,
    contactName,
    onConfirm,
    isCanceling
}) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-5" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                        <FiX size={22} />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-white">Cancelar execução do funil?</h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Funil: <strong className="text-slate-200">{funnelName}</strong>
                        </p>
                    </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed bg-slate-800/50 p-3 rounded-xl border border-slate-800">
                    Tem certeza que deseja interromper a execução deste funil para <strong className="text-white">{contactName}</strong>? As próximas etapas e disparos deste contato serão cancelados.
                </p>

                <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                        type="button"
                        disabled={isCanceling}
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition disabled:opacity-50"
                    >
                        Voltar / Manter Execução
                    </button>
                    <button
                        type="button"
                        disabled={isCanceling}
                        onClick={onConfirm}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-lg shadow-red-600/20 transition flex items-center gap-2 disabled:opacity-50"
                    >
                        {isCanceling ? (
                            <>
                                <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                <span>Cancelando...</span>
                            </>
                        ) : (
                            <span>Sim, Cancelar Funil</span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
