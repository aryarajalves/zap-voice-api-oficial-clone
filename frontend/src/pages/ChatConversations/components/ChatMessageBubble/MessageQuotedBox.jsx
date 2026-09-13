import React from 'react';
import { FiCornerUpLeft } from 'react-icons/fi';
import { getFirstName } from '../../../../utils/nameFormatter';

export default function MessageQuotedBox({
    msg,
    allMessages = [],
    selectedConvo,
    isMe
}) {
    if (!msg?.quoted_message_id) return null;

    const qId = String(msg.quoted_message_id);
    const cleanQId = qId.replace('wamid.', '');
    const quotedMsg = allMessages.find(m => {
        if (!m) return false;
        const mWaId = String(m.wa_message_id || '');
        const mCleanWaId = mWaId.replace('wamid.', '');
        const mId = String(m.id || '');
        return mWaId === qId || mCleanWaId === cleanQId || mId === qId || mId === cleanQId;
    });

    const isQuotedMe = quotedMsg ? (quotedMsg.sender_type === 'user' || quotedMsg.sender_type === 'agent') : false;
    const authorLabel = isQuotedMe ? 'Você' : (selectedConvo?.contact_name || getFirstName(selectedConvo?.phone) || 'Contato');
    const quotedText = quotedMsg?.content || 'Mensagem citada';

    const scrollToQuotedMsg = (e) => {
        e.stopPropagation();
        if (!quotedMsg) return;
        let targetEl = document.getElementById(`msg-${quotedMsg.id}`);
        if (!targetEl && quotedMsg.wa_message_id) {
            targetEl = document.querySelector(`[data-wamid="${quotedMsg.wa_message_id}"]`);
        }
        if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const bubbleEl = targetEl.lastElementChild || targetEl;
            bubbleEl.classList.add('ring-4', 'ring-yellow-400', 'scale-105');
            setTimeout(() => {
                bubbleEl.classList.remove('ring-4', 'ring-yellow-400', 'scale-105');
            }, 1500);
        }
    };

    return (
        <div 
            onClick={scrollToQuotedMsg}
            className={`mb-2 p-2 rounded-lg border-l-4 text-xs font-sans select-none overflow-hidden cursor-pointer hover:opacity-90 active:scale-[0.99] transition-all ${
                isMe
                ? 'bg-black/20 border-white/70 text-white/90'
                : 'bg-gray-100 dark:bg-black/30 border-blue-500 text-gray-700 dark:text-gray-300'
            }`}
            title="Clique para ir até a mensagem original"
        >
            <div className="flex items-center gap-1 font-semibold text-[11px] mb-0.5 text-blue-400 dark:text-blue-300">
                <FiCornerUpLeft size={11} />
                <span>{authorLabel}</span>
            </div>
            <p className="line-clamp-2 text-[11px] opacity-90 leading-tight">
                {quotedText}
            </p>
        </div>
    );
}
