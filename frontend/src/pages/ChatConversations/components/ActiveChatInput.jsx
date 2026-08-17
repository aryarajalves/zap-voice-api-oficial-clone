import React, { useState } from 'react';
import { FiSend, FiPaperclip, FiMic, FiSquare, FiMaximize2, FiCornerUpLeft, FiX, FiRefreshCw, FiSmile, FiTrash2 } from 'react-icons/fi';
import { BsJournalText } from 'react-icons/bs';
import { getFirstName } from '../../../utils/nameFormatter';
import EmojiPickerDropdown from './EmojiPickerDropdown';
import AudioPreviewPlayer from './AudioPreviewPlayer';
import QuickRepliesDropdown from './QuickRepliesDropdown';
import { useQuickReplies } from '../hooks/useQuickReplies';

export default function ActiveChatInput({
    engine,
    selectedConvo,
    activeClientId,
    replyingTo,
    setReplyingTo,
    chatInputRef,
    handleMediaUpload,
    setShowTemplateModal,
    setIsMaximizedInputOpen,
    startRecording,
    stopRecordingToPreview,
    discardRecordedAudio,
    sendRecordedAudio,
    cancelRecording,
    recordedAudio,
    isSendingAudio
}) {
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
    const isWindowClosed = engine.timeLeft24h === 'Janela Fechada';

    const quickReplies = useQuickReplies({
        engine,
        selectedConvo,
        chatInputRef,
        activeClientId
    });

    const handleSelectEmoji = (emoji) => {
        const input = chatInputRef.current;
        if (input) {
            const start = input.selectionStart || 0;
            const end = input.selectionEnd || 0;
            const currentVal = engine.newMessage || '';
            const newVal = currentVal.substring(0, start) + emoji + currentVal.substring(end);
            engine.setNewMessage(newVal);
            
            // Reposicionar cursor logo após o emoji inserido
            setTimeout(() => {
                input.focus();
                input.setSelectionRange(start + emoji.length, start + emoji.length);
            }, 10);
        } else {
            engine.setNewMessage(prev => (prev || '') + emoji);
        }
    };

    return (
        <>
            {/* Barra de Preview de Resposta (quando replyingTo está ativo) */}
            {replyingTo && (
                <div className="px-4 py-2 bg-blue-500/10 border-t border-blue-500/20 flex items-center justify-between gap-2 text-xs animate-in slide-in-from-bottom-2 duration-200">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <div className="w-1 h-8 bg-blue-500 rounded-full shrink-0" />
                        <div className="overflow-hidden">
                            <div className="flex items-center gap-1 text-[11px] font-semibold text-blue-500 dark:text-blue-400">
                                <FiCornerUpLeft size={12} />
                                <span>Respondendo a {replyingTo.sender_type === 'user' || replyingTo.sender_type === 'agent' ? 'Você' : (selectedConvo?.contact_name || getFirstName(selectedConvo?.phone) || 'Contato')}</span>
                            </div>
                            <p className="text-gray-600 dark:text-gray-300 truncate text-[11px]">
                                {replyingTo.content || '[Mídia]'}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setReplyingTo(null)}
                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition shrink-0"
                        title="Cancelar resposta"
                    >
                        <FiX size={15} />
                    </button>
                </div>
            )}

            {/* Input de Envio */}
            <form 
                onSubmit={(e) => {
                    const opts = replyingTo?.wa_message_id ? { quotedWaMessageId: replyingTo.wa_message_id } : {};
                    engine.handleSendMessage(e, opts);
                    setReplyingTo(null);
                    setIsEmojiPickerOpen(false);
                }} 
                className="p-4 border-t border-gray-200 dark:border-white/5 bg-gray-50/20 dark:bg-[#111827]/20 flex gap-2 relative items-center"
            >
                {/* Upload de arquivos de mídia */}
                <input
                    type="file"
                    id="chat-media-upload"
                    className="hidden"
                    onChange={handleMediaUpload}
                    accept="image/*,video/*,audio/*,application/pdf"
                    disabled={engine.isSending || isWindowClosed || engine.isRecording || Boolean(recordedAudio)}
                />
                {!engine.isRecording && !recordedAudio && (
                    <button
                        type="button"
                        onClick={() => document.getElementById('chat-media-upload').click()}
                        disabled={engine.isSending || isWindowClosed}
                        className="p-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 rounded-xl transition-all flex items-center justify-center shrink-0 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                        title={isWindowClosed ? "Janela Fechada" : "Enviar Mídia ou Documento"}
                    >
                        <FiPaperclip size={18} />
                    </button>
                )}

                {!engine.isRecording && !recordedAudio && (
                    <button
                        type="button"
                        onClick={() => setShowTemplateModal(true)}
                        disabled={engine.isSending}
                        className="p-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 rounded-xl transition-all flex items-center justify-center shrink-0 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                        title="Enviar Template (WhatsApp)"
                    >
                        <BsJournalText size={18} />
                    </button>
                )}

                {!engine.isRecording && !recordedAudio && (
                    <button
                        type="button"
                        onClick={() => setIsMaximizedInputOpen(true)}
                        disabled={engine.isSending || isWindowClosed}
                        className="p-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 rounded-xl transition-all flex items-center justify-center shrink-0 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                        title="Maximizar campo de texto"
                    >
                        <FiMaximize2 size={18} />
                    </button>
                )}

                {/* Botão Seletor de Emojis */}
                {!engine.isRecording && !recordedAudio && (
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                            disabled={engine.isSending || isWindowClosed}
                            className={`p-2.5 rounded-xl transition-all flex items-center justify-center shrink-0 disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${
                                isEmojiPickerOpen
                                    ? 'bg-blue-600/20 text-blue-500 border border-blue-500/30'
                                    : 'bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300'
                            }`}
                            title="Escolher Emoji"
                        >
                            <FiSmile size={18} />
                        </button>

                        <EmojiPickerDropdown
                            isOpen={isEmojiPickerOpen}
                            onClose={() => setIsEmojiPickerOpen(false)}
                            onSelectEmoji={handleSelectEmoji}
                            position="top"
                        />
                    </div>
                )}

                {/* Estado 1: Pré-escuta de Áudio Gravado (permite ouvir antes de enviar) */}
                {recordedAudio ? (
                    <AudioPreviewPlayer
                        audioUrl={recordedAudio.url}
                        duration={recordedAudio.duration}
                        onCancel={discardRecordedAudio}
                        onSend={sendRecordedAudio}
                        isSending={isSendingAudio}
                    />
                ) : engine.isRecording ? (
                    /* Estado 2: Gravação ativa */
                    <div className="flex-1 flex items-center justify-between gap-3 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-xl animate-pulse">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping shrink-0" />
                            <span className="text-red-500 dark:text-red-400 text-sm font-medium">
                                Gravando áudio... {String(Math.floor(engine.audioSeconds / 60)).padStart(2, '0')}:{String(engine.audioSeconds % 60).padStart(2, '0')}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={cancelRecording}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors text-xs font-medium cursor-pointer"
                                title="Cancelar e descartar gravação"
                            >
                                <FiTrash2 size={16} />
                            </button>
                            <button
                                type="button"
                                onClick={stopRecordingToPreview}
                                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                                title="Parar gravação e ouvir antes de enviar"
                            >
                                <FiSquare size={13} />
                                <span>Parar e Ouvir</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Estado 3: Campo de texto normal */
                    <div className="flex-1 relative flex items-center">
                        <QuickRepliesDropdown
                            isOpen={quickReplies.isOpen}
                            quickMessages={quickReplies.quickMessages}
                            selectedIndex={quickReplies.selectedIndex}
                            onSelect={quickReplies.selectQuickMessage}
                        />
                        <textarea
                            ref={chatInputRef}
                            rows={1}
                            placeholder={isWindowClosed ? "Janela de 24h fechada. O cliente precisa enviar uma nova mensagem." : "Digite sua mensagem de resposta... (digite / para respostas rápidas)"}
                            value={engine.newMessage}
                            onChange={(e) => {
                                engine.setNewMessage(e.target.value);
                                e.target.style.height = 'auto';
                                e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
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

                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    if (engine.newMessage.trim() && !engine.isSending && !isWindowClosed) {
                                        const opts = replyingTo?.wa_message_id ? { quotedWaMessageId: replyingTo.wa_message_id } : {};
                                        engine.handleSendMessage(e, opts);
                                        setReplyingTo(null);
                                    }
                                }
                            }}
                            className="w-full px-4 py-2.5 bg-white dark:bg-[#1e293b] text-gray-700 dark:text-gray-200 text-sm rounded-xl border border-gray-200 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-55 disabled:bg-gray-100 dark:disabled:bg-gray-800 resize-none max-h-36 min-h-[42px] font-sans leading-relaxed overflow-y-auto"
                            disabled={engine.isSending || isWindowClosed}
                        />
                    </div>
                )}

                {/* Botão de microfone / parar gravação (quando não há texto nem preview) */}
                {!engine.newMessage.trim() && !recordedAudio && (
                    <button
                        type="button"
                        onClick={engine.isRecording ? stopRecordingToPreview : startRecording}
                        disabled={engine.isSending || isWindowClosed}
                        className={`p-2.5 rounded-xl transition-all flex items-center justify-center shrink-0 disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${
                            engine.isRecording
                            ? 'bg-red-500 hover:bg-red-600 text-white'
                            : 'bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300'
                        }`}
                        title={engine.isRecording ? "Parar e ouvir áudio" : "Gravar áudio"}
                    >
                        {engine.isRecording ? <FiSquare size={18} /> : <FiMic size={18} />}
                    </button>
                )}

                {/* Botão enviar texto (aparece quando há texto digitado) */}
                {engine.newMessage.trim() && !engine.isRecording && !recordedAudio && (
                    <button
                        type="submit"
                        disabled={engine.isSending || !engine.newMessage.trim() || isWindowClosed}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2.5 flex items-center justify-center transition-all disabled:opacity-50 cursor-pointer"
                    >
                        {engine.isSending ? (
                            <FiRefreshCw className="animate-spin" size={16} />
                        ) : (
                            <FiSend size={16} />
                        )}
                    </button>
                )}

                {/* Botão enviar sempre visível quando não há texto nem gravação nem preview */}
                {!engine.newMessage.trim() && !engine.isRecording && !recordedAudio && (
                    <button
                        type="submit"
                        disabled={true}
                        className="bg-blue-600/50 text-white rounded-xl px-4 py-2.5 flex items-center justify-center transition-all opacity-40 cursor-not-allowed"
                    >
                        <FiSend size={16} />
                    </button>
                )}
            </form>
        </>
    );
}
