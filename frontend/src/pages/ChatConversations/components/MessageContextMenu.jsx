import React, { useEffect, useRef, useState } from 'react';
import { FiCornerUpLeft, FiCopy, FiPlus } from 'react-icons/fi';
import { BsPinAngle, BsPinAngleFill, BsStar, BsStarFill } from 'react-icons/bs';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export default function MessageContextMenu({
    isOpen,
    onClose,
    position,
    targetMessage,
    selectedConvo,
    onReply,
    onCopy,
    onReact,
    onOpenEmojiPicker,
    onTogglePin,
    onToggleStar
}) {
    const menuRef = useRef(null);
    const [adjustedPos, setAdjustedPos] = useState({ top: 0, left: 0 });

    useEffect(() => {
        if (!isOpen || !position) return;

        const updatePosition = () => {
            const menuEl = menuRef.current;
            const menuWidth = menuEl ? menuEl.offsetWidth || 230 : 230;
            const menuHeight = menuEl ? menuEl.offsetHeight || 290 : 290;

            const padding = 12;
            let left = position.x;
            let top = position.y;

            if (left + menuWidth > window.innerWidth - padding) {
                left = window.innerWidth - menuWidth - padding;
            }
            if (left < padding) {
                left = padding;
            }

            if (top + menuHeight > window.innerHeight - padding) {
                top = window.innerHeight - menuHeight - padding;
            }
            if (top < padding) {
                top = padding;
            }

            setAdjustedPos({ top, left });
        };

        updatePosition();

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose?.();
        };

        const handleScroll = () => {
            onClose?.();
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('scroll', handleScroll, true);
        window.addEventListener('resize', updatePosition);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('scroll', handleScroll, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isOpen, position, onClose]);

    if (!isOpen || !targetMessage) return null;

    const isPinned = String(selectedConvo?.pinned_message_id) === String(targetMessage?.id);
    const isStarred = Boolean(targetMessage?.is_starred || (targetMessage?.meta_data && targetMessage.meta_data.is_starred));
    const canDelete = targetMessage?.sender_type === 'user' || targetMessage?.sender_type === 'system';

    return (
        <div className="fixed inset-0 z-50 select-none" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose?.(); }}>
            <div
                ref={menuRef}
                style={{ top: `${adjustedPos.top}px`, left: `${adjustedPos.left}px` }}
                onClick={(e) => e.stopPropagation()}
                data-testid="message-context-menu"
                className="fixed bg-[#182234]/95 dark:bg-[#0f172a]/95 backdrop-blur-xl border border-gray-700/60 dark:border-white/10 rounded-2xl shadow-2xl py-1.5 px-1 min-w-[210px] max-w-[250px] text-gray-200 z-50 text-xs animate-in fade-in zoom-in-95 duration-150"
            >
                {/* Barra rápida de emojis no topo */}
                <div className="flex items-center justify-between px-2 py-1.5 mb-1 bg-white/5 dark:bg-black/20 rounded-xl border border-white/5">
                    {QUICK_EMOJIS.map((emoji) => (
                        <button
                            key={emoji}
                            type="button"
                            onClick={() => {
                                onReact?.(targetMessage, emoji);
                                onClose?.();
                            }}
                            className="hover:scale-125 active:scale-95 transition-transform text-sm p-1 rounded-full hover:bg-white/10 cursor-pointer flex items-center justify-center"
                            title={`Reagir com ${emoji}`}
                        >
                            {emoji}
                        </button>
                    ))}
                    <button
                        type="button"
                        onClick={() => {
                            onOpenEmojiPicker?.(targetMessage);
                            onClose();
                        }}
                        className="hover:scale-110 active:scale-95 text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition flex items-center justify-center cursor-pointer"
                        title="Mais reações"
                    >
                        <FiPlus size={13} />
                    </button>
                </div>

                <div className="h-[1px] bg-gray-700/40 dark:bg-white/5 my-1 mx-1" />

                {/* Opções do Menu */}
                <div className="space-y-0.5 font-sans">
                    {/* Responder */}
                    <button
                        type="button"
                        onClick={() => {
                            onReply?.(targetMessage);
                            onClose?.();
                        }}
                        data-testid="context-menu-reply"
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 dark:hover:bg-white/10 text-gray-200 hover:text-white transition text-left cursor-pointer group"
                    >
                        <FiCornerUpLeft size={15} className="text-blue-400 group-hover:scale-110 transition-transform" />
                        <span className="font-medium">Responder</span>
                    </button>

                    {/* Copiar */}
                    <button
                        type="button"
                        onClick={() => {
                            onCopy?.(targetMessage);
                            onClose?.();
                        }}
                        data-testid="context-menu-copy"
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 dark:hover:bg-white/10 text-gray-200 hover:text-white transition text-left cursor-pointer group"
                    >
                        <FiCopy size={15} className="text-gray-400 group-hover:text-white group-hover:scale-110 transition-transform" />
                        <span className="font-medium">Copiar</span>
                    </button>

                    {/* Fixar / Desafixar */}
                    <button
                        type="button"
                        onClick={() => {
                            onTogglePin?.(targetMessage);
                            onClose?.();
                        }}
                        data-testid="context-menu-pin"
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 dark:hover:bg-white/10 text-gray-200 hover:text-white transition text-left cursor-pointer group"
                    >
                        {isPinned ? (
                            <>
                                <BsPinAngleFill size={15} className="text-blue-400 group-hover:scale-110 transition-transform" />
                                <span className="font-medium text-blue-300">Desafixar</span>
                            </>
                        ) : (
                            <>
                                <BsPinAngle size={15} className="text-gray-400 group-hover:text-blue-400 group-hover:scale-110 transition-transform" />
                                <span className="font-medium">Fixar</span>
                            </>
                        )}
                    </button>

                    {/* Favoritar / Desfavoritar */}
                    <button
                        type="button"
                        onClick={() => {
                            onToggleStar?.(targetMessage);
                            onClose?.();
                        }}
                        data-testid="context-menu-star"
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 dark:hover:bg-white/10 text-gray-200 hover:text-white transition text-left cursor-pointer group"
                    >
                        {isStarred ? (
                            <>
                                <BsStarFill size={15} className="text-amber-400 group-hover:scale-110 transition-transform" />
                                <span className="font-medium text-amber-300">Desfavoritar</span>
                            </>
                        ) : (
                            <>
                                <BsStar size={15} className="text-gray-400 group-hover:text-amber-400 group-hover:scale-110 transition-transform" />
                                <span className="font-medium">Favoritar</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
