import React, { useState, useRef, useEffect } from 'react';
import { FiTag, FiChevronDown, FiSearch, FiX } from 'react-icons/fi';

export default function FilterTagDropdown({
  selectedTags = [],
  setSelectedTags,
  excludedTags = [],
  setExcludedTags,
  availableTags = []
}) {
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const tagDropdownRef = useRef(null);
  const tagSearchRef = useRef(null);

  // Fecha o dropdown de etiquetas ao clicar fora
  useEffect(() => {
    function handleTagClickOutside(e) {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(e.target)) {
        setTagDropdownOpen(false);
        setTagSearch('');
      }
    }
    if (tagDropdownOpen) {
      document.addEventListener('mousedown', handleTagClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleTagClickOutside);
  }, [tagDropdownOpen]);

  const handleToggleIncludeTag = (tag) => {
    setExcludedTags(prev => prev.filter(t => t !== tag));
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleToggleExcludeTag = (tag) => {
    setSelectedTags(prev => prev.filter(t => t !== tag));
    setExcludedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const totalActiveTagFilters = selectedTags.length + excludedTags.length;

  return (
    <div className="relative" ref={tagDropdownRef}>
      <button
        id="contacts-tag-filter-btn"
        type="button"
        onClick={() => setTagDropdownOpen(o => !o)}
        className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all outline-none cursor-pointer
          ${totalActiveTagFilters > 0
            ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-200 dark:shadow-purple-900/40 font-semibold'
            : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-purple-400'
          }`}
      >
        <span className="flex items-center gap-2 truncate">
          <FiTag size={15} className="flex-shrink-0" />
          <span className="truncate">
            {totalActiveTagFilters > 0
              ? `${selectedTags.length > 0 ? `+${selectedTags.length}` : ''} ${excludedTags.length > 0 ? `-${excludedTags.length}` : ''}`
              : 'Todas as Etiquetas'
            }
          </span>
        </span>
        <FiChevronDown
          size={15}
          className={`flex-shrink-0 transition-transform duration-200 ${tagDropdownOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {tagDropdownOpen && (
        <div
          className="absolute top-full left-0 right-0 mt-2 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden"
          style={{ minWidth: '280px' }}
        >
          <div className="p-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
              <input
                ref={tagSearchRef}
                id="contacts-tag-search-input"
                type="text"
                placeholder="Buscar etiqueta..."
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all dark:text-gray-200"
              />
              {tagSearch && (
                <button
                  type="button"
                  onClick={() => setTagSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <FiX size={12} />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto p-2 space-y-1">
            <button
              id="contacts-tag-option-all"
              type="button"
              onClick={() => { setSelectedTags([]); setExcludedTags([]); setTagDropdownOpen(false); setTagSearch(''); }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer
                ${totalActiveTagFilters === 0
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-700'
                }`}
            >
              Todas as Etiquetas
            </button>

            {(availableTags?.filter(tag =>
              !tagSearch || tag.toLowerCase().includes(tagSearch.toLowerCase())
            ).length > 0) && (
              <div className="mx-1 my-1 border-t border-dashed border-gray-100 dark:border-gray-700" />
            )}

            {availableTags
              ?.filter(tag => !tagSearch || tag.toLowerCase().includes(tagSearch.toLowerCase()))
              .map(tag => {
                const isIncluded = selectedTags.includes(tag);
                const isExcluded = excludedTags.includes(tag);
                return (
                  <div
                    key={tag}
                    className={`flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl transition-all ${
                      isIncluded
                        ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40'
                        : isExcluded
                        ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <span className="truncate text-xs font-bold">{tag}</span>
                    
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        title="Precisa Ter (Incluir)"
                        onClick={() => handleToggleIncludeTag(tag)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                          isIncluded
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'bg-gray-200/60 dark:bg-gray-700 text-gray-500 hover:bg-purple-100 hover:text-purple-600'
                        }`}
                      >
                        {isIncluded ? '✓ Ter' : '+ Ter'}
                      </button>
                      <button
                        type="button"
                        title="Não Pode Ter (Excluir)"
                        onClick={() => handleToggleExcludeTag(tag)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                          isExcluded
                            ? 'bg-rose-600 text-white shadow-sm'
                            : 'bg-gray-200/60 dark:bg-gray-700 text-gray-500 hover:bg-rose-100 hover:text-rose-600'
                        }`}
                      >
                        {isExcluded ? '✕ Não Ter' : '- Não Ter'}
                      </button>
                    </div>
                  </div>
                );
              })
            }

            {tagSearch && availableTags?.filter(tag =>
              tag.toLowerCase().includes(tagSearch.toLowerCase())
            ).length === 0 && (
              <p className="text-center text-xs text-gray-400 py-4">
                Nenhuma etiqueta encontrada
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
