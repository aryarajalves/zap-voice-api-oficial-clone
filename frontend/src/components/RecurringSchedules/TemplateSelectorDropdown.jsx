import React, { useState, useMemo } from 'react';
import { FiSearch } from 'react-icons/fi';

export default function TemplateSelectorDropdown({ templates, selectedTemplateName, onSelect }) {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTag, setSelectedTag] = useState(null);

    const allTags = useMemo(() => {
        if (!templates) return [];
        const tagsSet = new Set();
        templates.forEach(t => {
            if (t && Array.isArray(t.tags)) {
                t.tags.forEach(tag => {
                    if (tag && tag.trim()) {
                        tagsSet.add(tag.trim());
                    }
                });
            }
        });
        return Array.from(tagsSet);
    }, [templates]);

    return (
        <div className="space-y-2 relative">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
                Template do WhatsApp
            </label>
            <div 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 text-xs font-bold text-white outline-none cursor-pointer flex justify-between items-center shadow-inner"
            >
                <span className={selectedTemplateName ? 'text-white' : 'text-slate-500'}>
                    {selectedTemplateName || '-- Selecione um Template --'}
                </span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`text-slate-500 transition-all ${isDropdownOpen ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9" /></svg>
            </div>

            {isDropdownOpen && (
                <div className="absolute top-full left-0 w-full mt-2 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-[130] overflow-hidden">
                    <div className="p-3 border-b border-white/5 bg-black/20 space-y-2">
                        <div className="relative">
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={12} />
                            <input 
                                autoFocus
                                type="text"
                                placeholder="Filtrar templates..."
                                className="w-full bg-slate-800 border border-white/5 rounded-xl pl-9 pr-4 py-2 text-xs font-medium text-white outline-none focus:border-purple-500/30 transition-all"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>

                        {allTags.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1" onClick={(e) => e.stopPropagation()}>
                                <button
                                    type="button"
                                    onClick={() => setSelectedTag(null)}
                                    className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider transition-all ${
                                        !selectedTag 
                                            ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20' 
                                            : 'bg-slate-800 text-slate-400 hover:bg-slate-750 hover:text-white'
                                    }`}
                                >
                                    Todos
                                </button>
                                {allTags.map(tag => (
                                    <button
                                        type="button"
                                        key={tag}
                                        onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                                        className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider transition-all ${
                                            selectedTag === tag 
                                                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20' 
                                                : 'bg-slate-800 text-slate-400 hover:bg-slate-750 hover:text-white'
                                        }`}
                                    >
                                        {tag}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="max-h-52 overflow-y-auto premium-scrollbar">
                        {templates
                            .filter(t => {
                                if (!t || !t.name) return false;
                                const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase());
                                const matchesTag = !selectedTag || (Array.isArray(t.tags) && t.tags.includes(selectedTag));
                                return matchesSearch && matchesTag;
                            })
                            .map(t => (
                                <div 
                                    key={t.name}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSelect(t.name);
                                        setIsDropdownOpen(false);
                                        setSearchQuery('');
                                        setSelectedTag(null);
                                    }}
                                    className={`px-6 py-2.5 hover:bg-purple-500/10 cursor-pointer transition-colors flex flex-col gap-0.5 ${selectedTemplateName === t.name ? 'bg-purple-500/5' : ''}`}
                                >
                                    <div className="flex justify-between items-center gap-2">
                                        <span className="text-xs font-bold text-white truncate max-w-[60%]">{t.name}</span>
                                        {t.tags && t.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 justify-end max-w-[40%]">
                                                {t.tags.map(tag => (
                                                    <span key={tag} className="px-1 py-0.5 rounded bg-slate-800 text-purple-400 border border-purple-500/10 text-[8px] font-bold truncate">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        }
                        {templates.filter(t => {
                            if (!t || !t.name) return false;
                            const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase());
                            const matchesTag = !selectedTag || (Array.isArray(t.tags) && t.tags.includes(selectedTag));
                            return matchesSearch && matchesTag;
                        }).length === 0 && (
                            <div className="px-6 py-8 text-center text-slate-500 text-[10px] font-bold uppercase tracking-widest italic">
                                Nenhum template encontrado
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
