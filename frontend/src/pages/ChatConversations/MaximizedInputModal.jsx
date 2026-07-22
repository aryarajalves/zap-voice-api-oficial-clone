import React, { useState } from 'react';
import { FiX, FiSend, FiMaximize2, FiRefreshCw } from 'react-icons/fi';

export default function MaximizedInputModal({
    isOpen,
    onClose,
    value,
    onChange,
    onSend,
    isSending,
    contactName
}) {
    const [splitLines, setSplitLines] = useState(() => {
        return localStorage.getItem('zapvoice_split_lines') === 'true';
    });

    const handleSplitLinesChange = (checked) => {
        setSplitLines(checked);
        localStorage.setItem('zapvoice_split_lines', String(checked));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
            
            {/* Modal Container */}
            <div className="relative w-full max-w-3xl bg-[#0f172a]/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[70vh] z-10 animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#1e293b]/50">
                    <h3 className="text-base font-semibold text-white flex items-center gap-2">
                        <FiMaximize2 className="text-blue-500" />
                        Responder para {contactName || 'Contato'} (Maximizado)
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                        title="Fechar"
                    >
                        <FiX size={18} />
                    </button>
                </div>

                {/* Body (Textarea) */}
                <div className="flex-1 p-6 flex flex-col bg-[#0b0f19]">
                    <textarea
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder="Digite ou cole sua resposta aqui..."
                        className="flex-1 w-full p-4 bg-[#1e293b]/40 text-gray-200 text-sm border border-white/5 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none font-sans"
                        disabled={isSending}
                        autoFocus
                    />
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-white/5 bg-[#1e293b]/50">
                    <div className="flex items-center gap-2 select-none">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={splitLines} 
                                onChange={(e) => handleSplitLinesChange(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                            <span className="ms-3 text-xs font-semibold text-gray-300">
                                Enviar quebrando linhas (mensagens separadas)
                            </span>
                        </label>
                    </div>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-white/10 text-gray-300 hover:bg-white/5 rounded-xl text-sm font-semibold transition-colors"
                        >
                            Fechar
                        </button>
                        <button
                            type="button"
                            onClick={(e) => onSend(e, { splitLines })}
                            disabled={!value.trim() || isSending}
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                            {isSending ? (
                                <>
                                    <FiRefreshCw className="animate-spin" size={14} /> Enviando...
                                </>
                            ) : (
                                <>
                                    <FiSend size={14} /> Enviar Resposta
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
