import React, { useState, useRef, useEffect } from 'react';
import {
    ChatLabelFilterTrigger,
    ChatLabelFilterLogicControls,
    ChatLabelFilterChips,
    ChatLabelFilterList
} from './ChatLabelFilter';

export default function ChatLabelFilterDropdown({
    selectedLabelFilter,
    setSelectedLabelFilter,
    availableLabels = [],
    availableLabelsDetails = [],
    getLabelColor,
    onOpenChange
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef(null);
    const searchInputRef = useRef(null);

    // Notifica componente pai sobre abertura/fechamento
    useEffect(() => {
        if (typeof onOpenChange === 'function') {
            onOpenChange(isOpen);
        }
    }, [isOpen, onOpenChange]);

    useEffect(() => {
        return () => {
            if (typeof onOpenChange === 'function') {
                onOpenChange(false);
            }
        };
    }, [onOpenChange]);

    // Normaliza o estado do filtro atual com suporte a itens individuais
    const parseFilter = (val) => {
        if (!val) return { items: [], op: 'or', defaultMode: 'has' };
        if (typeof val === 'string') {
            return { items: [{ name: val, mode: 'has' }], op: 'or', defaultMode: 'has' };
        }
        if (Array.isArray(val.items)) {
            return {
                items: val.items.map((it) => ({
                    name: typeof it === 'string' ? it : it.name,
                    mode: it.mode === 'has_not' ? 'has_not' : 'has'
                })),
                op: val.op === 'and' ? 'and' : 'or',
                defaultMode: val.defaultMode === 'has_not' ? 'has_not' : 'has'
            };
        }
        if (Array.isArray(val.labels)) {
            const mode = val.mode === 'has_not' ? 'has_not' : 'has';
            return {
                items: val.labels.map((l) => ({ name: l, mode })),
                op: val.op === 'and' ? 'and' : 'or',
                defaultMode: mode
            };
        }
        return { items: [], op: 'or', defaultMode: 'has' };
    };

    const currentFilter = parseFilter(selectedLabelFilter);
    const activeItems = currentFilter.items;
    const activeLabels = activeItems.map((i) => i.name);
    const activeOp = currentFilter.op;
    const activeDefaultMode = currentFilter.defaultMode;
    const hasFilterActive = activeItems.length > 0;

    // Resolve cor da etiqueta
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
        return '#3b82f6';
    };

    // Fecha o dropdown ao clicar fora
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Foca no input de busca ao abrir o dropdown
    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                searchInputRef.current?.focus();
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // Normaliza e filtra as etiquetas disponíveis
    const uniqueLabels = Array.from(new Set((availableLabels || []).filter(Boolean)));
    const filteredLabels = uniqueLabels.filter((label) =>
        label.toLowerCase().includes(searchTerm.trim().toLowerCase())
    );

    const updateFilter = (newItems, newOp = activeOp, newDefaultMode = activeDefaultMode) => {
        if (!newItems || newItems.length === 0) {
            setSelectedLabelFilter(null);
        } else {
            const includeLabels = newItems.filter((i) => i.mode === 'has').map((i) => i.name);
            const excludeLabels = newItems.filter((i) => i.mode === 'has_not').map((i) => i.name);

            const isAllHasNot = newItems.every((i) => i.mode === 'has_not');
            const isAllHas = newItems.every((i) => i.mode === 'has');
            const derivedMode = isAllHasNot ? 'has_not' : (isAllHas ? 'has' : 'mixed');

            setSelectedLabelFilter({
                items: newItems,
                // Retrocompatibilidade total para código consumidor existente:
                labels: newItems.map((i) => i.name),
                include_labels: includeLabels,
                exclude_labels: excludeLabels,
                mode: derivedMode,
                op: newOp,
                defaultMode: newDefaultMode
            });
        }
    };

    const handleToggleLabel = (label) => {
        if (!label) {
            updateFilter([]);
            return;
        }

        const existingItem = activeItems.find((i) => i.name === label);
        let updated;
        if (existingItem) {
            updated = activeItems.filter((i) => i.name !== label);
        } else {
            updated = [...activeItems, { name: label, mode: activeDefaultMode }];
        }
        updateFilter(updated);
    };

    const handleToggleItemMode = (labelName) => {
        const updated = activeItems.map((item) => {
            if (item.name === labelName) {
                return {
                    ...item,
                    mode: item.mode === 'has_not' ? 'has' : 'has_not'
                };
            }
            return item;
        });
        updateFilter(updated);
    };

    const handleSetMode = (mode) => {
        // Atualiza modo padrão e, se já houver itens, converte os existentes para o novo modo selecionado
        const updatedItems = activeItems.map((item) => ({ ...item, mode }));
        updateFilter(updatedItems, activeOp, mode);
    };

    const handleSetOp = (op) => {
        updateFilter(activeItems, op, activeDefaultMode);
    };

    const handleClearAll = (e) => {
        if (e) e.stopPropagation();
        setSelectedLabelFilter(null);
        setSearchTerm('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            setIsOpen(false);
            setSearchTerm('');
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filteredLabels.length > 0) {
                handleToggleLabel(filteredLabels[0]);
            }
        }
    };

    return (
        <div className="relative w-full" ref={containerRef}>
            {/* Gatilho / Botão do Seletor */}
            <ChatLabelFilterTrigger
                isOpen={isOpen}
                onToggleOpen={() => setIsOpen((prev) => !prev)}
                hasFilterActive={hasFilterActive}
                activeItems={activeItems}
                activeOp={activeOp}
                resolveColor={resolveColor}
                onClearAll={handleClearAll}
            />

            {/* Painel Dropdown com Modo, Operador, Chips, Busca e Lista */}
            {isOpen && (
                <div
                    id="chat-label-filter-dropdown-menu"
                    className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden py-1 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
                >
                    {/* Controles de Lógica: Modo Padrão e Operador (OU / E) */}
                    <ChatLabelFilterLogicControls
                        activeMode={activeDefaultMode}
                        onSetMode={handleSetMode}
                        activeOp={activeOp}
                        onSetOp={handleSetOp}
                    />

                    {/* Chips de Etiquetas Ativas com Alternância Individual */}
                    <ChatLabelFilterChips
                        activeItems={activeItems}
                        resolveColor={resolveColor}
                        onToggleLabel={handleToggleLabel}
                        onToggleItemMode={handleToggleItemMode}
                    />

                    {/* Campo de Pesquisa e Lista de Etiquetas */}
                    <ChatLabelFilterList
                        searchInputRef={searchInputRef}
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                        onClearSearch={() => setSearchTerm('')}
                        onKeyDown={handleKeyDown}
                        hasFilterActive={hasFilterActive}
                        filteredLabels={filteredLabels}
                        activeLabels={activeLabels}
                        activeItems={activeItems}
                        resolveColor={resolveColor}
                        onClearAll={handleClearAll}
                        onToggleLabel={handleToggleLabel}
                        onToggleItemMode={handleToggleItemMode}
                        onClose={() => setIsOpen(false)}
                    />
                </div>
            )}
        </div>
    );
}
