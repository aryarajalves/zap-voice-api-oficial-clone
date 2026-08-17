import React from 'react';
import { FiX, FiTag } from 'react-icons/fi';
import { formatDddOption, formatDdiOption } from '../../../../utils/dddInfo';

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

export default function ActiveFiltersBadges({
  hasDateFilter,
  datePreset,
  handleClearDateFilters,
  filterDdi,
  setFilterDdi,
  filterDdd,
  setFilterDdd,
  blockStatusFilter,
  setBlockStatusFilter,
  selectedTags = [],
  setSelectedTags,
  total
}) {
  const hasActiveBadges = hasDateFilter || filterDdi || filterDdd || blockStatusFilter || (selectedTags && selectedTags.length > 0);

  if (!hasActiveBadges) {
    return (
      <div className="flex items-center justify-end px-1">
        <span className="text-xs font-semibold text-gray-400">Total: {total} contatos</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 px-1">
      <span className="text-xs text-gray-400 font-medium">Filtros ativos:</span>

      {blockStatusFilter && (
        <span className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700/50">
          {blockStatusFilter === 'blocked' ? '🚫 Bloqueados' : '😴 Em Repouso'}
          <button
            type="button"
            onClick={() => setBlockStatusFilter('')}
            className="ml-0.5 text-red-400 hover:text-red-600 transition-colors cursor-pointer"
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
            className="ml-0.5 text-green-400 hover:text-green-600 transition-colors cursor-pointer"
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
            className="ml-0.5 text-green-400 hover:text-green-600 transition-colors cursor-pointer"
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
            className="ml-0.5 text-blue-400 hover:text-blue-600 transition-colors cursor-pointer"
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
            className="ml-0.5 text-purple-400 hover:text-purple-600 transition-colors cursor-pointer"
          >
            <FiX size={11} />
          </button>
        </span>
      ))}

      <span className="ml-auto text-xs font-semibold text-gray-400">
        {total} resultado{total !== 1 ? 's' : ''}
      </span>
    </div>
  );
}
