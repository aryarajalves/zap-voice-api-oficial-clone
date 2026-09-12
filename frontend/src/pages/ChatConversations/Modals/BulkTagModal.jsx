import React, { useState, useEffect, useRef } from 'react';
import { FiTag, FiSearch, FiCheck, FiX, FiPlus, FiMessageSquare, FiUsers } from 'react-icons/fi';

export default function BulkTagModal({
    isOpen,
    onClose,
    chatLabels = [],
    contactLabels = [],
    availableLabels = [],
    availableLabelsDetails = [],
    getLabelColor,
    selectedBulkTag,
    setSelectedBulkTag,
    customBulkTag,
    setCustomBulkTag,
    onApply,
    isApplying,
    selectedCount,
    loadAvailableLabels
}) {
    const [targetCategory, setTargetCategory] = useState('chat'); // 'chat' | 'contacts'
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTags, setSelectedTags] = useState(() => {
        const initial = [];
        if (selectedBulkTag && selectedBulkTag.trim()) initial.push(selectedBulkTag.trim());
        if (customBulkTag && customBulkTag.trim() && !initial.includes(customBulkTag.trim())) initial.push(customBulkTag.trim());
        return initial;
    });
    const searchInputRef = useRef(null);
    const prevIsOpenRef = useRef(false);
    const loadLabelsRef = useRef(loadAvailableLabels);
    loadLabelsRef.current = loadAvailableLabels;

    const resolveColor = (label) => {
        if (typeof getLabelColor === 'function') {
            return getLabelColor(label);
        }
        if (Array.isArray(availableLabelsDetails)) {
            const found = availableLabelsDetails.find(
                (l) => l.name?.toLowerCase() === label?.toLowerCase()
            );
            if (found && found.color) return found.color;
        }
        return targetCategory === 'contacts' ? '#6366f1' : '#3b82f6';
    };

    useEffect(() => {
        if (isOpen && !prevIsOpenRef.current) {
            prevIsOpenRef.current = true;
            setSearchTerm('');
            setSelectedTags(() => {
                const initial = [];
                if (selectedBulkTag && selectedBulkTag.trim()) initial.push(selectedBulkTag.trim());
                if (customBulkTag && customBulkTag.trim() && !initial.includes(customBulkTag.trim())) initial.push(customBulkTag.trim());
                return initial;
            });
            if (typeof loadLabelsRef.current === 'function') {
                loadLabelsRef.current();
            }
            const timer = setTimeout(() => {
                searchInputRef.current?.focus();
            }, 60);
            return () => clearTimeout(timer);
        } else if (!isOpen) {
            prevIsOpenRef.current = false;
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const currentCategoryLabels = targetCategory === 'chat'
        ? (chatLabels && chatLabels.length > 0 ? chatLabels : availableLabels)
        : (contactLabels && contactLabels.length > 0 ? contactLabels : []);

    const uniqueLabels = Array.from(new Set((currentCategoryLabels || []).filter(Boolean)));
    const filteredLabels = uniqueLabels.filter((label) =>
        label.toLowerCase().includes(searchTerm.trim().toLowerCase())
    );

    const isExactMatch = uniqueLabels.some(
        (l) => l.toLowerCase() === searchTerm.trim().toLowerCase()
    );

    const handleToggleTag = (tag) => {
        const clean = tag.trim();
        if (!clean) return;
        setSelectedTags(prev => {
            const exists = prev.some(t => t.toLowerCase() === clean.toLowerCase());
            let next;
            if (exists) {
                next = prev.filter(t => t.toLowerCase() !== clean.toLowerCase());
            } else {
                next = [...prev, clean];
            }
            if (typeof setSelectedBulkTag === 'function') {
                setSelectedBulkTag(next[0] || '');
            }
            if (typeof setCustomBulkTag === 'function' && next.length === 0) {
                setCustomBulkTag('');
            }
            return next;
        });
        setSearchTerm('');
    };

    const handleCreateCustomTag = (tag) => {
        const clean = tag.trim();
        if (!clean) return;
        setSelectedTags(prev => {
            const exists = prev.some(t => t.toLowerCase() === clean.toLowerCase());
            if (exists) return prev;
            const next = [...prev, clean];
            if (typeof setCustomBulkTag === 'function') {
                setCustomBulkTag(clean);
            }
            return next;
        });
        setSearchTerm('');
    };

    const handleRemoveTag = (tagToRemove) => {
        setSelectedTags(prev => {
            const next = prev.filter(t => t.toLowerCase() !== tagToRemove.toLowerCase());
            if (typeof setSelectedBulkTag === 'function') {
                setSelectedBulkTag(next[0] || '');
            }
            if (typeof setCustomBulkTag === 'function' && next.length === 0) {
                setCustomBulkTag('');
            }
            return next;
        });
    };

    const handleClearAllTags = () => {
        setSelectedTags([]);
        if (typeof setSelectedBulkTag === 'function') setSelectedBulkTag('');
        if (typeof setCustomBulkTag === 'function') setCustomBulkTag('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            onClose();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filteredLabels.length > 0) {
                handleToggleTag(filteredLabels[0]);
            } else if (searchTerm.trim()) {
                handleCreateCustomTag(searchTerm);
            } else if (selectedTags.length > 0) {
                onApply && onApply(selectedTags, targetCategory);
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-5"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="border-b border-slate-800 pb-3 flex items-center gap-2.5">
                    <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
                        <FiTag size={18} />
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-base">Etiquetar Contatos</h3>
                        <p className="text-xs text-slate-400">
                            Aplicando em <strong className="text-blue-400">{selectedCount}</strong> contato(s) selecionado(s)
                        </p>
                    </div>
                </div>

                {/* Seletor de Destino: Etiqueta do Chat vs Aba de Contatos */}
                <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-300">
                        Onde deseja aplicar a etiqueta?
                    </label>
                    <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950/60 rounded-xl border border-slate-800">
                        <button
                            type="button"
                            id="btn-category-chat"
                            onClick={() => {
                                setTargetCategory('chat');
                                setSelectedTags([]);
                                if (typeof setSelectedBulkTag === 'function') setSelectedBulkTag('');
                                if (typeof setCustomBulkTag === 'function') setCustomBulkTag('');
                                setSearchTerm('');
                            }}
                            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition cursor-pointer ${
                                targetCategory === 'chat'
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25 border border-blue-400/30'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                            }`}
                        >
                            <FiMessageSquare size={13} className="shrink-0" />
                            <span className="truncate">Etiqueta do Chat</span>
                        </button>

                        <button
                            type="button"
                            id="btn-category-contacts"
                            onClick={() => {
                                setTargetCategory('contacts');
                                setSelectedTags([]);
                                if (typeof setSelectedBulkTag === 'function') setSelectedBulkTag('');
                                if (typeof setCustomBulkTag === 'function') setCustomBulkTag('');
                                setSearchTerm('');
                            }}
                            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition cursor-pointer ${
                                targetCategory === 'contacts'
                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 border border-indigo-400/30'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                            }`}
                        >
                            <FiUsers size={13} className="shrink-0" />
                            <span className="truncate">Aba de Contatos</span>
                        </button>
                    </div>
                    <p className="text-[11px] text-slate-400 italic">
                        {targetCategory === 'chat'
                            ? 'As etiquetas selecionadas serão vinculadas às conversas no Chat.'
                            : 'As etiquetas selecionadas serão vinculadas ao perfil dos contatos na Aba de Contatos.'}
                    </p>
                </div>

                {/* Tags Selecionadas Atualmente (Multi-seleção) */}
                {selectedTags.length > 0 && (
                    <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs text-slate-400 font-medium">
                                    {selectedTags.length === 1 ? 'Etiqueta selecionada:' : `Etiquetas selecionadas (${selectedTags.length}):`}
                                </span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${targetCategory === 'chat' ? 'bg-blue-500/20 text-blue-300' : 'bg-indigo-500/20 text-indigo-300'}`}>
                                    {targetCategory === 'chat' ? 'Chat' : 'Contatos'}
                                </span>
                            </div>
                            {selectedTags.length > 1 && (
                                <button
                                    type="button"
                                    onClick={handleClearAllTags}
                                    className="text-[11px] text-slate-400 hover:text-red-400 transition cursor-pointer"
                                >
                                    Limpar todas
                                </button>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar pt-0.5">
                            {selectedTags.map((tag) => (
                                <span
                                    key={tag}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                                        targetCategory === 'chat'
                                            ? 'bg-blue-600/20 text-blue-300 border-blue-500/30'
                                            : 'bg-indigo-600/20 text-indigo-300 border-indigo-500/30'
                                    }`}
                                >
                                    <span
                                        className="w-2 h-2 rounded-full shrink-0"
                                        style={{ backgroundColor: resolveColor(tag) }}
                                    />
                                    <span className="truncate max-w-[130px]">{tag}</span>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveTag(tag)}
                                        className="hover:text-red-400 ml-0.5 text-slate-400 cursor-pointer transition"
                                        title={`Remover ${tag}`}
                                    >
                                        <FiX size={13} />
                                    </button>
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Campo de Pesquisa / Criação */}
                <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-300">
                        {targetCategory === 'chat'
                            ? 'Pesquisar ou criar etiquetas do Chat:'
                            : 'Pesquisar ou criar etiquetas de Contatos:'}
                    </label>
                    <div className="relative">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input
                            ref={searchInputRef}
                            id="bulk-tag-search-input"
                            type="text"
                            placeholder={targetCategory === 'chat' ? "Digite o nome da etiqueta do Chat..." : "Digite o nome da etiqueta de Contatos..."}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="w-full pl-9 pr-8 py-2 bg-slate-800 border border-slate-700 text-white rounded-xl text-sm focus:outline-none focus:border-blue-500 placeholder-slate-500 transition"
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => setSearchTerm('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                                title="Limpar busca"
                            >
                                <FiX size={14} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Lista de Etiquetas com Rolagem */}
                <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400">
                        Etiquetas disponíveis ({filteredLabels.length}):
                    </span>
                    <div className="max-h-48 overflow-y-auto overflow-x-hidden rounded-xl border border-slate-800 bg-slate-950/40 p-1 divide-y divide-slate-800/40 custom-scrollbar">
                        {/* Opção de criar nova se digitou algo que não existe exatamente */}
                        {searchTerm.trim() && !isExactMatch && (
                            <button
                                type="button"
                                onClick={() => handleCreateCustomTag(searchTerm)}
                                className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition cursor-pointer font-semibold min-w-0"
                            >
                                <FiPlus size={13} className="shrink-0" />
                                <span className="truncate min-w-0">Criar e selecionar nova etiqueta {targetCategory === 'chat' ? 'no Chat' : 'em Contatos'}: "<strong>{searchTerm.trim()}</strong>"</span>
                            </button>
                        )}

                        {/* Lista de etiquetas existentes */}
                        {filteredLabels.map((label) => {
                            const isSelected = selectedTags.some((t) => t.toLowerCase() === label.toLowerCase());
                            const labelColor = resolveColor(label);

                            return (
                                <button
                                    key={label}
                                    type="button"
                                    onClick={() => handleToggleTag(label)}
                                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between rounded-lg transition cursor-pointer ${
                                        isSelected
                                            ? targetCategory === 'chat'
                                                ? 'bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30'
                                                : 'bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30'
                                            : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                                    }`}
                                >
                                    <span className="flex items-center gap-2 truncate flex-1 mr-2 min-w-0">
                                        <span
                                            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                                            style={{ backgroundColor: labelColor }}
                                        />
                                        <span className="truncate min-w-0">{label}</span>
                                    </span>
                                    {isSelected && <FiCheck size={14} className={targetCategory === 'chat' ? 'text-blue-400 shrink-0' : 'text-indigo-400 shrink-0'} />}
                                </button>
                            );
                        })}

                        {filteredLabels.length === 0 && !searchTerm.trim() && (
                            <div className="py-6 text-center text-xs text-slate-500">
                                Nenhuma etiqueta disponível.
                            </div>
                        )}

                        {filteredLabels.length === 0 && searchTerm.trim() && isExactMatch && (
                            <div className="py-4 text-center text-xs text-slate-500">
                                Nenhuma outra etiqueta encontrada.
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer com 1 botão Cancelar e 1 botão Aplicar (Conforme Regra de Popups) */}
                <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700 transition cursor-pointer"
                        disabled={isApplying}
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        id="btn-apply-bulk-tag"
                        onClick={() => onApply && onApply(selectedTags, targetCategory)}
                        disabled={isApplying || selectedTags.length === 0}
                        className={`px-5 py-2 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition flex items-center gap-2 cursor-pointer shadow-lg ${
                            targetCategory === 'chat'
                                ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'
                                : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20'
                        }`}
                    >
                        {isApplying
                            ? 'Aplicando...'
                            : selectedTags.length > 1
                            ? `Aplicar ${selectedTags.length} etiquetas ${targetCategory === 'chat' ? 'no Chat' : 'em Contatos'}`
                            : (targetCategory === 'chat' ? 'Aplicar no Chat' : 'Aplicar em Contatos')}
                    </button>
                </div>
            </div>
        </div>
    );
}
