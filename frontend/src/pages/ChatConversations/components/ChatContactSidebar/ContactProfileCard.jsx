import React from 'react';
import { FiShare2 } from 'react-icons/fi';

export default function ContactProfileCard({
    selectedConvo,
    setSelectedConvo,
    timeLeft24h,
    handleClose24hWindow,
    getFirstName,
    onShareContact
}) {
    const isWindowClosed = !timeLeft24h || timeLeft24h === 'Janela Fechada' || String(timeLeft24h).toLowerCase().includes('fechada');

    return (
        <div className="text-center space-y-2 pb-4 border-b border-gray-200 dark:border-white/5">
            <div className="w-16 h-16 bg-blue-600 rounded-full mx-auto flex items-center justify-center text-white text-xl font-bold shadow-md">
                {getFirstName(selectedConvo.contact_name || selectedConvo.phone || 'C')[0]}
            </div>
            <div className="font-bold text-gray-800 dark:text-gray-100 text-sm break-words">
                {selectedConvo.contact_name || 'Sem Nome'}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                {selectedConvo.phone}
            </div>
            <div className="text-[11px] text-gray-400">
                ID da Conversa: #{selectedConvo.id}
            </div>

            {/* Botão de Compartilhar Contato (Estilo WhatsApp) */}
            {onShareContact && (
                <div className="pt-2 flex flex-col items-center">
                    <button
                        type="button"
                        onClick={onShareContact}
                        className="flex flex-col items-center gap-1 text-gray-700 dark:text-gray-300 hover:text-emerald-500 dark:hover:text-emerald-400 group transition-all cursor-pointer"
                        title="Compartilhar contato com outra conversa"
                    >
                        <div className="w-10 h-10 rounded-full bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-600 dark:text-gray-300 group-hover:bg-emerald-500 group-hover:text-white group-hover:border-emerald-500 shadow-sm transition-all">
                            <FiShare2 size={16} />
                        </div>
                        <span className="text-xs font-semibold">Compartilhar</span>
                    </button>
                </div>
            )}

            <div className="flex flex-col items-center gap-1.5 mt-1">
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                    isWindowClosed
                        ? 'bg-red-500/15 text-red-500 dark:text-red-400 border-red-500/30'
                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                }`}>
                    <span className={`w-2 h-2 rounded-full ${isWindowClosed ? 'bg-red-500' : 'bg-emerald-500 animate-pulse'}`} />
                    <span className={isWindowClosed ? 'text-red-500 dark:text-red-400' : ''}>
                        {isWindowClosed ? 'Janela 24h: Janela Fechada' : `Janela 24h: ${timeLeft24h}`}
                    </span>
                </div>

                {!isWindowClosed && handleClose24hWindow && (
                    <button
                        type="button"
                        onClick={() => handleClose24hWindow(selectedConvo, setSelectedConvo)}
                        className="text-[10px] text-red-500 hover:text-red-600 hover:underline flex items-center gap-1 font-medium transition cursor-pointer mt-0.5"
                        title="Encerrar a janela de 24h deste contato para realizar testes"
                    >
                        🚫 Encerrar Janela 24h (Teste)
                    </button>
                )}
            </div>
        </div>
    );
}
