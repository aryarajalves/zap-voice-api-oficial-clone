import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FiSmile, FiSearch, FiX } from 'react-icons/fi';
import { EMOJI_CATEGORIES } from './EmojiPickerDropdown';

export default function ReactionEmojiPickerModal({
    isOpen,
    onClose,
    targetMessage,
    onSelectEmoji
}) {
    const [selectedCategory, setSelectedCategory] = useState('smileys');
    const [search, setSearch] = useState('');
    const searchInputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setSearch('');
            setSelectedCategory('smileys');
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 100);
        }
    }, [isOpen]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose?.();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen || !targetMessage) return null;

    const allEmojis = EMOJI_CATEGORIES.flatMap(c => c.emojis);
    const displayedEmojis = search.trim()
        ? allEmojis.filter(emoji => emoji.includes(search.trim()))
        : EMOJI_CATEGORIES.find(c => c.id === selectedCategory)?.emojis || [];

    const handlePick = (emoji) => {
        onSelectEmoji?.(targetMessage, emoji);
        onClose?.();
    };

    const modalContent = (
        <div 
            className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md select-none"
            onClick={onClose}
            data-testid="reaction-emoji-picker-modal"
        >
            <div 
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[85vh] text-gray-800 dark:text-gray-100 animate-in fade-in zoom-in-95 duration-150"
            >
                {/* Header */}
                <div className="p-3.5 border-b border-gray-200 dark:border-white/10 flex items-center justify-between bg-gray-50/80 dark:bg-black/40">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-xl bg-amber-500/15 text-amber-500">
                            <FiSmile size={18} />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm text-gray-800 dark:text-white">
                                Escolha uma Reação
                            </h3>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                Clique em um emoji para reagir à mensagem
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition cursor-pointer"
                        title="Fechar"
                    >
                        <FiX size={18} />
                    </button>
                </div>

                {/* Categorias de Emojis */}
                <div className="flex items-center gap-1 p-2 border-b border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-black/20 overflow-x-auto no-scrollbar">
                    {EMOJI_CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            type="button"
                            onClick={() => { setSelectedCategory(cat.id); setSearch(''); }}
                            title={cat.name}
                            className={`p-1.5 rounded-xl text-base transition-all cursor-pointer ${
                                selectedCategory === cat.id && !search
                                    ? 'bg-blue-600/15 border border-blue-500/30 scale-110 shadow-sm'
                                    : 'hover:bg-gray-200 dark:hover:bg-white/10 opacity-70 hover:opacity-100'
                            }`}
                        >
                            {cat.icon}
                        </button>
                    ))}
                </div>

                {/* Campo de Busca */}
                <div className="p-2.5 border-b border-gray-100 dark:border-white/5 bg-white dark:bg-[#111827]">
                    <div className="relative flex items-center">
                        <FiSearch className="absolute left-2.5 text-gray-400" size={14} />
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Buscar emoji..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 bg-gray-100 dark:bg-[#0f172a] text-gray-800 dark:text-gray-200 text-xs rounded-xl border border-transparent focus:border-blue-500 focus:outline-none placeholder-gray-400"
                        />
                    </div>
                </div>

                {/* Grid de Emojis */}
                <div className="p-3 h-60 overflow-y-auto grid grid-cols-7 sm:grid-cols-8 gap-1.5 bg-white dark:bg-[#111827]" data-testid="reaction-emoji-grid">
                    {displayedEmojis.length > 0 ? (
                        displayedEmojis.map((emoji, index) => (
                            <button
                                key={`${emoji}-${index}`}
                                type="button"
                                data-testid="reaction-emoji-item"
                                onClick={() => handlePick(emoji)}
                                className="w-8 h-8 rounded-xl flex items-center justify-center text-xl hover:bg-gray-100 dark:hover:bg-white/10 hover:scale-125 transition-transform active:scale-95 cursor-pointer"
                                title={`Reagir com ${emoji}`}
                            >
                                {emoji}
                            </button>
                        ))
                    ) : (
                        <div className="col-span-full py-10 text-center text-xs text-gray-400">
                            Nenhum emoji encontrado
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-2.5 border-t border-gray-200 dark:border-white/10 bg-gray-50/80 dark:bg-black/40 flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-3.5 py-1.5 rounded-xl border border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-300 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-white/10 transition cursor-pointer"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );

    return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
