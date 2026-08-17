import React, { useState, useRef, useEffect } from 'react';
import { FiSmile, FiSearch, FiX } from 'react-icons/fi';

export const EMOJI_CATEGORIES = [
    {
        id: 'smileys',
        name: 'Carinhas & Emoções',
        icon: '😀',
        emojis: [
            '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
            '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
            '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸',
            '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '😣',
            '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬',
            '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗',
            '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯',
            '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐'
        ]
    },
    {
        id: 'gestures',
        name: 'Mãos & Gestos',
        icon: '👍',
        emojis: [
            '👍', '👎', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅',
            '🤳', '💪', '🦾', '🤙', '👈', '👉', '👆', '👇', '🖕', '✋',
            '🤚', '🖐️', '🖖', '👋', '✌️', '🤟', '🤘', '👌', '🤌', '🤏'
        ]
    },
    {
        id: 'hearts',
        name: 'Corações & Amor',
        icon: '❤️',
        emojis: [
            '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
            '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '💋',
            '💌', '💐', '🌹', '🥀', '🌺', '🌸', '🌷', '🌻', '✨', '⭐'
        ]
    },
    {
        id: 'objects',
        name: 'Negócios & Objetos',
        icon: '💼',
        emojis: [
            '💼', '📱', '💻', '⌚', '📦', '🎁', '💰', '💵', '💳', '📊',
            '📈', '📉', '🛒', '🛍️', '🏷️', '📢', '🔔', '🔕', '🎯', '🔥',
            '⚡', '💡', '⏰', '⏳', '⌛', '📅', '📆', '📝', '📄', '🔗',
            '🔒', '🔓', '🔑', '🚀', '⭐', '🌟', '🎉', '🎊', '🏆', '🥇'
        ]
    },
    {
        id: 'symbols',
        name: 'Símbolos & Status',
        icon: '✅',
        emojis: [
            '✅', '❌', '⚠️', '🚨', '❓', '❗', '💯', '🆗', '🆒', '🆕',
            'FREE', '🔴', '🟢', '🔵', '🟡', '🟣', '🟠', '⚫', '⚪', '🟩',
            '🟨', '🟧', '🟥', '🟦', '🟪', '▶️', '⏸️', '⏩', '🔄', '🔁'
        ]
    }
];

export default function EmojiPickerDropdown({
    isOpen,
    onClose,
    onSelectEmoji,
    position = 'bottom' // 'top' | 'bottom'
}) {
    const [selectedCategory, setSelectedCategory] = useState('smileys');
    const [search, setSearch] = useState('');
    const containerRef = useRef(null);

    useEffect(() => {
        if (!isOpen) {
            setSearch('');
            return;
        }

        const handleMouseDownOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                onClose();
            }
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleMouseDownOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleMouseDownOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    // Filtro de emojis baseado na busca
    const allEmojis = EMOJI_CATEGORIES.flatMap(c => c.emojis);
    const displayedEmojis = search.trim()
        ? allEmojis.filter(emoji => emoji.includes(search.trim()))
        : EMOJI_CATEGORIES.find(c => c.id === selectedCategory)?.emojis || [];

    const positionClasses = position === 'top'
        ? 'bottom-full mb-2'
        : 'top-full mt-2';

    return (
        <div
            ref={containerRef}
            className={`absolute ${positionClasses} left-0 z-50 w-72 sm:w-80 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 select-none`}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Header de Categorias */}
            <div className="flex items-center justify-between p-2 border-b border-gray-200 dark:border-white/10 bg-gray-50/80 dark:bg-[#0f172a]/80">
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                    {EMOJI_CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            type="button"
                            onClick={() => { setSelectedCategory(cat.id); setSearch(''); }}
                            title={cat.name}
                            className={`p-1.5 rounded-xl text-base transition-all ${
                                selectedCategory === cat.id && !search
                                    ? 'bg-blue-600/15 border border-blue-500/30 scale-110 shadow-sm'
                                    : 'hover:bg-gray-200 dark:hover:bg-white/10 opacity-70 hover:opacity-100'
                            }`}
                        >
                            {cat.icon}
                        </button>
                    ))}
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-lg transition"
                    title="Fechar seletor de emojis"
                >
                    <FiX size={16} />
                </button>
            </div>

            {/* Campo de Busca */}
            <div className="p-2 border-b border-gray-100 dark:border-white/5 bg-white dark:bg-[#1e293b]">
                <div className="relative flex items-center">
                    <FiSearch className="absolute left-2.5 text-gray-400" size={13} />
                    <input
                        type="text"
                        placeholder="Buscar emoji..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-gray-100 dark:bg-[#0f172a] text-gray-800 dark:text-gray-200 text-xs rounded-xl border border-transparent focus:border-blue-500 focus:outline-none placeholder-gray-400"
                    />
                </div>
            </div>

            {/* Grid de Emojis */}
            <div className="p-3 h-52 overflow-y-auto grid grid-cols-7 sm:grid-cols-8 gap-1.5 bg-white dark:bg-[#1e293b]" data-testid="emoji-grid">
                {displayedEmojis.length > 0 ? (
                    displayedEmojis.map((emoji, index) => (
                        <button
                            key={`${emoji}-${index}`}
                            type="button"
                            data-testid="emoji-item"
                            onClick={() => onSelectEmoji(emoji)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-lg hover:bg-gray-100 dark:hover:bg-white/10 hover:scale-125 transition-transform active:scale-95 cursor-pointer"
                        >
                            {emoji}
                        </button>
                    ))
                ) : (
                    <div className="col-span-full py-8 text-center text-xs text-gray-400">
                        Nenhum emoji encontrado
                    </div>
                )}
            </div>
        </div>
    );
}
