import React from 'react';
import { FiCornerUpLeft, FiChevronDown } from 'react-icons/fi';

const QUICK_REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export default function MessageHoverActions({
    msg,
    isMe,
    reactionList = [],
    engine,
    setReplyingTo,
    chatInputRef,
    onOpenContextMenu
}) {
    const handleReactionClick = (e, emoji, isSelected) => {
        e.stopPropagation();
        const targetMsgId = msg.wa_message_id || msg.wamid || msg.message_id || msg.id;
        engine?.sendReaction?.(targetMsgId, isSelected ? '' : emoji);
    };

    const handleReplyClick = (e) => {
        e.stopPropagation();
        setReplyingTo?.({
            id: msg.id,
            content: msg.content || (msg.media_url ? '[Mídia]' : ''),
            sender_type: msg.sender_type,
            wa_message_id: msg.wa_message_id || msg.wamid || msg.message_id || String(msg.id)
        });
        // Captura a distância do fundo ANTES de o React re-renderizar a barra de reply
        const container = engine?.messagesContainerRef?.current;
        const distFromBottom = container
            ? container.scrollHeight - container.scrollTop - container.clientHeight
            : null;

        // Foco sem deslocar o scroll da página
        if (chatInputRef?.current) {
            try {
                chatInputRef.current.focus({ preventScroll: true });
            } catch {
                chatInputRef.current.focus();
            }
        }

        // Após o React re-renderizar com a barra de reply (que reduz a altura do container),
        // restaura a posição relativa ao fundo para que as mensagens visíveis não se movam.
        if (container && distFromBottom !== null) {
            requestAnimationFrame(() => {
                container.scrollTop = container.scrollHeight - container.clientHeight - distFromBottom;
            });
        }
    };

    const handleContextMenuTrigger = (e) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        onOpenContextMenu?.({ clientX: rect.left, clientY: rect.bottom + 4, preventDefault: () => {} }, msg);
    };

    return (
        <div className={`absolute -top-4 ${isMe ? 'right-2' : 'left-2'} hidden group-hover/msg:flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-1 rounded-full shadow-lg z-20 transition-all scale-90 hover:scale-100`}>
            {QUICK_REACTION_EMOJIS.map((emoji) => {
                const myReaction = reactionList.find(r => r.sender !== 'contact');
                const isSelected = myReaction?.emoji === emoji;

                return (
                    <button
                        key={emoji}
                        type="button"
                        onClick={(e) => handleReactionClick(e, emoji, isSelected)}
                        className={`hover:scale-125 transition-transform text-xs p-0.5 cursor-pointer leading-none rounded-full ${isSelected ? 'bg-blue-500/20 ring-1 ring-blue-400' : ''}`}
                        title={isSelected ? `Remover reação ${emoji}` : `Reagir com ${emoji}`}
                    >
                        {emoji}
                    </button>
                );
            })}
            <div className="w-[1px] h-3 bg-gray-300 dark:bg-gray-600 mx-0.5" />
            <button
                type="button"
                onClick={handleReplyClick}
                className="hover:scale-125 text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 transition-transform p-0.5 cursor-pointer flex items-center justify-center"
                title="Responder a esta mensagem"
            >
                <FiCornerUpLeft size={13} />
            </button>
            <button
                type="button"
                onClick={handleContextMenuTrigger}
                className="hover:scale-125 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-transform p-0.5 cursor-pointer flex items-center justify-center"
                title="Opções da mensagem"
            >
                <FiChevronDown size={13} />
            </button>
        </div>
    );
}
