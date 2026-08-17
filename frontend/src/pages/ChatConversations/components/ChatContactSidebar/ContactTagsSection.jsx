import React from 'react';
import { FiTag, FiX } from 'react-icons/fi';

export default function ContactTagsSection({
    labels = [],
    availableLabels = [],
    getLabelColor,
    handleRemoveTag,
    tagSearchQuery,
    setTagSearchQuery,
    isTagDropdownOpen,
    setIsTagDropdownOpen,
    handleTagSubmit
}) {
    const unselectedLabels = (availableLabels || []).filter(
        label => !(labels || []).map(l => l.toLowerCase()).includes(label.toLowerCase())
    );

    const filteredDropdownLabels = unselectedLabels.filter(
        label => label.toLowerCase().includes(tagSearchQuery.toLowerCase())
    );

    const isExactMatchExisting = (availableLabels || []).some(
        l => l.toLowerCase() === tagSearchQuery.trim().toLowerCase()
    );

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <FiTag size={14} />
                <span>Marcadores</span>
            </div>

            {/* Lista de etiquetas aplicadas */}
            <div className="flex flex-wrap gap-1.5">
                {labels.map((tag) => {
                    const labelColor = getLabelColor(tag);
                    return (
                        <span
                            key={tag}
                            style={{
                                color: labelColor,
                                borderColor: labelColor + '33',
                                backgroundColor: labelColor + '15'
                            }}
                            className="text-xs px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 border font-semibold break-words max-w-full leading-tight"
                        >
                            <span className="break-words font-semibold">
                                {tag} <span className="text-[10px] opacity-70 font-normal">({tag.length})</span>
                            </span>
                            <button
                                type="button"
                                onClick={() => handleRemoveTag(tag)}
                                style={{ color: labelColor }}
                                className="opacity-70 hover:opacity-100 hover:scale-110 transition-all shrink-0 cursor-pointer"
                                aria-label={`Remover tag ${tag}`}
                            >
                                <FiX size={12} />
                            </button>
                        </span>
                    );
                })}
                {labels.length === 0 && (
                    <span className="text-xs text-gray-400 dark:text-gray-500 italic">
                        Nenhum marcador aplicado.
                    </span>
                )}
            </div>

            {/* Input e Dropdown com Busca / Criação */}
            <div className="relative mt-2">
                <div className="flex gap-1.5">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            maxLength={20}
                            placeholder="Pesquisar ou criar marcador..."
                            value={tagSearchQuery}
                            onChange={(e) => {
                                setTagSearchQuery(e.target.value.slice(0, 20));
                                setIsTagDropdownOpen(true);
                            }}
                            onFocus={() => setIsTagDropdownOpen(true)}
                            onBlur={() => {
                                setTimeout(() => setIsTagDropdownOpen(false), 200);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (tagSearchQuery.trim()) {
                                        handleTagSubmit(tagSearchQuery);
                                    }
                                }
                            }}
                            className="w-full px-3 py-1.5 bg-white dark:bg-[#1e293b] text-gray-700 dark:text-gray-300 text-xs rounded-lg border border-gray-200 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
                        />
                        {tagSearchQuery && (
                            <button
                                type="button"
                                onClick={() => setTagSearchQuery('')}
                                className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                            >
                                <FiX size={12} />
                            </button>
                        )}
                    </div>
                    <button
                        type="button"
                        onMouseDown={(e) => {
                            e.preventDefault();
                            if (tagSearchQuery.trim()) {
                                handleTagSubmit(tagSearchQuery);
                            }
                        }}
                        disabled={!tagSearchQuery.trim()}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm shrink-0 cursor-pointer"
                    >
                        Adicionar
                    </button>
                </div>

                {isTagDropdownOpen && (
                    <div className="absolute z-20 w-full mt-1 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-white/10 rounded-lg shadow-lg max-h-48 overflow-y-auto overflow-x-hidden py-1">
                        {filteredDropdownLabels.map(label => {
                            const labelColor = getLabelColor(label);
                            return (
                                <button
                                    key={label}
                                    type="button"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        handleTagSubmit(label);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium cursor-pointer"
                                >
                                    <span 
                                        className="w-2 h-2 rounded-full shrink-0" 
                                        style={{ backgroundColor: labelColor }}
                                    />
                                    <span className="break-words flex-1">
                                        {label} <span className="text-[10px] opacity-60 font-normal">({label.length})</span>
                                    </span>
                                </button>
                            );
                        })}

                        {tagSearchQuery.trim() && !isExactMatchExisting && (
                            <button
                                type="button"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    handleTagSubmit(tagSearchQuery);
                                }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold border-t border-gray-100 dark:border-white/5 flex items-center gap-1.5 cursor-pointer"
                            >
                                <span>+ Criar novo marcador:</span>
                                <span className="italic pr-2 break-all">"{tagSearchQuery.trim().slice(0, 20)}" ({tagSearchQuery.trim().slice(0, 20).length}/20)</span>
                            </button>
                        )}

                        {!tagSearchQuery.trim() && unselectedLabels.length === 0 && (
                            <div className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500 italic text-center">
                                Nenhum outro marcador disponível.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
