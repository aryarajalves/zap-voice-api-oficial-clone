import React, { useState, useEffect, useRef } from 'react';
import { FiSettings, FiChevronDown, FiSearch } from 'react-icons/fi';

export default function IntegrationsFilterBar({
  integrations,
  filterPlatform,
  setFilterPlatform,
  filterHasTriggers,
  setFilterHasTriggers,
  filterHasHistory,
  setFilterHasHistory,
  onResetPage
}) {
  const [searchPlatformText, setSearchPlatformText] = useState('');
  const [isPlatformDropdownOpen, setIsPlatformDropdownOpen] = useState(false);
  const platformDropdownRef = useRef(null);

  // Fecha o dropdown de plataformas ao clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (platformDropdownRef.current && !platformDropdownRef.current.contains(event.target)) {
        setIsPlatformDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const platformsPresent = [...new Set((integrations || []).map(i => i.platform).filter(Boolean))].sort();

  const handleClearAll = () => {
    setFilterPlatform('');
    setFilterHasTriggers(false);
    setFilterHasHistory(false);
    if (onResetPage) onResetPage();
  };

  return (
    <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 dark:border-white/5 bg-white/30 dark:bg-white/[0.02]">
      <FiSettings size={12} className="text-gray-400 shrink-0" />
      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Plataforma</span>
      <div className="relative" ref={platformDropdownRef}>
        <button
          type="button"
          onClick={() => {
            setIsPlatformDropdownOpen(!isPlatformDropdownOpen);
            setSearchPlatformText('');
          }}
          className="bg-white dark:bg-[#0b1120] border border-gray-100 dark:border-white/5 rounded-xl px-3 py-1.5 text-[10px] font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-none shadow-inner flex items-center gap-2 select-none min-w-[140px] justify-between cursor-pointer hover:border-gray-300 dark:hover:border-white/10"
        >
          <span>
            {filterPlatform 
              ? `${filterPlatform.charAt(0).toUpperCase() + filterPlatform.slice(1)} (${integrations.filter(i => i.platform === filterPlatform).length})`
              : `Todas (${integrations.length})`}
          </span>
          <FiChevronDown size={12} className={`text-gray-400 transition-transform ${isPlatformDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {isPlatformDropdownOpen && (
          <div className="absolute top-full left-0 mt-1.5 w-64 bg-white dark:bg-[#0f172a] border border-gray-100 dark:border-white/5 rounded-xl shadow-2xl z-50 p-2 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-100">
            {/* Campo de pesquisa por texto */}
            <div className="relative flex items-center">
              <FiSearch size={12} className="absolute left-2.5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                autoFocus
                placeholder="Pesquisar plataforma..."
                value={searchPlatformText}
                onChange={e => setSearchPlatformText(e.target.value)}
                className="w-full bg-gray-50 dark:bg-[#070b13] border border-gray-100 dark:border-white/5 rounded-lg pl-8 pr-3 py-1.5 text-[10px] font-bold text-gray-900 dark:text-white outline-none focus:border-blue-500/30 focus:ring-1 focus:ring-blue-500/20 transition-all shadow-inner"
              />
            </div>

            {/* Opções filtradas */}
            <div className="max-h-56 overflow-y-auto space-y-0.5 select-none pr-1">
              {/* Opção "Todas" */}
              {('todas'.includes(searchPlatformText.toLowerCase()) || !searchPlatformText) && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterPlatform('');
                    if (onResetPage) onResetPage();
                    setIsPlatformDropdownOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-between cursor-pointer ${
                    !filterPlatform
                      ? 'bg-blue-500/10 text-blue-500'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.02] hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <span>Todas</span>
                  <span className="text-[9px] opacity-70">({integrations.length})</span>
                </button>
              )}

              {/* Plataformas correspondentes */}
              {(() => {
                const filteredOptions = platformsPresent.filter(p => 
                  p.toLowerCase().includes(searchPlatformText.toLowerCase())
                );

                if (filteredOptions.length === 0 && searchPlatformText) {
                  return (
                    <div className="text-center py-4 text-[9px] text-gray-500 italic">
                      Nenhuma plataforma encontrada
                    </div>
                  );
                }

                return filteredOptions.map(p => {
                  const cnt = integrations.filter(i => i.platform === p).length;
                  const isSelected = filterPlatform === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        setFilterPlatform(p);
                        if (onResetPage) onResetPage();
                        setIsPlatformDropdownOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-blue-500/10 text-blue-500'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.02] hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <span>{p.charAt(0).toUpperCase() + p.slice(1)}</span>
                      <span className="text-[9px] opacity-70">({cnt})</span>
                    </button>
                  );
                });
              })()}
            </div>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => { setFilterHasTriggers(!filterHasTriggers); if (onResetPage) onResetPage(); }}
        className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all select-none cursor-pointer flex items-center gap-1.5 ${
          filterHasTriggers
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
            : 'bg-white dark:bg-[#0b1120] text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10'
        }`}
      >
        <span>Com Gatilhos</span>
      </button>

      <button
        type="button"
        onClick={() => { setFilterHasHistory(!filterHasHistory); if (onResetPage) onResetPage(); }}
        className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all select-none cursor-pointer flex items-center gap-1.5 ${
          filterHasHistory
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
            : 'bg-white dark:bg-[#0b1120] text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10'
        }`}
      >
        <span>Com Histórico</span>
      </button>

      {(filterPlatform || filterHasTriggers || filterHasHistory) && (
        <button
          onClick={handleClearAll}
          className="text-[10px] text-gray-400 hover:text-white font-bold transition-all cursor-pointer ml-auto"
        >
          ✕ Limpar Filtros
        </button>
      )}
    </div>
  );
}
