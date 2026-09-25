import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FiTag, FiChevronDown, FiSearch, FiX, FiCheck } from 'react-icons/fi';
import { useClient } from '../../../contexts/ClientContext';
import { fetchWithAuth } from '../../../AuthContext';
import { API_URL } from '../../../config';

const ConditionTagSelector = ({ 
    selectedTag = '', 
    selectedTags, 
    onSelectTag, 
    onSelectTags,
    tagOperator = 'any',
    onChangeOperator 
}) => {
    const { activeClient } = useClient();
    const [chatLabels, setChatLabels] = useState([]);
    const [loadingLabels, setLoadingLabels] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [tagSearch, setTagSearch] = useState('');
    const dropdownRef = useRef(null);

    // Normaliza a lista de tags ativas considerando retrocompatibilidade
    const currentTags = useMemo(() => {
        if (Array.isArray(selectedTags)) return selectedTags;
        if (typeof selectedTag === 'string' && selectedTag.trim()) return [selectedTag.trim()];
        return [];
    }, [selectedTags, selectedTag]);

    useEffect(() => {
        if (!activeClient) return;
        setLoadingLabels(true);
        fetchWithAuth(`${API_URL}/chat/labels/details`, {}, activeClient.id)
            .then(res => res.ok ? res.json() : [])
            .then(detailsData => {
                if (Array.isArray(detailsData) && detailsData.length > 0) {
                    setChatLabels(detailsData);
                } else {
                    fetchWithAuth(`${API_URL}/chat/labels`, {}, activeClient.id)
                        .then(r => r.ok ? r.json() : [])
                        .then(simpleData => {
                            if (Array.isArray(simpleData)) {
                                setChatLabels(simpleData.map((item, idx) => {
                                    if (typeof item === 'string') return { id: idx, name: item, color: '#3B82F6' };
                                    return { id: item.id || idx, name: item.name || item.title || '', color: item.color || '#3B82F6' };
                                }));
                            }
                        })
                        .catch(() => setChatLabels([]));
                }
            })
            .catch(() => setChatLabels([]))
            .finally(() => setLoadingLabels(false));
    }, [activeClient]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredLabels = useMemo(() => {
        if (!Array.isArray(chatLabels)) return [];
        return chatLabels.filter(l => 
            (l.name || '').toLowerCase().includes(tagSearch.toLowerCase())
        );
    }, [chatLabels, tagSearch]);

    const getTagColor = (tagName) => {
        const found = chatLabels.find(l => (l.name || '').toLowerCase() === tagName.toLowerCase());
        return found?.color || '#8B5CF6';
    };

    const handleToggleTag = (tagName) => {
        const cleanName = tagName.trim();
        if (!cleanName) return;

        const exists = currentTags.some(t => t.toLowerCase() === cleanName.toLowerCase());
        const nextTags = exists
            ? currentTags.filter(t => t.toLowerCase() !== cleanName.toLowerCase())
            : [...currentTags, cleanName];

        if (onSelectTags) {
            onSelectTags(nextTags);
        } else if (onSelectTag) {
            onSelectTag(nextTags[0] || '');
        }
    };

    const handleRemoveTag = (tagName, e) => {
        e?.stopPropagation();
        const nextTags = currentTags.filter(t => t.toLowerCase() !== tagName.toLowerCase());
        if (onSelectTags) {
            onSelectTags(nextTags);
        } else if (onSelectTag) {
            onSelectTag(nextTags[0] || '');
        }
    };

    const handleClearAll = (e) => {
        e?.stopPropagation();
        if (onSelectTags) {
            onSelectTags([]);
        } else if (onSelectTag) {
            onSelectTag('');
        }
    };

    return (
        <div className="animate-fade-in space-y-2">
            <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                    <FiTag className="text-purple-500" /> Etiqueta no Chat (ZapVoice)
                </label>
                {chatLabels.length > 0 && (
                    <span className="text-[9px] text-gray-400 font-normal">
                        {chatLabels.length} {chatLabels.length === 1 ? 'disponível' : 'disponíveis'}
                    </span>
                )}
            </div>

            {/* Seletor com Dropdown e Chips de Tags Selecionadas */}
            <div className="relative" ref={dropdownRef}>
                <div
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="nodrag nopan w-full min-h-[38px] text-xs p-1.5 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-xl border border-gray-200 dark:border-gray-700 outline-none flex justify-between items-center cursor-pointer transition-all hover:border-purple-500/50 shadow-sm"
                    data-testid="condition-tag-trigger"
                >
                    <div className="flex flex-wrap items-center gap-1.5 flex-1 pr-1">
                        {currentTags.length > 0 ? (
                            currentTags.map(tag => {
                                const color = getTagColor(tag);
                                return (
                                    <span
                                        key={tag}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xs group"
                                        style={{ borderLeftWidth: '3px', borderLeftColor: color }}
                                        data-testid={`condition-tag-chip-${tag}`}
                                    >
                                        <span
                                            className="w-2 h-2 rounded-full shrink-0"
                                            style={{ backgroundColor: color }}
                                        />
                                        <span className="truncate max-w-[130px] font-mono text-purple-700 dark:text-purple-300">
                                            {tag}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={(e) => handleRemoveTag(tag, e)}
                                            className="ml-0.5 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500 transition cursor-pointer"
                                            title={`Remover etiqueta ${tag}`}
                                            data-testid={`condition-tag-remove-${tag}`}
                                        >
                                            <FiX size={11} />
                                        </button>
                                    </span>
                                );
                            })
                        ) : (
                            <span className="text-gray-400 dark:text-gray-500 px-1 truncate">
                                {loadingLabels ? 'Carregando etiquetas...' : 'Escolha ou digite uma etiqueta...'}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-1">
                        {currentTags.length > 0 && (
                            <button
                                type="button"
                                onClick={handleClearAll}
                                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full text-gray-400 hover:text-red-500 transition"
                                title="Limpar todas as etiquetas"
                                data-testid="condition-tag-clear"
                            >
                                <FiX size={12} />
                            </button>
                        )}
                        <FiChevronDown
                            className={`text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
                            size={14}
                        />
                    </div>
                </div>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                    <div 
                        className="nodrag nopan nowheel absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        {/* Busca / Digitação */}
                        <div className="p-2 border-b border-gray-100 dark:border-gray-800 flex items-center gap-1.5 bg-gray-50/50 dark:bg-gray-900/50">
                            <FiSearch className="text-gray-400 text-xs shrink-0" />
                            <input
                                type="text"
                                className="w-full text-xs p-1 bg-transparent text-gray-900 dark:text-gray-100 outline-none placeholder:text-gray-400"
                                placeholder="Buscar ou adicionar etiqueta..."
                                value={tagSearch}
                                onChange={(e) => setTagSearch(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && tagSearch.trim()) {
                                        e.preventDefault();
                                        handleToggleTag(tagSearch.trim());
                                        setTagSearch('');
                                    }
                                }}
                                autoFocus
                                data-testid="condition-tag-search-input"
                            />
                            {tagSearch && (
                                <button
                                    type="button"
                                    onClick={() => setTagSearch('')}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                >
                                    <FiX size={12} />
                                </button>
                            )}
                        </div>

                        {/* Lista de Etiquetas Existentes */}
                        <div className="overflow-y-auto max-h-44 divide-y divide-gray-50 dark:divide-gray-800/50">
                            {filteredLabels.map(l => {
                                const isSelected = currentTags.some(t => t.toLowerCase() === (l.name || '').toLowerCase());
                                return (
                                    <div
                                        key={l.id || l.name}
                                        className={`p-2.5 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                                            isSelected
                                                ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-bold'
                                                : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                                        }`}
                                        onMouseDown={(e) => {
                                            e.stopPropagation();
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleToggleTag(l.name);
                                            setTagSearch('');
                                        }}
                                        data-testid={`condition-tag-option-${l.name}`}
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            <span
                                                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                                                style={{ backgroundColor: l.color || '#8B5CF6' }}
                                            />
                                            <span className="truncate">{l.name}</span>
                                        </div>
                                        {isSelected && <FiCheck className="text-purple-600 dark:text-purple-400 shrink-0" size={14} />}
                                    </div>
                                );
                            })}

                            {/* Opção para adicionar etiqueta personalizada se não existir exatamente na lista */}
                            {tagSearch.trim() && !chatLabels.some(l => (l.name || '').toLowerCase() === tagSearch.trim().toLowerCase()) && (
                                <div
                                    className="p-2.5 text-xs text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 cursor-pointer flex items-center gap-2 font-bold"
                                    onMouseDown={(e) => {
                                        e.stopPropagation();
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleTag(tagSearch.trim());
                                        setTagSearch('');
                                    }}
                                    data-testid="condition-tag-custom-option"
                                >
                                    <span>➕</span>
                                    <span className="truncate">Adicionar: "{tagSearch.trim()}"</span>
                                </div>
                            )}

                            {filteredLabels.length === 0 && !tagSearch.trim() && (
                                <div className="p-3 text-center text-xs text-gray-400 italic">
                                    Nenhuma etiqueta cadastrada no chat ainda
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Seletor de Operador Lógico (E / OU) - Visível quando há 2 ou mais etiquetas selecionadas */}
            {currentTags.length >= 2 && (
                <div className="pt-1 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Regra de Combinação
                        </span>
                        <span className="text-[9px] font-semibold text-purple-600 dark:text-purple-400">
                            {tagOperator === 'all' ? 'Precisa ter todas' : 'Pelo menos uma'}
                        </span>
                    </div>
                    <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-lg border border-gray-200 dark:border-gray-700">
                        <button
                            type="button"
                            onClick={() => onChangeOperator && onChangeOperator('any')}
                            className={`flex-1 py-1 text-[10px] font-bold rounded-md transition ${
                                tagOperator !== 'all'
                                    ? 'bg-purple-600 text-white shadow-xs'
                                    : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                            }`}
                            data-testid="condition-tag-operator-or"
                        >
                            OU (Qualquer uma)
                        </button>
                        <button
                            type="button"
                            onClick={() => onChangeOperator && onChangeOperator('all')}
                            className={`flex-1 py-1 text-[10px] font-bold rounded-md transition ${
                                tagOperator === 'all'
                                    ? 'bg-purple-600 text-white shadow-xs'
                                    : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                            }`}
                            data-testid="condition-tag-operator-and"
                        >
                            E (Todas)
                        </button>
                    </div>
                </div>
            )}

            <p className="text-[9px] text-gray-400 mt-1 italic">
                Dica: O sistema ignora acentos e maiúsculas automaticamente ao validar no Chat.
            </p>
        </div>
    );
};

export default ConditionTagSelector;
