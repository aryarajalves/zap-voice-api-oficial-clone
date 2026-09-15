import React, { useRef, useState } from 'react';
import { FiSend } from 'react-icons/fi';
import { BsPinAngleFill, BsStarFill } from 'react-icons/bs';
import { renderLinkedText } from '../utils/linkifyText';
import SystemMessageBubble from './SystemMessageBubble';
import {
    MessageHoverActions,
    MessageQuotedBox,
    MessageTemplateBadge,
    MessageTemplateHeaderMedia,
    MessageTemplateNotice,
    MessageTemplateButtons,
    MessageTemplateFailureBanner,
    MessageMediaContent,
    MessageReactionsBadge,
    getReactionsList
} from './ChatMessageBubble/index';

export default function ChatMessageBubble({
    msg,
    selectedConvo,
    allMessages = [],
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
    engine,
    highlightedMsgId,
    onOpenContextMenu,
    onOpenPipelineByTriggerId,
    onRetryTemplateMessage
}) {
    const isSystem = msg.sender_type === 'system';
    const isMe = msg.sender_type === 'user';
    const isHighlighted = highlightedMsgId === msg.id;
    const touchTimerRef = useRef(null);
    const [isRetryingTemplate, setIsRetryingTemplate] = useState(false);

    const handleRetry = async (targetMsg) => {
        setIsRetryingTemplate(true);
        try {
            await onRetryTemplateMessage?.(targetMsg);
        } finally {
            setIsRetryingTemplate(false);
        }
    };

    if (isSystem) {
        return (
            <SystemMessageBubble
                msg={msg}
                isHighlighted={isHighlighted}
                editingNoteId={editingNoteId}
                setEditingNoteId={setEditingNoteId}
                editingNoteText={editingNoteText}
                setEditingNoteText={setEditingNoteText}
                isSavingNoteMsg={isSavingNoteMsg}
                handleSaveEditedNote={handleSaveEditedNote}
                setIsNoteModalMaximized={setIsNoteModalMaximized}
                setDeleteNoteConfirmMsgId={setDeleteNoteConfirmMsgId}
                formatMessageTimestamp={formatMessageTimestamp}
                engine={engine}
                selectedConvo={selectedConvo}
                onOpenPipelineByTriggerId={onOpenPipelineByTriggerId}
            />
        );
    }

    const isTemplate = msg.meta_data && msg.meta_data.is_template;
    const reactionList = getReactionsList(msg.meta_data?.reactions);
    const isPinned = String(selectedConvo?.pinned_message_id) === String(msg.id);
    const isStarred = Boolean(msg.is_starred || (msg.meta_data && msg.meta_data.is_starred));

    const handleTouchStart = (e) => {
        if (!e.touches || e.touches.length === 0) return;
        const touch = e.touches[0];
        touchTimerRef.current = setTimeout(() => {
            onOpenContextMenu?.({ clientX: touch.clientX, clientY: touch.clientY, preventDefault: () => {} }, msg);
        }, 500);
    };

    const handleTouchEnd = () => {
        if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    };

    return (
        <div
            id={`msg-${msg.id}`}
            data-wamid={msg.wa_message_id}
            onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onOpenContextMenu?.(e, msg);
            }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${reactionList.length > 0 ? 'mb-4' : ''}`}
        >
            <div
                className={`group/msg relative max-w-lg rounded-2xl px-4 py-2.5 shadow-sm text-sm transition-all duration-300 ${
                    isHighlighted ? 'ring-2 ring-emerald-400 shadow-md z-10 ' : ''
                }${
                    isTemplate
                    ? 'bg-gradient-to-br from-[#1e1b4b] to-[#1e293b] text-gray-100 border border-indigo-500/30 rounded-tr-none'
                    : isMe
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : 'bg-white dark:bg-[#1e293b] text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-white/5 rounded-tl-none'
                }`}
            >
                {/* Barra de Reação Rápida, Reply & Chevron (Hover) */}
                <MessageHoverActions
                    msg={msg}
                    isMe={isMe}
                    reactionList={reactionList}
                    engine={engine}
                    setReplyingTo={setReplyingTo}
                    chatInputRef={chatInputRef}
                    onOpenContextMenu={onOpenContextMenu}
                />

                {/* Citação de mensagem respondida (Quote Box) */}
                <MessageQuotedBox
                    msg={msg}
                    allMessages={allMessages}
                    selectedConvo={selectedConvo}
                    isMe={isMe}
                />

                {/* Badge superior do WhatsApp Template */}
                {isTemplate && (
                    <MessageTemplateBadge templateName={msg.meta_data?.template_name} />
                )}

                {/* Mídia de cabeçalho do Template */}
                {isTemplate && (
                    <MessageTemplateHeaderMedia
                        header={msg.meta_data?.header}
                        mediaUrl={msg.media_url}
                        getMediaSrc={getMediaSrc}
                        metaData={msg.meta_data}
                        msg={msg}
                    />
                )}

                {/* Mídias Regulares (imagem, sticker, vídeo, áudio, documento) ou Cartão de Contato */}
                {(msg.media_url && !isTemplate) || msg.message_type === 'contact' ? (
                    <MessageMediaContent msg={msg} getMediaSrc={getMediaSrc} />
                ) : isTemplate && msg.content && msg.content.startsWith("[Template:") ? (
                    <MessageTemplateNotice
                        content={msg.content}
                        templateName={msg.meta_data?.template_name}
                    />
                ) : (
                    <p className="whitespace-pre-wrap leading-relaxed">{renderLinkedText(msg.content)}</p>
                )}
                
                {/* Botões interativos do Template */}
                {isTemplate && (
                    <MessageTemplateButtons buttons={msg.meta_data?.buttons} />
                )}

                {/* Banner de Falha com Botão para Disparar Novamente o mesmo Template */}
                {isTemplate && (
                    <MessageTemplateFailureBanner
                        msg={msg}
                        onRetry={handleRetry}
                        isRetrying={isRetryingTemplate}
                    />
                )}

                {/* Rodapé da mensagem: reenvio ao AgentFlow, fixação, estrela e timestamp */}
                <div className="flex justify-between items-center mt-2 gap-3">
                    <div>
                        {msg.id === engine?.lastContactMessage?.id && (
                            <button
                                onClick={() => engine?.setConfirmResendAgentflow?.(msg.id)}
                                title="Reenviar esta última mensagem para o Webhook de Integração (AgentFlow)"
                                className="text-[10px] text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-bold flex items-center gap-1 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full transition border border-blue-200 dark:border-blue-800/40"
                            >
                                <FiSend size={10} /> Reenviar ao AgentFlow
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        {isPinned && (
                            <BsPinAngleFill
                                size={11}
                                className={isMe ? 'text-blue-200' : 'text-blue-500 dark:text-blue-400'}
                                title="Mensagem fixada nesta conversa"
                            />
                        )}
                        {isStarred && (
                            <BsStarFill
                                size={11}
                                className={isMe ? 'text-amber-300' : 'text-amber-500 dark:text-amber-400'}
                                title="Mensagem favoritada"
                            />
                        )}
                        <span className="text-[9px] opacity-75 font-medium tracking-wide">
                            {formatMessageTimestamp?.(msg.timestamp)}
                        </span>
                    </div>
                </div>

                {/* Badges de reações no rodapé da bolha */}
                <MessageReactionsBadge
                    reactionList={reactionList}
                    isMe={isMe}
                    msg={msg}
                    engine={engine}
                />
            </div>
        </div>
    );
}
