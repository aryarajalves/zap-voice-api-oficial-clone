import React from 'react';

const ManualTagsDropdown = ({
    availableTags = [],
    saveLeadsTags = '',
    isSaveTagsDropdownOpen = false,
    setIsSaveTagsDropdownOpen,
    saveTagsSearch = '',
    setSaveTagsSearch,
    toggleSaveLeadsTag
}) => {
    return (
        <div className="flex flex-col gap-2 relative">
            <div>
                <h4 className="text-[10px] font-black text-white/70 uppercase tracking-widest">
                    Etiqueta Manual Geral (Opcional)
                </h4>
                <p className="text-[9px] text-slate-500 mt-0.5">
                    Esta etiqueta será aplicada a todos os contatos importados, além das etiquetas individuais da coluna se houver
                </p>
            </div>

            <div className="relative w-full save-tags-dropdown-container">
                <div
                    onClick={() => setIsSaveTagsDropdownOpen(!isSaveTagsDropdownOpen)}
                    className="w-full bg-black/40 border border-white/5 rounded-2xl px-4 py-3.5 text-xs font-bold text-white cursor-pointer hover:border-emerald-500/30 transition-all flex justify-between items-center group shadow-inner"
                >
                    <span className={saveLeadsTags ? 'text-white' : 'text-slate-600'}>
                        {saveLeadsTags || 'SELECIONAR OU CRIAR ETIQUETA MANUAL...'}
                    </span>
                    <svg
                        className={`w-4 h-4 text-slate-600 group-hover:text-emerald-500 transition-all ${
                            isSaveTagsDropdownOpen ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth="3"
                    >
                        <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>

                {isSaveTagsDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-2 z-[10002] bg-slate-900 border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-3 bg-slate-800/50 border-b border-white/5 relative">
                            <input
                                type="text"
                                autoFocus
                                placeholder="Filtrar etiquetas..."
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-9 py-2 text-[10px] font-bold text-white placeholder:text-slate-600 outline-none focus:border-emerald-500/50 transition-all"
                                value={saveTagsSearch}
                                onChange={(e) => setSaveTagsSearch(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                            />
                            <svg
                                className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                            >
                                <circle cx="11" cy="11" r="8" />
                                <path d="m21 21-4.3-4.3" />
                            </svg>
                        </div>
                        <div className="max-h-40 overflow-y-auto premium-scrollbar">
                            {availableTags
                                .filter(tag => tag.toLowerCase().includes(saveTagsSearch.toLowerCase()))
                                .map(tag => {
                                    const currentTags = saveLeadsTags
                                        ? saveLeadsTags.split(',').map(t => t.trim())
                                        : [];
                                    const isSelected = currentTags.includes(tag);
                                    return (
                                        <div
                                            key={tag}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleSaveLeadsTag(tag);
                                            }}
                                            className={`px-5 py-2.5 hover:bg-emerald-500/10 cursor-pointer transition-colors flex items-center justify-between group/item ${
                                                isSelected ? 'bg-emerald-500/15 border-l-2 border-emerald-500' : ''
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                                                        isSelected
                                                            ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                                                            : 'bg-emerald-500 opacity-40 group-hover/item:opacity-100'
                                                    }`}
                                                ></div>
                                                <span
                                                    className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${
                                                        isSelected ? 'text-emerald-400 font-extrabold' : 'text-slate-200'
                                                    }`}
                                                >
                                                    {tag}
                                                </span>
                                            </div>
                                            {isSelected && (
                                                <svg
                                                    className="w-3.5 h-3.5 text-emerald-400 filter drop-shadow-[0_0_3px_rgba(52,211,153,0.4)]"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                    strokeWidth="4.5"
                                                >
                                                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            )}
                                        </div>
                                    );
                                })}
                        </div>
                        {saveTagsSearch.trim() !== '' &&
                            !availableTags.some(tag => tag.toLowerCase() === saveTagsSearch.trim().toLowerCase()) && (
                                <div className="p-4 bg-slate-800/80 border-t border-white/5 flex items-center justify-between gap-4">
                                    <span className="text-[10px] font-bold text-slate-400">
                                        Criar etiqueta com "{saveTagsSearch}":
                                    </span>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleSaveLeadsTag(saveTagsSearch.trim());
                                            setSaveTagsSearch('');
                                        }}
                                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
                                    >
                                        Criar etiqueta
                                    </button>
                                </div>
                            )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ManualTagsDropdown;
