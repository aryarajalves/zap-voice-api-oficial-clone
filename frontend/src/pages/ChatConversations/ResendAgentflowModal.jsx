import React, { useState, useEffect } from 'react';
import { FiSend } from 'react-icons/fi';

export default function ResendAgentflowModal({
    isOpen,
    onClose,
    onConfirm,
    initialContent
}) {
    const [content, setContent] = useState('');

    useEffect(() => {
        if (isOpen) {
            setContent(initialContent || '');
        }
    }, [isOpen, initialContent]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-[#1e293b] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 text-gray-100">
                <h3 className="text-base font-bold text-white mb-2">
                    Confirmar Reenvio ao AgentFlow?
                </h3>
                <p className="text-sm text-gray-400 mb-3">
                    Você pode alterar a mensagem abaixo antes de reenviar para o Webhook de Integração (AgentFlow):
                </p>
                <div className="mb-5">
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="w-full h-36 p-3 bg-slate-900 border border-white/10 rounded-xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition resize-none"
                        placeholder="Digite a mensagem que deseja reenviar..."
                    />
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 text-sm font-semibold transition"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => onConfirm(content)}
                        className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition flex items-center justify-center gap-1.5"
                    >
                        <FiSend size={12} />
                        Sim, Reenviar
                    </button>
                </div>
            </div>
        </div>
    );
}
