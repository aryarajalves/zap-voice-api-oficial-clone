import React, { useState, useRef, useEffect } from 'react';
import { VAR_OPTIONS } from '../utils';
import { FiSearch, FiTag, FiChevronDown, FiX, FiMaximize2, FiMinimize2, FiCheck, FiSlash } from 'react-icons/fi';

const TagSelector = ({
    selectedTags = [],
    setSelectedTags,
    excludedTags = [],
    setExcludedTags,
    tagMode = 'OR',
    setTagMode,
    availableTags = [],
    isLoadingTags,
    templateVariables,
    tagVariables,
    setTagVariables,
    activeDropdown,
    setActiveDropdown,
    loadContactsByTag,
    isProcessing
}) => {
    const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
    const [tagSearch, setTagSearch] = useState('');
    const [expandedVars, setExpandedVars] = useState({});
    const tagDropdownRef = useRef(null);
    const tagSearchRef = useRef(null);

    useEffect(() => {
        function handleTagClickOutside(e) {
            if (tagDropdownRef.current && !tagDropdownRef.current.contains(e.target)) {
                setTagDropdownOpen(false);
                setTagSearch('');
            }
        }
        if (tagDropdownOpen) {
            document.addEventListener('mousedown', handleTagClickOutside);
            setTimeout(() => tagSearchRef.current?.focus(), 50);
        }
        return () => document.removeEventListener('mousedown', handleTagClickOutside);
    }, [tagDropdownOpen]);

    const handleToggleTag = (tag) => {
        setSelectedTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
        // Uma etiqueta não pode estar marcada como "incluir" e "excluir" ao mesmo tempo
        if (setExcludedTags) {
            setExcludedTags(prev => prev.filter(t => t !== tag));
        }
    };

    const handleToggleExcludedTag = (tag) => {
        if (!setExcludedTags) return;
        setExcludedTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
        setSelectedTags(prev => prev.filter(t => t !== tag));
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 relative z-30">
            <div className="p-8 bg-slate-800/20 border border-white/5 rounded-3xl space-y-6 relative z-30">
                <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Selecione as Etiquetas Internas</label>
                    <div className={`relative ${tagDropdownOpen ? 'z-50' : 'z-20'}`} ref={tagDropdownRef}>
                        <button
                            type="button"
                            onClick={() => !isLoadingTags && setTagDropdownOpen(o => !o)}
                            disabled={isLoadingTags}
                            className={`w-full flex items-center justify-between gap-2 p-4 pl-5 rounded-2xl text-sm font-bold border transition-all outline-none bg-black/40 border-white/10 text-white hover:border-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            <span className="flex items-center gap-2 truncate">
                                <FiTag size={16} className="text-emerald-400 flex-shrink-0" />
                                <span className="truncate">
                                    {(selectedTags.length > 0 || excludedTags.length > 0)
                                        ? [
                                            selectedTags.length > 0 && `✓ ${selectedTags.length}`,
                                            excludedTags.length > 0 && `✕ ${excludedTags.length}`
                                          ].filter(Boolean).join('  ')
                                        : (isLoadingTags ? 'Carregando etiquetas...' : '-- Escolha as etiquetas --')
                                    }
                                </span>
                            </span>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                {isLoadingTags && (
                                    <div className="w-4 h-4 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                                )}
                                <FiChevronDown
                                    size={16}
                                    className={`text-slate-400 transition-transform duration-200 ${tagDropdownOpen ? 'rotate-180' : ''}`}
                                />
                            </div>
                        </button>

                        {/* Dropdown de etiquetas com busca e multi-seleção */}
                        {tagDropdownOpen && (
                            <div
                                className="absolute top-full left-0 right-0 mt-2 z-[999] bg-[#1e293b] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                            >
                                {/* Header com campo de busca */}
                                <div className="p-3 border-b border-white/5 bg-slate-900/50">
                                    <div className="relative">
                                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                        <input
                                            ref={tagSearchRef}
                                            type="text"
                                            placeholder="Buscar etiqueta..."
                                            value={tagSearch}
                                            onChange={(e) => setTagSearch(e.target.value)}
                                            className="w-full pl-9 pr-8 py-2 bg-black/30 border border-white/5 rounded-xl text-xs text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all font-bold"
                                        />
                                        {tagSearch && (
                                            <button
                                                type="button"
                                                onClick={() => setTagSearch('')}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                                            >
                                                <FiX size={14} />
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 mt-2 px-1 text-[8px] font-black uppercase tracking-wider text-slate-500">
                                        <span className="flex items-center gap-1"><FiCheck size={10} className="text-emerald-400" /> Precisa ter</span>
                                    </div>
                                </div>

                                {/* Lista de etiquetas filtradas */}
                                <div className="max-h-60 overflow-y-auto p-2 space-y-0.5 premium-scrollbar">
                                    {availableTags
                                        ?.filter(tag => !tagSearch || tag.toLowerCase().includes(tagSearch.toLowerCase()))
                                        .map(tag => {
                                            const isSelected = selectedTags.includes(tag);
                                            return (
                                                <div
                                                    key={tag}
                                                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer
                                                        ${isSelected
                                                            ? 'bg-emerald-500/10 text-emerald-400'
                                                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                                        }`}
                                                    onClick={() => handleToggleTag(tag)}
                                                    title={tag}
                                                >
                                                    <div
                                                        className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-lg border transition-all ${
                                                            isSelected
                                                                ? 'bg-emerald-500 border-emerald-500 text-black'
                                                                : 'border-white/10 bg-black/20 text-transparent hover:border-emerald-500/50'
                                                        }`}
                                                    >
                                                        <FiCheck size={12} />
                                                    </div>
                                                    <span className="flex-1 text-left truncate">{tag}</span>
                                                </div>
                                            );
                                        })
                                    }

                                    {/* Sem resultados */}
                                    {availableTags?.filter(tag =>
                                        tag.toLowerCase().includes(tagSearch.toLowerCase())
                                    ).length === 0 && (
                                        <p className="text-center text-xs text-slate-500 py-4 font-bold">
                                            Nenhuma etiqueta encontrada
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Resumo das etiquetas de exclusão selecionadas */}
                    {excludedTags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                            {excludedTags.map(tag => (
                                <span
                                    key={tag}
                                    className="flex items-center gap-1 px-2 py-1 bg-red-500/10 text-red-400 rounded-lg text-[9px] font-black uppercase tracking-wide"
                                >
                                    <FiSlash size={10} />
                                    {tag}
                                    <button type="button" onClick={() => handleToggleExcludedTag(tag)} className="hover:text-white">
                                        <FiX size={10} />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Filtro Condicional (E / OU) */}
                {selectedTags.length > 1 && (
                    <div className="flex flex-col gap-2 p-5 bg-black/30 border border-white/5 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-300">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Filtro Condicional</label>
                        <div className="flex gap-2 p-1 bg-black/40 rounded-xl max-w-[200px]">
                            <button
                                type="button"
                                onClick={() => setTagMode('OR')}
                                className={`flex-1 py-1.5 px-3 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                                    tagMode === 'OR'
                                        ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                OU
                            </button>
                            <button
                                type="button"
                                onClick={() => setTagMode('AND')}
                                className={`flex-1 py-1.5 px-3 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                                    tagMode === 'AND'
                                        ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                E
                            </button>
                        </div>
                        <p className="text-[8px] text-slate-500 font-bold uppercase mt-1">
                            {tagMode === 'OR'
                                ? 'OU: Retorna contatos que possuem pelo menos uma das etiquetas.'
                                : 'E: Retorna apenas contatos que possuem todas as etiquetas selecionadas.'}
                        </p>
                    </div>
                )}
                
                {/* Template Variables for Tags */}
                {templateVariables && templateVariables.length > 0 && (
                    <div className="space-y-4 pt-6 border-t border-white/10">
                        <div className="flex items-center justify-between px-1">
                            <div className="space-y-0.5">
                                <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Variáveis do Template</h4>
                                <p className="text-[8px] text-slate-500 font-bold uppercase">Configure os valores para este disparo</p>
                            </div>
                            <div className="text-[8px] font-black text-slate-600 bg-slate-800/50 px-2 py-1 rounded border border-white/5 uppercase tracking-widest">
                                Dica: Use {"{{nome}}"} ou {"{{telefone}}"}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {templateVariables.map(v => (
                                <div key={v.key} className="space-y-2 group/var relative">
                                    <div className="flex items-center justify-between ml-1">
                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider group-focus-within/var:text-emerald-400 transition-colors">{v.label}</label>
                                        <span className="text-[8px] text-slate-600 font-bold">
                                            {tagVariables[v.key] && !tagVariables[v.key].includes('{{')
                                                ? <span className="text-amber-400/70">✏️ Valor fixo</span>
                                                : tagVariables[v.key]
                                                    ? <span className="text-emerald-400/70">⚡ Dinâmico</span>
                                                    : null
                                            }
                                        </span>
                                    </div>
                                    <div className="relative">
                                        {expandedVars[v.key] ? (
                                            <textarea
                                                rows={6}
                                                className="w-full p-4 pr-12 bg-black/40 border border-white/5 rounded-2xl focus:border-emerald-500/50 outline-none text-white text-xs transition-all shadow-inner placeholder:text-slate-700 font-bold resize-y"
                                                placeholder={`Valor para ${v.label}... (Texto fixo ou {{nome}} dinâmico)`}
                                                value={tagVariables[v.key] || ''}
                                                onChange={(e) => setTagVariables(prev => ({ ...prev, [v.key]: e.target.value }))}
                                            />
                                        ) : (
                                            <input
                                                type="text"
                                                className="w-full p-4 pr-20 bg-black/40 border border-white/5 rounded-2xl focus:border-emerald-500/50 outline-none text-white text-xs transition-all shadow-inner placeholder:text-slate-700 font-bold"
                                                placeholder={`Valor para ${v.label}... (Texto fixo ou {{nome}} dinâmico)`}
                                                value={tagVariables[v.key] || ''}
                                                onChange={(e) => setTagVariables(prev => ({ ...prev, [v.key]: e.target.value }))}
                                            />
                                        )}
                                        <div className={`absolute right-3 flex items-center gap-1 ${expandedVars[v.key] ? 'top-3' : 'top-1/2 -translate-y-1/2'}`}>
                                            <button
                                                type="button"
                                                onClick={() => setExpandedVars(prev => ({ ...prev, [v.key]: !prev[v.key] }))}
                                                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-blue-400 border border-white/5 transition-all"
                                                title={expandedVars[v.key] ? 'Minimizar' : 'Expandir para texto longo'}
                                            >
                                                {expandedVars[v.key] ? <FiMinimize2 size={12} /> : <FiMaximize2 size={12} />}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setActiveDropdown(activeDropdown === v.key ? null : v.key)}
                                                className={`p-2 rounded-xl transition-all ${activeDropdown === v.key ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:text-emerald-400 border border-white/5'}`}
                                                title="Campos Mágicos"
                                            >
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></svg>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Magic Dropdown */}
                                    {activeDropdown === v.key && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setActiveDropdown(null)}></div>
                                            <div className="absolute left-0 right-0 top-full mt-2 z-[60] bg-slate-900 border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                                <div className="p-3 bg-slate-800/50 border-b border-white/5 text-[8px] font-black text-slate-500 uppercase tracking-widest text-center">Campos Disponíveis do Lead</div>
                                                <div className="grid grid-cols-1 divide-y divide-white/5 max-h-64 overflow-y-auto premium-scrollbar">
                                                    {VAR_OPTIONS.map(opt => (
                                                        <button
                                                            key={opt.value}
                                                            type="button"
                                                            onClick={() => {
                                                                setTagVariables(prev => ({ ...prev, [v.key]: opt.value }));
                                                                setActiveDropdown(null);
                                                            }}
                                                            className="flex items-center gap-3 p-3 text-left hover:bg-emerald-500/10 transition-colors group/opt"
                                                        >
                                                            <span className="text-sm">{opt.icon}</span>
                                                            <div className="flex-1">
                                                                <div className="text-[10px] font-black text-slate-200 uppercase tracking-wide group-hover/opt:text-emerald-400 transition-colors">{opt.label}</div>
                                                                <div className="text-[8px] font-bold text-slate-600 font-mono">{opt.value}</div>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                <button
                    onClick={loadContactsByTag}
                    disabled={selectedTags.length === 0 || isProcessing}
                    className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-blue-900/20 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                    Carregar Leads da Etiqueta
                </button>
                
                <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl text-center">
                    <p className="text-[10px] text-blue-300/60 font-bold uppercase tracking-widest leading-relaxed">
                        💡 Isso buscará todos os contatos capturados via Webhook ou Importação que possuem as etiquetas marcadas com ✓{excludedTags.length > 0 ? ', e excluirá qualquer contato que possua alguma etiqueta marcada com ✕' : ''}.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default TagSelector;
