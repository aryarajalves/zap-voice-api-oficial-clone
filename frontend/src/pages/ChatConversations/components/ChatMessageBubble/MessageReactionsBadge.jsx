import React from 'react';

export default function MessageReactionsBadge({
    reactionList = [],
    isMe,
    msg,
    engine
}) {
    if (!reactionList || reactionList.length === 0) return null;

    return (
        <div className={`absolute -bottom-3 ${isMe ? 'left-2' : 'right-2'} flex gap-0.5 z-10`}>
            {reactionList.map((r, i) => {
                const isMyReaction = r.sender !== 'contact';
                return (
                    <span
                        key={i}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (isMyReaction) {
                                const targetMsgId = msg.wa_message_id || msg.wamid || msg.message_id || msg.id;
                                engine?.sendReaction?.(targetMsgId, '');
                            }
                        }}
                        className={`text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-full px-1.5 py-0.5 shadow-sm leading-none flex items-center justify-center transition-transform ${isMyReaction ? 'cursor-pointer hover:scale-110 hover:bg-red-500/10 hover:border-red-400' : ''}`}
                        title={isMyReaction ? 'Clique para remover sua reação' : 'Contato reagiu'}
                    >
                        {r.emoji}
                    </span>
                );
            })}
        </div>
    );
}
