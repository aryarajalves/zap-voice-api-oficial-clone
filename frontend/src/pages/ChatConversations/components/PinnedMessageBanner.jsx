import React from 'react';
import { FiX } from 'react-icons/fi';
import { BsPinAngleFill } from 'react-icons/bs';
import { getFirstName } from '../../../utils/nameFormatter';

export default function PinnedMessageBanner({
    pinnedMessageId,
    allMessages = [],
    selectedConvo,
    onUnpin,
    onScrollToMessage
}) {
    if (!pinnedMessageId) return null;

    const pinnedMsg = allMessages.find(m => String(m.id) === String(pinnedMessageId));
    if (!pinnedMsg) return null;

    const isMe = pinnedMsg.sender_type === 'user' || pinnedMsg.sender_type === 'agent';
    const isSystem = pinnedMsg.sender_type === 'system';
    const senderName = isMe ? 'Você' : isSystem ? 'Anotação' : (selectedConvo?.contact_name ? getFirstName(selectedConvo.contact_name) : 'Contato');

    let previewContent = pinnedMsg.content || '';
    if (pinnedMsg.media_url && !previewContent) {
        previewContent = pinnedMsg.message_type === 'image' ? '📷 Foto'
            : pinnedMsg.message_type === 'video' ? '🎬 Vídeo'
            : pinnedMsg.message_type === 'audio' || pinnedMsg.message_type === 'voice' ? '🎵 Áudio'
            : '📎 Documento';
    }

    const handleClick = (e) => {
        e.stopPropagation();
        if (onScrollToMessage) {
            onScrollToMessage(pinnedMsg.id);
        } else {
            const targetEl = document.getElementById(`msg-${pinnedMsg.id}`);
            if (targetEl) {
                targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                const bubbleEl = targetEl.lastElementChild || targetEl;
                bubbleEl.classList.add('ring-4', 'ring-amber-400', 'scale-[1.02]');
                setTimeout(() => {
                    bubbleEl.classList.remove('ring-4', 'ring-amber-400', 'scale-[1.02]');
                }, 1800);
            }
        }
    };

    return (
        <div 
            data-testid="pinned-message-banner"
            onClick={handleClick}
            className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-blue-500/10 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-blue-900/40 border-b border-blue-500/20 dark:border-blue-500/15 backdrop-blur-md cursor-pointer hover:bg-blue-500/15 dark:hover:bg-blue-900/30 transition-all select-none group shrink-0 z-20"
            title="Clique para ir até a mensagem fixada"
        >
            <div className="flex items-center gap-3 overflow-hidden min-w-0 flex-1">
                <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-600 dark:text-blue-400 shrink-0 group-hover:scale-110 transition-transform">
                    <BsPinAngleFill size={14} />
                </div>
                <div className="overflow-hidden min-w-0">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 dark:text-blue-400">
                        <span>Mensagem Fixada</span>
                        <span className="text-[10px] opacity-70">• {senderName}</span>
                    </div>
                    <p className="text-xs text-gray-700 dark:text-gray-300 truncate max-w-md">
                        {previewContent || 'Mensagem'}
                    </p>
                </div>
            </div>

            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onUnpin?.(pinnedMsg);
                }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition shrink-0 ml-2"
                title="Desafixar mensagem"
            >
                <FiX size={15} />
            </button>
        </div>
    );
}
