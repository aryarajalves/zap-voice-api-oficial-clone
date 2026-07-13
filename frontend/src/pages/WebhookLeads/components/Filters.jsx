import React, { useState, useRef, useEffect } from 'react';
import { FiSearch, FiTag, FiChevronDown, FiX, FiFilter, FiSliders } from 'react-icons/fi';
import { formatDddOption, formatDdiOption } from '../../../utils/dddInfo';
import FilterSelect from './FilterSelect';
import DateFilter from './DateFilter';

export default function Filters({
  search, setSearch,
  selectedTags = [], setSelectedTags,
  importedByClientId, setImportedByClientId,
  origin, setOrigin,
  lockedFilter, setLockedFilter,
  bsudFilter, setBsudFilter,
  filterDdi, setFilterDdi,
  filterDdd, setFilterDdd,
  ddiOptions = [], dddOptions = [],
  blockStatusFilter, setBlockStatusFilter,
  hasBlockedLeads = false, hasRestingLeads = false,
  availableFilters,
  total,
  datePreset, setDatePreset,
  customDateFrom, setCustomDateFrom,
  customDateTo, setCustomDateTo,
  handleClearDateFilters,
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const hasDateFilter = !!datePreset;
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

  const handleToggleTag = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const blockStatusOptions = [
    ...(hasBlockedLeads ? [{ value: 'blocked', label: '🚫 Bloqueados' }] : []),
    ...(hasRestingLeads ? [{ value: 'resting', label: '😴 Em Repouso' }] : []),
  ];

  // Calcular filtros avançados ativos
  const activeAdvancedCount = 
    (importedByClientId ? 1 : 0) + 
    (origin ? 1 : 0) + 
    (lockedFilter ? 1 : 0) + 
    (blockStatusFilter ? 1 : 0) + 
    (bsudFilter ? 1 : 0) + 
    (filterDdi ? 1 : 0) + 
    (filterDdd ? 1 : 0);

  return (
    <div className="mb-6 space-y-4">
      {/* Container Principal de Filtros */}
      <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-all duration-300">
        
        {/* Linha Principal (Sempre Visível) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          
          {/* Busca por Nome/Telefone */}
          <div className="md:col-span-4 lg:col-span-5 space-y-1.5">
            <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider pl-1">
              Buscar Contato
            </label>
            <div className="relative">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                id="contacts-search-input"
                type="text"
                placeholder="Buscar por nome ou telefone..."
                className="w-full pl-11 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-600 outline-none transition-all text-gray-700 dark:text-gray-200"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
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
            <div className="relative" ref={tagDropdownRef}>
              <button
                id="contacts-tag-filter-btn"
                type="button"
                onClick={() => setTagDropdownOpen(o => !o)}
                className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all outline-none
                  ${selectedTags.length > 0
                    ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-200 dark:shadow-purple-900/40 font-semibold'
                    : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-purple-400'
                  }`}
              >
                <span className="flex items-center gap-2 truncate">
                  <FiTag size={15} className="flex-shrink-0" />
                  <span className="truncate">
                    {selectedTags.length > 0
                      ? (selectedTags.length === 1 
                          ? selectedTags[0] 
                          : `${selectedTags[0]} +${selectedTags.length - 1}`)
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
                  style={{ minWidth: '260px' }}
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
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <FiX size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="max-h-60 overflow-y-auto p-2 space-y-0.5">
                    <button
                      id="contacts-tag-option-all"
                      type="button"
                      onClick={() => { setSelectedTags([]); setTagDropdownOpen(false); setTagSearch(''); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors
                        ${selectedTags.length === 0
                          ? 'bg-purple-600 text-white'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-700'
                        }`}
                    >
                      Todas as Etiquetas
                    </button>

                    {(availableFilters.tags?.filter(tag =>
                      !tagSearch || tag.toLowerCase().includes(tagSearch.toLowerCase())
                    ).length > 0) && (
                      <div className="mx-1 my-1 border-t border-dashed border-gray-100 dark:border-gray-700" />
                    )}

                    {availableFilters.tags
                      ?.filter(tag => !tagSearch || tag.toLowerCase().includes(tagSearch.toLowerCase()))
                      .map(tag => {
                        const isSelected = selectedTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            id={`contacts-tag-option-${tag}`}
                            type="button"
                            onClick={() => handleToggleTag(tag)}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors truncate
                              ${isSelected
                                ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-semibold'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-700'
                              }`}
                            title={tag}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              readOnly
                              className="rounded text-purple-600 focus:ring-purple-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                            />
                            <span className="truncate">{tag}</span>
                          </button>
                        );
                      })
                    }

                    {tagSearch && availableFilters.tags?.filter(tag =>
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
          </div>

          <div className="md:col-span-2 lg:col-span-2">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-300 outline-none
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
          <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-700 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-fadeIn">
            
            {/* Criador/Importador */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider pl-1">
                Criado por
              </label>
              <FilterSelect
                icon={FiFilter}
                placeholder="Todos os Criadores"
                value={importedByClientId}
                onChange={setImportedByClientId}
                color="blue"
                options={(availableFilters.imported_by_clients || []).map(c => ({ value: c.id, label: `👤 ${c.name}` }))}
              />
            </div>

            {/* Origem */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider pl-1">
                Origem
              </label>
              <FilterSelect
                icon={FiFilter}
                placeholder="Todas as Origens"
                value={origin}
                onChange={setOrigin}
                color="blue"
                searchable={false}
                options={[
                  { value: 'manual', label: '👤 Criado Manualmente' },
                  { value: 'manual_bulk', label: '📥 Importado por Planilha (CSV)' },
                  { value: 'webhook', label: '🔗 Criado via Webhook' },
                ]}
              />
            </div>

            {/* Status de Proteção */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider pl-1">
                Proteção de Exclusão
              </label>
              <FilterSelect
                icon={FiFilter}
                placeholder="Todos os Status"
                value={lockedFilter}
                onChange={setLockedFilter}
                color="blue"
                searchable={false}
                options={[
                  { value: 'true', label: '🔒 Protegidos' },
                  { value: 'false', label: '🔓 Não Protegidos' },
                ]}
              />
            </div>

            {/* Status de Bloqueio/Repouso */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider pl-1">
                Bloqueio / Repouso
              </label>
              <FilterSelect
                icon={FiFilter}
                placeholder="Todos os Status"
                value={blockStatusFilter}
                onChange={setBlockStatusFilter}
                color="blue"
                searchable={false}
                disabled={blockStatusOptions.length === 0}
                options={blockStatusOptions}
              />
            </div>

            {/* BSUD */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider pl-1">
                Fallback (BSUD)
              </label>
              <FilterSelect
                icon={FiFilter}
                placeholder="Todos (BSUD)"
                value={bsudFilter}
                onChange={setBsudFilter}
                color="blue"
                searchable={false}
                options={[
                  { value: 'true', label: '💬 Com BSUD (nº fallback)' },
                  { value: 'false', label: '⚠️ Sem BSUD' },
                ]}
              />
            </div>

            {/* DDI */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider pl-1">
                DDI (País)
              </label>
              <FilterSelect
                icon={FiFilter}
                placeholder="Todos os DDIs"
                value={filterDdi}
                onChange={setFilterDdi}
                color="green"
                disabled={ddiOptions.length === 0}
                options={ddiOptions.map(ddi => ({ value: ddi, label: formatDdiOption(ddi) }))}
              />
            </div>

            {/* DDD */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider pl-1">
                DDD (Estado)
              </label>
              <FilterSelect
                icon={FiFilter}
                placeholder="Todos os DDDs"
                value={filterDdd}
                onChange={setFilterDdd}
                color="green"
                disabled={dddOptions.length === 0}
                options={dddOptions.map(ddd => ({ value: ddd, label: formatDddOption(ddd) }))}
              />
            </div>

          </div>
        )}

      </div>

      {/* Badges de filtros ativos */}
      {(hasDateFilter || filterDdi || filterDdd || blockStatusFilter || (selectedTags && selectedTags.length > 0)) && (
        <div className="flex flex-wrap items-center gap-2 px-1">
          <span className="text-xs text-gray-400 font-medium">Filtros ativos:</span>

          {blockStatusFilter && (
            <span className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700/50">
              {blockStatusFilter === 'blocked' ? '🚫 Bloqueados' : '😴 Em Repouso'}
              <button
                type="button"
                onClick={() => setBlockStatusFilter('')}
                className="ml-0.5 text-red-400 hover:text-red-600 transition-colors"
              >
                <FiX size={11} />
              </button>
            </span>
          )}

          {filterDdi && (
            <span className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700/50">
              {formatDdiOption(filterDdi)}
              <button
                type="button"
                onClick={() => setFilterDdi('')}
                className="ml-0.5 text-green-400 hover:text-green-600 transition-colors"
              >
                <FiX size={11} />
              </button>
            </span>
          )}

          {filterDdd && (
            <span className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700/50">
              {formatDddOption(filterDdd)}
              <button
                type="button"
                onClick={() => setFilterDdd('')}
                className="ml-0.5 text-green-400 hover:text-green-600 transition-colors"
              >
                <FiX size={11} />
              </button>
            </span>
          )}

          {hasDateFilter && (
            <span className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700/50">
              {datePreset === 'custom' ? 'Período personalizado' : getPresetLabel(datePreset)}
              <button
                id="contacts-date-badge-remove"
                type="button"
                onClick={handleClearDateFilters}
                className="ml-0.5 text-blue-400 hover:text-blue-600 transition-colors"
              >
                <FiX size={11} />
              </button>
            </span>
          )}

          {selectedTags && selectedTags.map(tag => (
            <span key={tag} className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700/50">
              <FiTag size={11} />
              {tag}
              <button
                id={`contacts-tag-badge-remove-${tag}`}
                type="button"
                onClick={() => setSelectedTags(prev => prev.filter(t => t !== tag))}
                className="ml-0.5 text-purple-400 hover:text-purple-600 transition-colors"
              >
                <FiX size={11} />
              </button>
            </span>
          ))}

          <span className="ml-auto text-xs font-semibold text-gray-400">
            {total} resultado{total !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {!hasDateFilter && !filterDdi && !filterDdd && !blockStatusFilter && (!selectedTags || selectedTags.length === 0) && (
        <div className="flex items-center justify-end px-1">
          <span className="text-xs font-semibold text-gray-400">Total: {total} contatos</span>
        </div>
      )}
    </div>
  );
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const QUICK_PRESETS = [
  { value: 'last7',      label: 'Últimos 7 dias' },
  { value: 'last14',     label: 'Últimos 14 dias' },
  { value: 'last30',     label: 'Últimos 30 dias' },
  { value: 'this_month', label: 'Este mês' },
  { value: 'last_month', label: 'Mês passado' },
];

function getPresetLabel(datePreset) {
  if (!datePreset) return null;
  const found = QUICK_PRESETS.find(p => p.value === datePreset);
  if (found) return found.label;
  if (datePreset === 'custom') return 'Período personalizado';
  if (/^\d{4}-\d{2}$/.test(datePreset)) {
    const [year, month] = datePreset.split('-').map(Number);
    return `${MONTHS[month - 1]} ${year}`;
  }
  return null;
}
