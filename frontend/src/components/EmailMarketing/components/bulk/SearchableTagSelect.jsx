import React, { useState } from 'react';
import { FiChevronDown, FiSearch } from 'react-icons/fi';

export default function SearchableTagSelect({ tags, selectedTag, onSelect }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTags = tags.filter(t => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return t.toLowerCase().includes(q);
  });

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-white font-semibold flex items-center justify-between shadow-sm focus:ring-2 focus:ring-blue-500 transition-all text-left cursor-pointer"
      >
        <span className="truncate flex items-center gap-2">
          {selectedTag ? (
            <>🏷️ <strong className="font-bold text-blue-600 dark:text-blue-400">{selectedTag}</strong></>
          ) : (
            <span className="text-gray-400 font-normal">🏷️ Todas as etiquetas (Disparar para todos os contatos com e-mail)</span>
          )}
        </span>
        <FiChevronDown className={`ml-2 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden animate-fade-in">
          <div className="p-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-slate-900/80 flex items-center gap-2">
            <FiSearch className="text-gray-400 text-sm ml-1 shrink-0" />
            <input
              type="text"
              autoFocus
              placeholder="Pesquisar etiqueta..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs text-gray-800 dark:text-white border-none focus:outline-none focus:ring-0 placeholder-gray-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-xs text-gray-400 hover:text-gray-200 px-1 font-bold cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          <div className="max-h-56 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700/50">
            <button
              type="button"
              onClick={() => {
                onSelect('');
                setIsOpen(false);
                setSearchQuery('');
              }}
              className={`w-full px-3 py-2.5 text-left text-xs hover:bg-blue-500/10 dark:hover:bg-blue-500/20 transition-all font-semibold cursor-pointer ${
                !selectedTag ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold' : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              🏷️ Todas as etiquetas (Sem filtro)
            </button>

            {filteredTags.length === 0 ? (
              <div className="p-3 text-xs text-center text-gray-400 italic">
                Nenhuma etiqueta encontrada para "{searchQuery}"
              </div>
            ) : (
              filteredTags.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    onSelect(t);
                    setIsOpen(false);
                    setSearchQuery('');
                  }}
                  className={`w-full px-3 py-2.5 text-left text-xs hover:bg-blue-500/10 dark:hover:bg-blue-500/20 transition-all flex items-center justify-between cursor-pointer ${
                    selectedTag === t
                      ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold'
                      : 'text-gray-700 dark:text-gray-200'
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5">
                    <span>🏷️</span>
                    <span>{t}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
