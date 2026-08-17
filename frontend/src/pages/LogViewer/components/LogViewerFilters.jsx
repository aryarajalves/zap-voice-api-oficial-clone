import React from 'react';
import { FiTag, FiInfo, FiSearch } from 'react-icons/fi';
import { QUICK_FILTERS, LEVELS_OPTIONS, LEVEL_COLORS } from '../utils/logHelpers';

export default function LogViewerFilters({
  hasProcessed,
  activeQuickFilters,
  setActiveQuickFilters,
  toggleQuickFilter,
  filterTimeFrom,
  setFilterTimeFrom,
  filterTimeTo,
  setFilterTimeTo,
  filterText,
  setFilterText,
  filterTags,
  setFilterTags,
  filterLevels,
  setFilterLevels
}) {
  if (!hasProcessed) return null;

  return (
    <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-100 dark:border-white/5 p-4 space-y-4">
      {/* Filtros rápidos */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <FiTag size={11} className="text-gray-400" />
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Filtros rápidos</span>
          {activeQuickFilters.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveQuickFilters([])}
              className="text-[10px] text-gray-400 hover:text-gray-200 underline ml-1"
            >
              limpar ({activeQuickFilters.length})
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {QUICK_FILTERS.map(f => {
            const active = activeQuickFilters.includes(f.id);
            return (
              <button
                type="button"
                key={f.id}
                onClick={() => toggleQuickFilter(f.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                  active
                    ? `${f.color} border-transparent shadow-md`
                    : 'bg-transparent border-gray-200 dark:border-white/10 text-gray-400 hover:border-gray-400 dark:hover:border-white/30'
                }`}
              >
                {f.emoji} {f.label}
                <span className="relative inline-flex group">
                  <FiInfo size={11} className="opacity-60 hover:opacity-100 cursor-help" />
                  <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 w-64 opacity-0 group-hover:opacity-100 transition-opacity z-50 bg-gray-900 text-gray-100 text-[11px] leading-snug font-normal normal-case p-2.5 rounded-lg shadow-xl">
                    {f.description}
                    <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-gray-100 dark:border-white/5" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Horário de</label>
          <input
            type="time"
            step="1"
            value={filterTimeFrom}
            onChange={e => setFilterTimeFrom(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 dark:bg-[#0b1120] border border-gray-100 dark:border-white/5 rounded-xl text-xs text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Horário até</label>
          <input
            type="time"
            step="1"
            value={filterTimeTo}
            onChange={e => setFilterTimeTo(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 dark:bg-[#0b1120] border border-gray-100 dark:border-white/5 rounded-xl text-xs text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Busca no texto</label>
          <div className="relative">
            <FiSearch size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              value={filterText} 
              onChange={e => setFilterText(e.target.value)} 
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  const val = filterText.trim().replace(/,/g, '');
                  if (val && !filterTags.includes(val)) {
                    setFilterTags(prev => [...prev, val]);
                    setFilterText('');
                  }
                } else if (e.key === 'Backspace' && !filterText && filterTags.length > 0) {
                  setFilterTags(prev => prev.slice(0, -1));
                }
              }}
              placeholder="Buscar ou pressionar Enter..." 
              className="w-full pl-8 pr-3 py-2 bg-gray-50 dark:bg-[#0b1120] border border-gray-100 dark:border-white/5 rounded-xl text-xs text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 placeholder:text-gray-400"
            />
          </div>
          
          {filterTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {filterTags.map((tag, i) => (
                <span key={i} className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 rounded-lg text-xs font-bold transition-all">
                  {tag}
                  <button 
                    type="button"
                    onClick={() => setFilterTags(prev => prev.filter((_, idx) => idx !== i))}
                    className="hover:text-blue-200 ml-0.5 focus:outline-none font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">Nível:</span>
        {LEVELS_OPTIONS.map(lvl => {
          const active = filterLevels.includes(lvl);
          const c = LEVEL_COLORS[lvl];
          return (
            <button
              type="button"
              key={lvl}
              onClick={() => setFilterLevels(prev => prev.includes(lvl) ? prev.filter(x => x !== lvl) : [...prev, lvl])}
              className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider transition-all border ${
                active ? `${c.badge} border-transparent` : 'bg-transparent border-gray-200 dark:border-white/10 text-gray-400 hover:border-gray-400'
              }`}
            >
              {lvl}
            </button>
          );
        })}
        {filterLevels.length > 0 && (
          <button
            type="button"
            onClick={() => setFilterLevels([])}
            className="text-[10px] text-gray-400 hover:text-gray-200 underline ml-1"
          >
            limpar
          </button>
        )}
      </div>
    </div>
  );
}
