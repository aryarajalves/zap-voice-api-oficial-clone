import React, { useState, useRef, useEffect } from 'react';
import { FiCalendar, FiChevronDown, FiX } from 'react-icons/fi';

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

export default function DateFilter({
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
    <div className="relative w-full" ref={dropdownRef}>
      <button
        id="contacts-date-filter-btn"
        type="button"
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
          className="absolute top-full left-0 md:right-0 mt-2 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden"
          style={{ minWidth: '280px' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Período de chegada
            </span>
            {hasDateFilter && (
              <button
                id="contacts-date-clear-btn"
                type="button"
                onClick={handleClearAll}
                className="text-[10px] text-red-400 hover:text-red-600 font-semibold flex items-center gap-1 transition-colors bg-transparent border-none cursor-pointer"
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
                type="button"
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
                          type="button"
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
              type="button"
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
                  type="button"
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
  );
}
