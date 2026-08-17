import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FiChevronDown } from 'react-icons/fi';

export default function ColumnCombobox({ value, onChange, headers = [], emptyLabel = '-- Ignorar --', small = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return headers;
    return headers.filter(h => h.toLowerCase().includes(q));
  }, [headers, search]);

  const sizeClasses = small
    ? 'px-2 py-1.5 text-[11px]'
    : 'px-3 py-2 text-xs';

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(o => !o)}
        className={`w-full ${sizeClasses} bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-left flex items-center justify-between gap-2`}
      >
        <span className={`truncate ${value ? 'text-gray-800 dark:text-gray-100' : 'text-gray-400'}`}>
          {value || emptyLabel}
        </span>
        <FiChevronDown size={13} className="text-gray-400 shrink-0" />
      </button>
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl flex flex-col overflow-hidden">
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Digite para buscar..."
            className="px-2.5 py-1.5 text-xs border-b border-gray-100 dark:border-gray-700 outline-none bg-transparent text-gray-800 dark:text-white"
          />
          <div className="overflow-y-auto max-h-48">
            <div
              onClick={() => { onChange(''); setIsOpen(false); setSearch(''); }}
              className="px-3 py-1.5 text-xs text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer"
            >
              {emptyLabel}
            </div>
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-xs text-gray-400 italic">Nenhuma coluna encontrada</div>
            ) : filtered.map(h => (
              <div
                key={h}
                onClick={() => { onChange(h); setIsOpen(false); setSearch(''); }}
                className={`px-3 py-1.5 text-xs cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 truncate ${
                  h === value ? 'bg-blue-50 dark:bg-blue-900/30 font-semibold text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
                }`}
                title={h}
              >
                {h}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
