import React from 'react';
import { createPortal } from 'react-dom';
import { FiTag, FiX } from 'react-icons/fi';

export default function ConversationLabelsModal({
    isOpen,
    onClose,
    contactName,
    labels = [],
    getLabelColor
}) {
    if (!isOpen) return null;

    const resolveColor = (label) => {
        if (typeof getLabelColor === 'function') {
            return getLabelColor(label);
        }
        return '#3B82F6';
    };

    const modalContent = (
        <div
            className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none"
            onClick={(e) => e.stopPropagation()}
            data-testid="conversation-labels-modal"
        >
            <div
                className="relative z-10 bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 ring-1 ring-white/10"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Cabeçalho */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-950/40">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            <FiTag size={18} />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-base leading-tight">
                                Etiquetas da Conversa
                            </h3>
                            <p className="text-xs text-slate-400 truncate max-w-[260px]">
                                {contactName ? contactName : 'Contato'} • <strong className="text-blue-400">{labels.length}</strong> etiquetas
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                        title="Fechar"
                    >
                        <FiX size={18} />
                    </button>
                </div>

                {/* Lista de Etiquetas */}
                <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-2.5">
                    <div className="flex flex-wrap gap-2">
                        {labels.map((label, idx) => {
                            const color = resolveColor(label);
                            return (
                                <div
                                    key={`${label}-${idx}`}
                                    style={{
                                        color: color,
                                        borderColor: `${color}40`,
                                        backgroundColor: `${color}18`
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-xs break-all"
                                >
                                    <FiTag size={12} className="shrink-0" />
                                    <span>{label}</span>
                                    <span className="opacity-60 text-[10px] font-normal shrink-0">
                                        ({label ? label.length : 0})
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Rodapé com 1 botão para fechar */}
                <div className="flex items-center justify-end px-6 py-4 border-t border-slate-800/80 bg-slate-950/40">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );

    return typeof document !== 'undefined'
        ? createPortal(modalContent, document.body)
        : modalContent;
}
