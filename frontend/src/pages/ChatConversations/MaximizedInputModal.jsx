import React, { useState, useRef } from 'react';
import { FiX, FiSend, FiMaximize2, FiRefreshCw, FiSmile } from 'react-icons/fi';
import EmojiPickerDropdown from './components/EmojiPickerDropdown';
import QuickRepliesDropdown from './components/QuickRepliesDropdown';
import { useQuickReplies } from './hooks/useQuickReplies';

export default function MaximizedInputModal({
    isOpen,
    onClose,
    value,
    onChange,
    onSend,
    isSending,
    contactName,
    selectedConvo,
    activeClientId
}) {
    const [splitLines, setSplitLines] = useState(() => {
        return localStorage.getItem('zapvoice_split_lines') === 'true';
    });
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
    const textareaRef = useRef(null);

    const quickReplies = useQuickReplies({
        engine: {
            newMessage: value,
            setNewMessage: onChange
        },
        selectedConvo,
        chatInputRef: textareaRef,
        activeClientId
    });

    const handleSplitLinesChange = (checked) => {
        setSplitLines(checked);
        localStorage.setItem('zapvoice_split_lines', String(checked));
    };

    const handleSelectEmoji = (emoji) => {
        const input = textareaRef.current;
        if (input) {
            const start = input.selectionStart || 0;
            const end = input.selectionEnd || 0;
            const currentVal = value || '';
            const newVal = currentVal.substring(0, start) + emoji + currentVal.substring(end);
            onChange(newVal);

            setTimeout(() => {
                input.focus();
                input.setSelectionRange(start + emoji.length, start + emoji.length);
            }, 10);
        } else {
            onChange((value || '') + emoji);
        }
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
                <div className="flex-1 p-6 flex flex-col bg-[#0b0f19] relative">
                    <QuickRepliesDropdown
                        isOpen={quickReplies.isOpen}
                        quickMessages={quickReplies.quickMessages}
                        selectedIndex={quickReplies.selectedIndex}
                        onSelect={quickReplies.selectQuickMessage}
                        className="absolute bottom-8 left-8 right-8 max-w-xl mx-auto z-[9999] bg-[#0f172a]/95 dark:bg-[#090d16]/95 border border-emerald-500/30 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-150 flex flex-col"
                    />
                    <textarea
                        ref={textareaRef}
                        value={value}
                        onChange={(e) => {
                            onChange(e.target.value);
                            quickReplies.checkSlashTrigger(e.target.value, e.target.selectionStart);
                        }}
                        onClick={(e) => {
                            quickReplies.checkSlashTrigger(e.target.value, e.target.selectionStart);
                        }}
                        onKeyUp={(e) => {
                            if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
                                quickReplies.checkSlashTrigger(e.target.value, e.target.selectionStart);
                            }
                        }}
                        onKeyDown={(e) => {
                            if (quickReplies.isOpen) {
                                const handled = quickReplies.handleKeyDown(e);
                                if (handled) return;
                            }
                        }}
                        placeholder="Digite ou cole sua resposta aqui... (digite / para respostas rápidas)"
                        className="flex-1 w-full p-4 bg-[#1e293b]/40 text-gray-200 text-sm border border-white/5 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none font-sans"
                        disabled={isSending}
                        autoFocus
                    />
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-white/5 bg-[#1e293b]/50">
                    <div className="flex items-center gap-4 select-none">
                        {/* Botão de Emojis Maximizado */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                                disabled={isSending}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                                    isEmojiPickerOpen
                                        ? 'bg-blue-600/20 text-blue-400 border-blue-500/30'
                                        : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10'
                                }`}
                                title="Escolher Emoji"
                            >
                                <FiSmile size={16} />
                                <span>Emojis</span>
                            </button>

                            <EmojiPickerDropdown
                                isOpen={isEmojiPickerOpen}
                                onClose={() => setIsEmojiPickerOpen(false)}
                                onSelectEmoji={handleSelectEmoji}
                                position="top"
                            />
                        </div>

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
