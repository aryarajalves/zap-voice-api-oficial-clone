import React, { useState, useRef, useEffect } from 'react';
import { FiTag, FiPlus, FiPlusCircle, FiAlertCircle } from 'react-icons/fi';

export default function TagChipInput({ tags = [], setTags, placeholder, availableTags = [] }) {
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const query = input.trim();
  const cleanQuery = query.toLowerCase();

  // Etiquetas cadastradas disponíveis (excluindo as que já foram selecionadas)
  const unselectedTags = (availableTags || []).filter(
    (t) => t && typeof t === 'string' && !tags.includes(t)
  );

  // Filtra as etiquetas existentes excluindo as que já foram adicionadas
  const matchingTags = query
    ? unselectedTags.filter((t) => t.toLowerCase().includes(cleanQuery))
    : unselectedTags;

  const exactMatchExists = query
    ? (availableTags || []).some(
        (t) => t && typeof t === 'string' && t.toLowerCase() === cleanQuery
      )
    : false;

  // Lista navegável via teclado
  const navigableItems = [];
  if (query) {
    if (matchingTags.length > 0) {
      matchingTags.forEach((t) => navigableItems.push({ type: 'tag', value: t }));
      if (!exactMatchExists) {
        navigableItems.push({ type: 'create', value: query });
      }
    } else {
      navigableItems.push({ type: 'create', value: query });
    }
  } else {
    matchingTags.forEach((t) => navigableItems.push({ type: 'tag', value: t }));
  }

  const addTag = (val) => {
    if (!val) return;
    const clean = val.trim().replace(/,/g, '');
    if (clean && !tags.includes(clean)) {
      setTags([...tags, clean]);
    }
    setInput('');
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      if (!isOpen) {
        setIsOpen(true);
      }
      if (navigableItems.length > 0) {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % navigableItems.length);
      }
    } else if (e.key === 'ArrowUp') {
      if (navigableItems.length > 0) {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev - 1 + navigableItems.length) % navigableItems.length);
      }
    } else if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (isOpen && highlightedIndex >= 0 && navigableItems[highlightedIndex]) {
        addTag(navigableItems[highlightedIndex].value);
      } else if (query) {
        addTag(query);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInput(val);
    setHighlightedIndex(-1);
    setIsOpen(true);
  };

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative flex flex-col gap-1" ref={containerRef}>
      <div 
        onClick={() => {
          inputRef.current?.focus();
          setIsOpen(true);
        }}
        className="flex flex-wrap gap-1 p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg min-h-[34px] focus-within:ring-2 focus-within:ring-blue-500 transition-all cursor-text"
      >
        {tags.map((tag, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded text-[10px] font-medium"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setTags(tags.filter((_, idx) => idx !== i));
              }}
              className="ml-0.5 hover:text-red-500 transition-colors leading-none text-[11px] font-bold"
            >
              &times;
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          onClick={() => setIsOpen(true)}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[80px] text-xs bg-transparent outline-none text-gray-800 dark:text-white placeholder:text-gray-400"
        />
      </div>

      <p className="text-[9px] text-gray-400">
        Clique para ver as etiquetas cadastradas · Digite para filtrar ou criar · Enter para confirmar
      </p>

      {/* Popover / Dropdown de Sugestões de Etiquetas */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in duration-150">
          {query ? (
            /* Caso 1: Usuário digitou algo para filtrar ou criar */
            matchingTags.length > 0 ? (
              <div className="max-h-56 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700/50">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 bg-gray-50/70 dark:bg-gray-900/40 flex items-center justify-between">
                  <span>Etiquetas existentes</span>
                  <span className="text-[9px] font-normal lowercase">{matchingTags.length} encontrada(s)</span>
                </div>

                <div className="p-1 space-y-0.5">
                  {matchingTags.map((tag, idx) => {
                    const isHighlighted = highlightedIndex === idx;
                    return (
                      <button
                        key={tag}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          addTag(tag);
                        }}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg text-left transition-colors ${
                          isHighlighted
                            ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        <span className="flex items-center gap-2 truncate">
                          <FiTag className="text-blue-500 shrink-0" size={13} />
                          <span>{tag}</span>
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-semibold shrink-0">
                          Existente
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Opção para criar caso o texto digitado não seja uma correspondência exata */}
                {!exactMatchExists && (
                  <div className="p-1 bg-gray-50/50 dark:bg-gray-900/30 border-t border-gray-100 dark:border-gray-700/60">
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        addTag(query);
                      }}
                      onMouseEnter={() => setHighlightedIndex(matchingTags.length)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg text-left transition-colors ${
                        highlightedIndex === matchingTags.length
                          ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300'
                          : 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30'
                      }`}
                    >
                      <FiPlus size={14} className="shrink-0" />
                      <span className="truncate">
                        Criar nova etiqueta: <strong className="font-bold underline">{query}</strong>
                      </span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              // Quando o usuário digitou mas não há correspondências
              <div>
                <div className="px-3 py-2 text-[11px] font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-100 dark:border-amber-900/40 flex items-center gap-2">
                  <FiAlertCircle size={14} className="shrink-0 text-amber-500" />
                  <span>Nenhuma etiqueta existente com esses dígitos</span>
                </div>
                <div className="p-2">
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      addTag(query);
                    }}
                    onMouseEnter={() => setHighlightedIndex(0)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold rounded-xl text-left transition-all ${
                      highlightedIndex === 0
                        ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200'
                        : 'bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                    } border border-dashed border-emerald-300 dark:border-emerald-700/60 shadow-sm`}
                  >
                    <FiPlusCircle size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span className="truncate">
                      Criar nova etiqueta: <strong className="underline">"{query}"</strong>
                    </span>
                  </button>
                </div>
              </div>
            )
          ) : (
            /* Caso 2: Campo limpo (usuário acabou de clicar ou focar) */
            matchingTags.length > 0 ? (
              <div className="max-h-56 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700/50">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 bg-gray-50/70 dark:bg-gray-900/40 flex items-center justify-between">
                  <span>Etiquetas cadastradas</span>
                  <span className="text-[9px] font-normal lowercase">{matchingTags.length} disponível(is)</span>
                </div>

                <div className="p-1 space-y-0.5">
                  {matchingTags.map((tag, idx) => {
                    const isHighlighted = highlightedIndex === idx;
                    return (
                      <button
                        key={tag}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          addTag(tag);
                        }}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg text-left transition-colors ${
                          isHighlighted
                            ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        <span className="flex items-center gap-2 truncate">
                          <FiTag className="text-blue-500 shrink-0" size={13} />
                          <span>{tag}</span>
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium shrink-0">
                          Selecionar
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="px-3 py-1.5 bg-gray-50/60 dark:bg-gray-900/40 border-t border-gray-100 dark:border-gray-700/60 text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                  <span>💡</span>
                  <span>Clique para selecionar ou comece a digitar para criar uma nova etiqueta</span>
                </div>
              </div>
            ) : (
              /* Nenhuma etiqueta cadastrada no sistema ou todas já adicionadas */
              <div className="p-3.5 text-center space-y-2">
                <div className="w-9 h-9 mx-auto rounded-full bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <FiTag size={16} />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                    {(availableTags || []).length === 0
                      ? 'Nenhuma etiqueta cadastrada no sistema'
                      : 'Todas as etiquetas cadastradas já foram selecionadas'}
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Deseja criar uma nova etiqueta? Basta digitar o nome no campo acima e pressionar Enter.
                  </p>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
