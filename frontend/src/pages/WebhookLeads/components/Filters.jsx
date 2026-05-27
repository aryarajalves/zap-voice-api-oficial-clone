import React, { useState, useRef, useEffect } from 'react';
import { FiSearch, FiTag, FiCalendar, FiChevronDown, FiX, FiFilter } from 'react-icons/fi';

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
  selectedTag, setSelectedTag,
  availableFilters,
  total,
  datePreset, setDatePreset,
  customDateFrom, setCustomDateFrom,
  customDateTo, setCustomDateTo,
  handleClearDateFilters,
}) {
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const monthOptions = getMonthOptions();
  const activePresetLabel = getPresetLabel(datePreset);
  const hasDateFilter = !!datePreset;
  const hasCustomDates = datePreset === 'custom';

  // Fecha o dropdown ao clicar fora
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

  return (
    <div className="mb-6 space-y-3">
      {/* Linha 1: Busca + Etiquetas + Data */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        
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

        {/* Etiquetas */}
        <div className="relative">
          <FiTag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <select
            id="contacts-tag-filter"
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none"
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
          >
            <option value="">Todas as Etiquetas</option>
            {availableFilters.tags?.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
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
              className="absolute top-full left-0 right-0 mt-2 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
              style={{ minWidth: '280px' }}
            >
              {/* Header do dropdown */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <FiFilter size={11} /> Período de Chegada
                </span>
                {hasDateFilter && (
                  <button
                    id="contacts-date-clear-btn"
                    onClick={handleClearAll}
                    className="text-xs text-red-500 hover:text-red-600 font-semibold flex items-center gap-1 transition-colors"
                  >
                    <FiX size={12} /> Limpar
                  </button>
                )}
              </div>

              {/* Presets rápidos */}
              <div className="p-3 space-y-1">
                {QUICK_PRESETS.map(preset => (
                  <button
                    key={preset.value}
                    id={`contacts-date-preset-${preset.value}`}
                    onClick={() => handleSelectPreset(preset.value)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors font-medium
                      ${datePreset === preset.value
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600'
                      }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Divisor */}
              <div className="mx-4 border-t border-dashed border-gray-200 dark:border-gray-700" />

              {/* Mês específico */}
              <div className="p-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">
                  Mês específico
                </p>
                <div
                  className="max-h-44 overflow-y-auto space-y-1 scrollbar-none"
                >
                  {monthOptions.map(opt => (
                    <button
                      key={opt.value}
                      id={`contacts-date-month-${opt.value}`}
                      onClick={() => handleSelectPreset(opt.value)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors font-medium
                        ${datePreset === opt.value
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600'
                        }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Divisor */}
              <div className="mx-4 border-t border-dashed border-gray-200 dark:border-gray-700" />

              {/* Período personalizado */}
              <div className="p-3">
                <button
                  id="contacts-date-custom-btn"
                  onClick={() => handleSelectPreset('custom')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors font-medium mb-2
                    ${datePreset === 'custom'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600'
                    }`}
                >
                  Período personalizado...
                </button>

                {hasCustomDates && (
                  <div className="space-y-2 mt-1 animate-in fade-in duration-150">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">De</label>
                      <input
                        id="contacts-date-from-input"
                        type="date"
                        value={customDateFrom}
                        onChange={(e) => setCustomDateFrom(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Até</label>
                      <input
                        id="contacts-date-to-input"
                        type="date"
                        value={customDateTo}
                        onChange={(e) => setCustomDateTo(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                    <button
                      id="contacts-date-apply-btn"
                      onClick={() => setDateDropdownOpen(false)}
                      disabled={!customDateFrom && !customDateTo}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
      {(hasDateFilter || selectedTag) && (
        <div className="flex flex-wrap items-center gap-2 px-1">
          <span className="text-xs text-gray-400 font-medium">Filtros ativos:</span>

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

          {selectedTag && (
            <span className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700/50">
              <FiTag size={11} />
              {selectedTag}
              <button
                id="contacts-tag-badge-remove"
                onClick={() => setSelectedTag('')}
                className="ml-0.5 text-purple-400 hover:text-purple-600 transition-colors"
              >
                <FiX size={11} />
              </button>
            </span>
          )}

          <span className="ml-auto text-xs font-semibold text-gray-400">
            {total} resultado{total !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {!hasDateFilter && !selectedTag && (
        <div className="flex items-center justify-end px-1">
          <span className="text-xs font-semibold text-gray-400">Total: {total} contatos</span>
        </div>
      )}
    </div>
  );
}
