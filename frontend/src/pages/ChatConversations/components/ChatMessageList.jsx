import React, { useState } from 'react';
import { FiRefreshCw, FiMessageSquare, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import ChatMessageBubble from './ChatMessageBubble';
import PinnedMessageBanner from './PinnedMessageBanner';
import MessageContextMenu from './MessageContextMenu';
import ReactionEmojiPickerModal from './ReactionEmojiPickerModal';
import { getDateKey, formatDateSeparator } from '../utils/chatDateUtils';

export default function ChatMessageList({
    engine,
    selectedConvo,
    handleScrollMessages,
    getMediaSrc,
    formatMessageTimestamp,
    editingNoteId,
    setEditingNoteId,
    editingNoteText,
    setEditingNoteText,
    isSavingNoteMsg,
    handleSaveEditedNote,
    setIsNoteModalMaximized,
    setDeleteNoteConfirmMsgId,
    setReplyingTo,
    chatInputRef,
    highlightedMsgId,
    handleTogglePinMessage,
    handleToggleStarMessage,
    handleCopyMessageContent,
    handleDeleteMessage
}) {
    const contactInitial = (selectedConvo?.contact_name || selectedConvo?.phone || 'C').charAt(0).toUpperCase();
    const contactDisplayName = selectedConvo?.contact_name || selectedConvo?.phone || 'contato';

    const [contextMenu, setContextMenu] = useState({
        isOpen: false,
        position: null,
        targetMessage: null
    });

    const [reactionPickerMsg, setReactionPickerMsg] = useState(null);

    const handleOpenContextMenu = (e, msg) => {
        setContextMenu({
            isOpen: true,
            position: { x: e.clientX, y: e.clientY },
            targetMessage: msg
        });
    };

    const handleCloseContextMenu = () => {
        setContextMenu({ isOpen: false, position: null, targetMessage: null });
    };

    const scrollToBottom = () => {
        const container = engine?.messagesContainerRef?.current;
        if (container) {
            if (typeof container.scrollTo === 'function') {
                container.scrollTo({
                    top: container.scrollHeight,
                    behavior: 'smooth'
                });
            } else {
                container.scrollTop = container.scrollHeight;
            }
        }
        if (typeof engine?.messagesEndRef?.current?.scrollIntoView === 'function') {
            engine.messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
        engine?.setShowScrollBtn?.(false);
    };

    const scrollToTop = async () => {
        if (engine?.hasMoreMessages && typeof engine?.loadAllMessagesAndScrollToTop === 'function') {
            await engine.loadAllMessagesAndScrollToTop();
        }
        const container = engine?.messagesContainerRef?.current;
        if (container) {
            if (typeof container.scrollTo === 'function') {
                container.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            } else {
                container.scrollTop = 0;
            }
        }
        engine?.setShowScrollTopBtn?.(false);
    };

    // Tela de Carregamento Completa (Só exibe as mensagens quando carregar 100%)
    if (engine.isLoadingMessages) {
        return (
            <div 
                data-testid="chat-loading-screen"
                className="flex-1 flex flex-col items-center justify-center p-8 bg-[#f8fafc] dark:bg-[#0b0f19] text-center select-none animate-in fade-in duration-200"
            >
                <div className="relative mb-4 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-2xl bg-blue-500/10 dark:bg-blue-600/20 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-500/30 shadow-[0_0_30px_rgba(37,99,235,0.18)] animate-pulse">
                        <span className="text-2xl font-black tracking-wider">
                            {contactInitial}
                        </span>
                    </div>
                    <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-blue-600 border-2 border-white dark:border-[#0b0f19] flex items-center justify-center shadow-md">
                        <FiRefreshCw className="text-white animate-spin" size={11} />
                    </div>
                </div>

                <h3 className="font-bold text-gray-800 dark:text-white text-base tracking-tight mb-1">
                    Carregando conversa
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[280px] line-clamp-1 mb-4">
                    Sincronizando mensagens de <strong className="text-gray-700 dark:text-gray-300 font-semibold">{contactDisplayName}</strong>
                </p>

                {/* Barra de progresso suave */}
                <div className="w-44 h-1.5 bg-gray-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 via-indigo-400 to-blue-600 rounded-full animate-pulse w-full" />
                </div>
            </div>
        );
    }

    // Tela de Mensagens (100% Carregada)
    return (
        <div className="flex-1 relative flex flex-col min-h-0">
            {/* Banner Superior de Mensagem Fixada */}
            <PinnedMessageBanner
                pinnedMessageId={selectedConvo?.pinned_message_id}
                allMessages={engine.messages}
                selectedConvo={selectedConvo}
                onUnpin={handleTogglePinMessage}
            />

            {/* Botão Flutuante Superior Esquerdo para Rolar até a Primeira Mensagem */}
            {engine?.showScrollTopBtn && (
                <button
                    type="button"
                    onClick={scrollToTop}
                    data-testid="scroll-to-top-button"
                    className="absolute top-12 left-5 z-20 flex items-center gap-1.5 px-3 py-2 rounded-full bg-[#1e293b]/95 hover:bg-blue-600 text-white border border-white/20 shadow-2xl hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] backdrop-blur-md transition-all active:scale-95 duration-200 cursor-pointer animate-in fade-in zoom-in-75 group select-none"
                    title="Ir para a primeira mensagem"
                >
                    <FiChevronUp size={16} className="text-blue-400 group-hover:text-white transition-colors animate-bounce" />
                    <span className="text-[11px] font-semibold text-gray-200 group-hover:text-white">Primeira mensagem</span>
                </button>
            )}

            <div
                ref={engine.messagesContainerRef}
                onScroll={handleScrollMessages}
                data-testid="chat-messages-container"
                className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f8fafc] dark:bg-[#0b0f19] relative animate-in fade-in duration-300"
            >
                {engine.messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 select-none py-12">
                        <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-slate-800/60 flex items-center justify-center mb-3">
                            <FiMessageSquare size={22} className="text-gray-400" />
                        </div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Nenhuma mensagem registrada ainda</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Envie uma mensagem abaixo para iniciar a conversa.</p>
                    </div>
                ) : (
                    engine.messages.map((msg, index) => {
                        const prevMsg = index > 0 ? engine.messages[index - 1] : null;
                        const currentDateKey = getDateKey(msg.timestamp);
                        const prevDateKey = prevMsg ? getDateKey(prevMsg.timestamp) : null;
                        const isNewDay = index === 0 || (currentDateKey && currentDateKey !== prevDateKey);
                        const dateLabel = isNewDay ? formatDateSeparator(msg.timestamp) : null;

                        return (
                            <React.Fragment key={msg.id || index}>
                                {isNewDay && dateLabel && (
                                    <div className="flex justify-center my-3 sticky top-1 z-10 select-none">
                                        <div 
                                            data-testid="chat-date-separator"
                                            className="px-3.5 py-1 rounded-full text-[11px] font-semibold tracking-wide bg-gray-200/90 dark:bg-[#1e293b]/95 text-gray-700 dark:text-gray-300 border border-gray-300/50 dark:border-white/10 shadow-sm backdrop-blur-md"
                                        >
                                            {dateLabel}
                                        </div>
                                    </div>
                                )}
                                <ChatMessageBubble
                                    key={msg.id}
                                    msg={msg}
                                    selectedConvo={selectedConvo}
                                    allMessages={engine.messages}
                                    getMediaSrc={getMediaSrc}
                                    formatMessageTimestamp={formatMessageTimestamp}
                                    editingNoteId={editingNoteId}
                                    setEditingNoteId={setEditingNoteId}
                                    editingNoteText={editingNoteText}
                                    setEditingNoteText={setEditingNoteText}
                                    isSavingNoteMsg={isSavingNoteMsg}
                                    handleSaveEditedNote={handleSaveEditedNote}
                                    setIsNoteModalMaximized={setIsNoteModalMaximized}
                                    setDeleteNoteConfirmMsgId={setDeleteNoteConfirmMsgId}
                                    setReplyingTo={setReplyingTo}
                                    chatInputRef={chatInputRef}
                                    engine={engine}
                                    highlightedMsgId={highlightedMsgId}
                                    onOpenContextMenu={handleOpenContextMenu}
                                />
                            </React.Fragment>
                        );
                    })
                )}
                <div ref={engine.messagesEndRef} />
            </div>

            {/* Botão Flutuante Inferior Direito para Rolar até a Última Mensagem */}
            {engine?.showScrollBtn && (
                <button
                    type="button"
                    onClick={scrollToBottom}
                    data-testid="scroll-to-bottom-button"
                    className="absolute bottom-4 right-5 z-20 flex items-center justify-center p-3 rounded-full bg-[#1e293b]/95 hover:bg-emerald-600 text-white border border-white/20 shadow-2xl hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] backdrop-blur-md transition-all active:scale-95 duration-200 cursor-pointer animate-in fade-in zoom-in-75 group"
                    title="Rolar para a última mensagem"
                >
                    <FiChevronDown size={20} className="text-emerald-400 group-hover:text-white transition-colors animate-bounce" />
                </button>
            )}

            {/* Menu de Contexto (Botão Direito / Chevron) */}
            <MessageContextMenu
                isOpen={contextMenu.isOpen}
                onClose={handleCloseContextMenu}
                position={contextMenu.position}
                targetMessage={contextMenu.targetMessage}
                selectedConvo={selectedConvo}
                onReply={(msg) => {
                    setReplyingTo({
                        id: msg.id,
                        content: msg.content || (msg.media_url ? '[Mídia]' : ''),
                        sender_type: msg.sender_type,
                        wa_message_id: msg.wa_message_id || msg.wamid || msg.message_id || String(msg.id)
                    });
                    if (chatInputRef?.current) chatInputRef.current.focus();
                }}
                onCopy={(msg) => handleCopyMessageContent?.(msg)}
                onReact={(msg, emoji) => {
                    const targetMsgId = msg.wa_message_id || msg.wamid || msg.message_id || msg.id;
                    engine.sendReaction(targetMsgId, emoji);
                }}
                onOpenEmojiPicker={(msg) => {
                    setReactionPickerMsg(msg);
                }}
                onTogglePin={(msg) => handleTogglePinMessage?.(msg)}
                onToggleStar={(msg) => handleToggleStarMessage?.(msg)}
                onDelete={(msg) => {
                    if (msg.sender_type === 'system') {
                        setDeleteNoteConfirmMsgId(msg.id);
                    } else if (handleDeleteMessage) {
                        handleDeleteMessage(msg.id);
                    } else {
                        setDeleteNoteConfirmMsgId(msg.id);
                    }
                }}
            />

            {/* Modal Seletor de Emojis para Reação */}
            <ReactionEmojiPickerModal
                isOpen={Boolean(reactionPickerMsg)}
                onClose={() => setReactionPickerMsg(null)}
                targetMessage={reactionPickerMsg}
                onSelectEmoji={(msg, emoji) => {
                    const targetMsgId = msg.wa_message_id || msg.wamid || msg.message_id || msg.id;
                    engine.sendReaction(targetMsgId, emoji);
                }}
            />
        </div>
    );
}
