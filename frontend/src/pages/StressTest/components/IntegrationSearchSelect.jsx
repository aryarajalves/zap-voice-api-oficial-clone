import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FiChevronDown, FiSearch, FiX } from 'react-icons/fi';

export default function IntegrationSearchSelect({ integrations = [], value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const selected = integrations.find(i => String(i.id) === String(value));
  const filtered = integrations.filter(i =>
    `${i.name} ${i.platform}`.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (!open) return;
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = useCallback((id) => {
    onChange(id);
    setOpen(false);
    setQuery('');
  }, [onChange]);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border transition-all text-sm outline-none ${
          open
            ? 'border-violet-500/60 bg-violet-500/5 ring-1 ring-violet-500/20'
            : 'border-white/10 bg-gray-900/50 hover:border-white/20'
        }`}
      >
        {selected ? (
          <span className="flex items-center gap-2 min-w-0">
            <span className="text-white font-medium truncate">{selected.name}</span>
            <span className="text-[10px] text-gray-500 font-mono bg-white/5 px-1.5 py-0.5 rounded shrink-0">{selected.platform}</span>
          </span>
        ) : (
          <span className="text-gray-500 italic">Selecionar integração…</span>
        )}
        <FiChevronDown
          size={14}
          className={`text-gray-400 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border border-white/10 bg-[#181d2a] shadow-2xl shadow-black/60 overflow-hidden w-full">
          {/* Search input */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-white/8">
            <FiSearch size={13} className="text-gray-500 shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Filtrar por nome ou plataforma…"
              className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 outline-none"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')}>
                <FiX size={12} className="text-gray-500 hover:text-white" />
              </button>
            )}
          </div>

          {/* Options list */}
          <div className="overflow-y-auto overflow-x-hidden max-h-52">
            {filtered.length === 0 ? (
              <p className="text-xs text-gray-500 italic text-center py-4">Nenhuma integração encontrada</p>
            ) : (
              filtered.map(i => {
                const isActive = String(i.id) === String(value);
                return (
                  <button
                    key={i.id}
                    type="button"
                    onClick={() => handleSelect(i.id)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm text-left transition-colors ${
                      isActive
                        ? 'bg-violet-500/15 text-violet-300'
                        : 'text-gray-200 hover:bg-white/5'
                    }`}
                  >
                    <span className="truncate font-medium">{i.name}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                      isActive ? 'bg-violet-500/20 text-violet-400' : 'bg-white/5 text-gray-500'
                    }`}>
                      {i.platform}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
