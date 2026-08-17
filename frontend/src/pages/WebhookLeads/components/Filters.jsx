import React, { useState } from 'react';
import { FiSearch, FiSliders } from 'react-icons/fi';
import DateFilter from './DateFilter';

// Subcomponentes Modulares
import FilterTagDropdown from './Filters/FilterTagDropdown';
import AdvancedFiltersPanel from './Filters/AdvancedFiltersPanel';
import ActiveFiltersBadges from './Filters/ActiveFiltersBadges';

export default function Filters({
  search, setSearch,
  selectedTags = [], setSelectedTags,
  excludedTags = [], setExcludedTags,
  importedByClientId, setImportedByClientId,
  origin, setOrigin,
  lockedFilter, setLockedFilter,
  bsudFilter, setBsudFilter,
  filterDdi, setFilterDdi,
  filterDdd, setFilterDdd,
  ddiOptions = [], dddOptions = [],
  blockStatusFilter, setBlockStatusFilter,
  hasBlockedLeads = false, hasRestingLeads = false,
  availableFilters = {},
  total,
  datePreset, setDatePreset,
  customDateFrom, setCustomDateFrom,
  customDateTo, setCustomDateTo,
  handleClearDateFilters,
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const hasDateFilter = !!datePreset;

  const blockStatusOptions = [
    ...(hasBlockedLeads ? [{ value: 'blocked', label: '🚫 Bloqueados' }] : []),
    ...(hasRestingLeads ? [{ value: 'resting', label: '😴 Em Repouso' }] : []),
  ];

  // Calcular filtros avançados ativos
  const activeAdvancedCount = 
    (importedByClientId ? 1 : 0) + 
    (origin ? 1 : 0) + 
    (lockedFilter !== '' ? 1 : 0) + 
    (blockStatusFilter ? 1 : 0) + 
    (bsudFilter !== '' ? 1 : 0) + 
    (filterDdi ? 1 : 0) + 
    (filterDdd ? 1 : 0);

  return (
    <div className="space-y-4 mb-6">
      {/* Container Principal de Filtros */}
      <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-all duration-300">
        
        {/* Linha Principal (Sempre Visível) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          
          {/* Busca por Nome/Telefone ou colagem em massa */}
          <div className="md:col-span-4 lg:col-span-5 space-y-1.5">
            <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider pl-1">
              Buscar Contato
            </label>
            <div className="relative">
              <FiSearch className="absolute left-3.5 top-3 text-gray-400" size={16} />
              <textarea
                id="contacts-search-input"
                rows={search && search.includes('\n') ? Math.min(6, search.split('\n').length) : 1}
                placeholder="Buscar por nome, telefone ou colar lista em massa..."
                className="w-full pl-11 pr-8 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-600 outline-none transition-all text-gray-700 dark:text-gray-200 resize-none font-mono placeholder:font-sans"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs font-bold cursor-pointer"
                  title="Limpar busca"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Selecionar Data/Período */}
          <div className="md:col-span-3 lg:col-span-3 space-y-1.5">
            <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider pl-1">
              Período de Entrada
            </label>
            <DateFilter
              datePreset={datePreset}
              setDatePreset={setDatePreset}
              customDateFrom={customDateFrom}
              setCustomDateFrom={setCustomDateFrom}
              customDateTo={customDateTo}
              setCustomDateTo={setCustomDateTo}
              handleClearDateFilters={handleClearDateFilters}
            />
          </div>

          {/* Selecionar Etiquetas */}
          <div className="md:col-span-3 lg:col-span-2 space-y-1.5">
            <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider pl-1">
              Etiquetas
            </label>
            <FilterTagDropdown
              selectedTags={selectedTags}
              setSelectedTags={setSelectedTags}
              excludedTags={excludedTags}
              setExcludedTags={setExcludedTags}
              availableTags={availableFilters.tags || []}
            />
          </div>

          {/* Botão Avançado */}
          <div className="md:col-span-2 lg:col-span-2">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-300 outline-none cursor-pointer
                ${showAdvanced || activeAdvancedCount > 0
                  ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-200 dark:shadow-purple-900/40 hover:bg-purple-700'
                  : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-purple-400'
                }`}
            >
              <FiSliders size={16} />
              <span>Avançado</span>
              {activeAdvancedCount > 0 && (
                <span className={`flex items-center justify-center text-[10px] font-bold w-5 h-5 rounded-full shadow-sm animate-pulse
                  ${showAdvanced || activeAdvancedCount > 0
                    ? 'bg-white text-purple-650'
                    : 'bg-purple-600 text-white'
                  }`}
                >
                  {activeAdvancedCount}
                </span>
              )}
            </button>
          </div>

        </div>

        {/* Filtros Avançados (Colapsável) */}
        {showAdvanced && (
          <AdvancedFiltersPanel
            importedByClientId={importedByClientId}
            setImportedByClientId={setImportedByClientId}
            origin={origin}
            setOrigin={setOrigin}
            lockedFilter={lockedFilter}
            setLockedFilter={setLockedFilter}
            blockStatusFilter={blockStatusFilter}
            setBlockStatusFilter={setBlockStatusFilter}
            bsudFilter={bsudFilter}
            setBsudFilter={setBsudFilter}
            filterDdi={filterDdi}
            setFilterDdi={setFilterDdi}
            filterDdd={filterDdd}
            setFilterDdd={setFilterDdd}
            ddiOptions={ddiOptions}
            dddOptions={dddOptions}
            blockStatusOptions={blockStatusOptions}
            availableFilters={availableFilters}
          />
        )}

      </div>

      {/* Badges de filtros ativos */}
      <ActiveFiltersBadges
        hasDateFilter={hasDateFilter}
        datePreset={datePreset}
        handleClearDateFilters={handleClearDateFilters}
        filterDdi={filterDdi}
        setFilterDdi={setFilterDdi}
        filterDdd={filterDdd}
        setFilterDdd={setFilterDdd}
        blockStatusFilter={blockStatusFilter}
        setBlockStatusFilter={setBlockStatusFilter}
        selectedTags={selectedTags}
        setSelectedTags={setSelectedTags}
        total={total}
      />
    </div>
  );
}
