import React from 'react';
import { FiRefreshCw } from 'react-icons/fi';
import ChatMessageBubble from './ChatMessageBubble';

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
    highlightedMsgId
}) {
    return (
        <div
            ref={engine.messagesContainerRef}
            onScroll={handleScrollMessages}
            className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f8fafc] dark:bg-[#0b0f19] relative"
        >
            {/* Modal de Carregamento Premium Centralizado */}
            {engine.isLoadingMessages && (
                <div className="absolute inset-0 bg-[#0b0f19]/70 backdrop-blur-[2px] z-50 flex items-center justify-center transition-all duration-200">
                    <div className="bg-[#1e293b]/90 border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-3 max-w-[240px] text-center">
                        <div className="relative flex items-center justify-center w-12 h-12">
                            <div className="absolute inset-0 rounded-full border-2 border-white/5"></div>
                            <div className="absolute inset-0 rounded-full border-2 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
                            <FiRefreshCw className="text-blue-500 animate-pulse" size={16} />
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold text-white">Carregando conversa</h4>
                            <p className="text-[11px] text-gray-400 mt-1">Buscando mensagens...</p>
                        </div>
                    </div>
                </div>
            )}

            {engine.messages.map(msg => (
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
                />
            ))}
            <div ref={engine.messagesEndRef} />
        </div>
    );
}
