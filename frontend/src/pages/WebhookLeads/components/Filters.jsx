import React, { useState, useRef, useEffect } from 'react';
import { FiSearch, FiTag, FiCalendar, FiChevronDown, FiX, FiFilter } from 'react-icons/fi';
import { formatDddOption, formatDdiOption } from '../../../utils/dddInfo';
import FilterSelect from './FilterSelect';

// Meses do ano para o seletor de mês específico
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

function getMonthOptions() {
  const today = new Date();
  const options = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    options.push({ value, label });
  }
  return options;
}

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
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const dropdownRef = useRef(null);
  const tagDropdownRef = useRef(null);
  const tagSearchRef = useRef(null);
  const monthOptions = getMonthOptions();
  const activePresetLabel = getPresetLabel(datePreset);
  const hasDateFilter = !!datePreset;
  const hasCustomDates = datePreset === 'custom';

  // Fecha o dropdown de data ao clicar fora
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDateDropdownOpen(false);
      }
    }
    if (dateDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dateDropdownOpen]);

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
      // Foca o campo de busca ao abrir
      setTimeout(() => tagSearchRef.current?.focus(), 50);
    }
    return () => document.removeEventListener('mousedown', handleTagClickOutside);
  }, [tagDropdownOpen]);

  const handleSelectPreset = (value) => {
    setDatePreset(value);
    if (value !== 'custom') {
      setDateDropdownOpen(false);
    }
  };

  const handleClearAll = () => {
    handleClearDateFilters();
    setDateDropdownOpen(false);
  };

  const handleToggleTag = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  // Opções do filtro de Bloqueio/Repouso: só aparece "Bloqueados" ou "Em
  // Repouso" quando existe pelo menos 1 contato nesse estado entre os
  // resultados filtrados — nunca uma opção vazia/sem uso.
  const blockStatusOptions = [
    ...(hasBlockedLeads ? [{ value: 'blocked', label: '🚫 Bloqueados' }] : []),
    ...(hasRestingLeads ? [{ value: 'resting', label: '😴 Em Repouso' }] : []),
  ];

  return (
    <div className="mb-6 space-y-3">
      {/* Linha 1: Busca + Criador + Origem + Etiquetas + Data */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        
        {/* Busca */}
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            id="contacts-search-input"
            type="text"
            placeholder="Buscar por nome ou telefone..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filtro por Cliente Criador/Importador */}
        <FilterSelect
          icon={FiFilter}
          placeholder="Todos os Criadores"
          value={importedByClientId}
          onChange={setImportedByClientId}
          color="blue"
          options={(availableFilters.imported_by_clients || []).map(c => ({ value: c.id, label: `👤 ${c.name}` }))}
        />

        {/* Filtro por Origem (Manual, Planilha, Webhook) */}
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

        {/* Filtro por Proteção contra exclusão (não confundir com o bloqueio
            de envio de disparos, que é outra funcionalidade) */}
        <FilterSelect
          icon={FiFilter}
          placeholder="Todos os Status de Proteção"
          value={lockedFilter}
          onChange={setLockedFilter}
          color="blue"
          searchable={false}
          options={[
            { value: 'true', label: '🔒 Protegidos' },
            { value: 'false', label: '🔓 Não Protegidos' },
          ]}
        />

        {/* Filtro por Bloqueio real / Repouso — as opções só existem se houver
            pelo menos 1 contato bloqueado / em repouso na base filtrada */}
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

        {/* Filtro por BSUD */}
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

        {/* Filtro por DDI — opções calculadas dinamicamente pelo backend a
            partir dos contatos que já batem com os demais filtros ativos */}
        <FilterSelect
          icon={FiFilter}
          placeholder="Todos os DDIs"
          value={filterDdi}
          onChange={setFilterDdi}
          color="green"
          disabled={ddiOptions.length === 0}
          options={ddiOptions.map(ddi => ({ value: ddi, label: formatDdiOption(ddi) }))}
        />

        {/* Filtro por DDD — idem, só mostra os DDDs que existem na base filtrada */}
        <FilterSelect
          icon={FiFilter}
          placeholder="Todos os DDDs"
          value={filterDdd}
          onChange={setFilterDdd}
          color="green"
          disabled={dddOptions.length === 0}
          options={dddOptions.map(ddd => ({ value: ddd, label: formatDddOption(ddd) }))}
        />

        {/* Etiquetas — Dropdown com busca e checkboxes */}
        <div className="relative" ref={tagDropdownRef}>
          <button
            id="contacts-tag-filter-btn"
            onClick={() => setTagDropdownOpen(o => !o)}
            className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all outline-none
              ${selectedTags.length > 0
                ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-200 dark:shadow-purple-900/40'
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

          {/* Dropdown de etiquetas com busca e multi-seleção */}
          {tagDropdownOpen && (
            <div
              className="absolute top-full left-0 right-0 mt-2 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden"
              style={{ minWidth: '260px' }}
            >
              {/* Header com campo de busca */}
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
                    className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                  />
                  {tagSearch && (
                    <button
                      onClick={() => setTagSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <FiX size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Lista de etiquetas filtradas */}
              <div className="max-h-60 overflow-y-auto p-2 space-y-0.5">
                {/* Opção "Todas as Etiquetas" */}
                <button
                  id="contacts-tag-option-all"
                  onClick={() => { setSelectedTags([]); setTagDropdownOpen(false); setTagSearch(''); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    ${selectedTags.length === 0
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-700'
                    }`}
                >
                  Todas as Etiquetas
                </button>

                {/* Divisor */}
                {(availableFilters.tags?.filter(tag =>
                  !tagSearch || tag.toLowerCase().includes(tagSearch.toLowerCase())
                ).length > 0) && (
                  <div className="mx-1 my-1 border-t border-dashed border-gray-100 dark:border-gray-700" />
                )}

                {/* Lista filtrada com Checkboxes */}
                {availableFilters.tags
                  ?.filter(tag => !tagSearch || tag.toLowerCase().includes(tagSearch.toLowerCase()))
                  .map(tag => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        id={`contacts-tag-option-${tag}`}
                        onClick={() => handleToggleTag(tag)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors truncate
                          ${isSelected
                            ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-700'
                          }`}
                        title={tag}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}} // Tratado no clique do botão pai
                          className="rounded text-purple-600 focus:ring-purple-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                        />
                        <span className="truncate">{tag}</span>
                      </button>
                    );
                  })
                }

                {/* Sem resultados */}
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

        {/* Botão de Filtro por Data */}
        <div className="relative" ref={dropdownRef}>
          <button
            id="contacts-date-filter-btn"
            onClick={() => setDateDropdownOpen(o => !o)}
            className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all outline-none
              ${hasDateFilter
                ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200 dark:shadow-blue-900/40'
                : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-blue-400'
              }`}
          >
            <span className="flex items-center gap-2 truncate">
              <FiCalendar size={15} className="flex-shrink-0" />
              <span className="truncate">
                {activePresetLabel || 'Filtrar por data'}
              </span>
            </span>
            <FiChevronDown
              size={15}
              className={`flex-shrink-0 transition-transform duration-200 ${dateDropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Dropdown do filtro de data */}
          {dateDropdownOpen && (
            <div
              className="absolute top-full left-0 mt-2 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden"
              style={{ minWidth: '260px' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Período de chegada
                </span>
                {hasDateFilter && (
                  <button
                    id="contacts-date-clear-btn"
                    onClick={handleClearAll}
                    className="text-[10px] text-red-400 hover:text-red-600 font-semibold flex items-center gap-1 transition-colors"
                  >
                    <FiX size={11} /> Limpar
                  </button>
                )}
              </div>

              {/* Presets rápidos — grade 2 colunas */}
              <div className="p-3 grid grid-cols-2 gap-1.5">
                {QUICK_PRESETS.map(preset => (
                  <button
                    key={preset.value}
                    id={`contacts-date-preset-${preset.value}`}
                    onClick={() => handleSelectPreset(preset.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors text-center
                      ${datePreset === preset.value
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600'
                      }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Divisor */}
              <div className="mx-3 border-t border-gray-100 dark:border-gray-700" />

              {/* Grade de meses por ano */}
              <div className="p-3">
                {(() => {
                  const byYear = {};
                  monthOptions.forEach(opt => {
                    const year = opt.value.split('-')[0];
                    if (!byYear[year]) byYear[year] = [];
                    byYear[year].push(opt);
                  });
                  return Object.entries(byYear).map(([year, opts]) => (
                    <div key={year} className="mb-2 last:mb-0">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">{year}</p>
                      <div className="grid grid-cols-4 gap-1">
                        {opts.map(opt => {
                          const monthName = opt.label.split(' ')[0].slice(0, 3);
                          return (
                            <button
                              key={opt.value}
                              id={`contacts-date-month-${opt.value}`}
                              onClick={() => handleSelectPreset(opt.value)}
                              title={opt.label}
                              className={`py-1 rounded-lg text-[11px] font-semibold transition-colors
                                ${datePreset === opt.value
                                  ? 'bg-blue-600 text-white shadow-sm'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600'
                                }`}
                            >
                              {monthName}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ));
                })()}
              </div>

              {/* Divisor */}
              <div className="mx-3 border-t border-gray-100 dark:border-gray-700" />

              {/* Período personalizado */}
              <div className="p-3">
                <button
                  id="contacts-date-custom-btn"
                  onClick={() => handleSelectPreset('custom')}
                  className={`w-full px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors text-center
                    ${datePreset === 'custom'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600'
                    }`}
                >
                  Período personalizado...
                </button>

                {hasCustomDates && (
                  <div className="space-y-2 mt-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">De</label>
                        <input
                          id="contacts-date-from-input"
                          type="date"
                          value={customDateFrom}
                          onChange={(e) => setCustomDateFrom(e.target.value)}
                          className="w-full px-2 py-1.5 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Até</label>
                        <input
                          id="contacts-date-to-input"
                          type="date"
                          value={customDateTo}
                          onChange={(e) => setCustomDateTo(e.target.value)}
                          className="w-full px-2 py-1.5 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                      </div>
                    </div>
                    <button
                      id="contacts-date-apply-btn"
                      onClick={() => setDateDropdownOpen(false)}
                      disabled={!customDateFrom && !customDateTo}
                      className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Aplicar
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Badges de filtros ativos */}
      {(hasDateFilter || filterDdi || filterDdd || blockStatusFilter || (selectedTags && selectedTags.length > 0)) && (
        <div className="flex flex-wrap items-center gap-2 px-1">
          <span className="text-xs text-gray-400 font-medium">Filtros ativos:</span>

          {blockStatusFilter && (
            <span className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700/50">
              {blockStatusFilter === 'blocked' ? '🚫 Bloqueados' : '😴 Em Repouso'}
              <button
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
                onClick={() => setFilterDdd('')}
                className="ml-0.5 text-green-400 hover:text-green-600 transition-colors"
              >
                <FiX size={11} />
              </button>
            </span>
          )}

          {hasDateFilter && (
            <span className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700/50">
              <FiCalendar size={11} />
              {activePresetLabel}
              <button
                id="contacts-date-badge-remove"
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
