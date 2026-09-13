import React, { useState, useRef, useEffect } from 'react';
import { FiChevronDown, FiSearch } from 'react-icons/fi';
import { PLATFORM_OPTIONS } from './constants';

export default function PlatformSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const selected = PLATFORM_OPTIONS.find(o => o.value === value);
  const filtered = PLATFORM_OPTIONS.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (open) inputRef.current?.focus();
    else setSearch('');
  }, [open]);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full bg-white dark:bg-[#0b1120] border border-gray-100 dark:border-white/5 rounded-xl px-4 py-3 text-xs font-bold text-gray-900 dark:text-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none shadow-inner cursor-pointer flex items-center justify-between gap-2"
      >
        <span>{selected?.label || 'Selecione...'}</span>
        <FiChevronDown className={`shrink-0 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-[99999] mt-1.5 w-full bg-[#0f172a] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
          {/* Campo de busca */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5">
            <FiSearch className="text-gray-500 shrink-0" size={12} />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar plataforma..."
              className="flex-1 bg-transparent text-xs text-white placeholder-gray-500 outline-none"
            />
          </div>
          {/* Lista filtrada */}
          <ul className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-xs text-gray-500 italic">Nenhuma encontrada</li>
            ) : filtered.map(opt => (
              <li
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`px-4 py-2.5 text-xs font-bold cursor-pointer transition-colors ${
                  opt.value === value
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                {opt.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
