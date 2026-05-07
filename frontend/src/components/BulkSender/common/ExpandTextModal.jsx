import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Premium Hook for Scroll Locking
 */
const useScrollLock = (lock) => {
    useEffect(() => {
        if (lock) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [lock]);
};

/**
 * Premium Modal for Text Expansion
 */
const ExpandTextModal = ({ isOpen, onClose, title, value, onSave, fieldKey }) => {
    const [localValue, setLocalValue] = useState(value);
    useScrollLock(isOpen);

    useEffect(() => {
        if (isOpen) setLocalValue(value);
    }, [isOpen, value]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-slate-900 w-full max-w-6xl rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col h-[85vh] border border-white/10 scale-in-center transition-all">
                <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-white/5 backdrop-blur-xl">
                    <h3 className="text-2xl font-black text-white flex items-center gap-4">
                        <span className="p-3 bg-green-500/10 text-green-400 rounded-2xl border border-green-500/20 shadow-xl shadow-green-500/5">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
                        </span>
                        {title}
                    </h3>
                </div>
                <div className="flex-1 p-8 overflow-hidden flex flex-col bg-slate-950/20">
                    <textarea
                        className="w-full flex-1 p-10 bg-slate-800/20 border-2 border-white/5 rounded-[2rem] focus:border-green-500/30 focus:bg-slate-800/40 outline-none resize-none text-2xl text-slate-100 font-medium leading-relaxed shadow-inner placeholder:text-slate-600 transition-all"
                        value={localValue}
                        onChange={(e) => setLocalValue(e.target.value)}
                        placeholder="Digite aqui sua mensagem expandida..."
                    />
                    <div className="mt-6 flex items-center justify-between px-4">
                        <div className="text-sm font-bold text-slate-500 flex items-center gap-4">
                            <span className="px-4 py-1.5 bg-black/40 rounded-xl text-green-400 font-mono border border-white/5">
                                {localValue.length} caracteres
                            </span>
                            <span className="opacity-40">•</span>
                            <span className="italic opacity-80 uppercase tracking-widest text-[10px]">As variáveis (ex: {"{{1}}"}) serão mantidas durante o envio em massa.</span>
                        </div>
                    </div>
                </div>
                <div className="px-10 py-8 bg-black/20 border-t border-white/5 flex justify-end gap-6 items-center">
                    <button
                        onClick={onClose}
                        className="px-8 py-3 text-slate-400 font-black hover:text-white transition-all uppercase tracking-widest text-xs"
                    >
                        Descartar
                    </button>
                    <button
                        onClick={() => { onSave(fieldKey, localValue); onClose(); }}
                        className="px-12 py-4 bg-gradient-to-r from-green-600 to-emerald-500 text-white font-black rounded-2xl hover:from-green-500 hover:to-emerald-400 shadow-2xl shadow-green-900/20 transition-all active:scale-95 flex items-center gap-3"
                    >
                        SALVAR ALTERAÇÕES
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg>
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ExpandTextModal;
