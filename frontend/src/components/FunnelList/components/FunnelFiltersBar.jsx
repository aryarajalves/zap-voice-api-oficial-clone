import React from 'react';
import { FiTag, FiSearch, FiX } from 'react-icons/fi';

/**
 * Barra superior de filtros: Abas (Ativos/Arquivados), Seletor de Etiquetas e Busca.
 */
export const FunnelFiltersBar = ({
  logic,
  selectedTag,
  searchQuery,
  availableTags,
  onTagFilterChange,
  onSearchChange,
  onClearFilters
}) => {
  return (
    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
      {/* Abas Ativos / Arquivados */}
      <div className="flex bg-gray-100 dark:bg-gray-900/60 p-1 rounded-xl w-full sm:w-60 select-none">
        <button
          onClick={() => {
            logic.setIsArchivedTab(false);
            onClearFilters();
          }}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
            !logic.isArchivedTab
              ? 'bg-white dark:bg-gray-800 shadow-sm text-blue-600 dark:text-blue-400'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          Ativos
        </button>
        <button
          onClick={() => {
            logic.setIsArchivedTab(true);
            onClearFilters();
          }}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
            logic.isArchivedTab
              ? 'bg-white dark:bg-gray-800 shadow-sm text-blue-600 dark:text-blue-400'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          Arquivados
        </button>
      </div>

      {/* Filtro por Etiqueta e Barra de Busca */}
      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
        {/* Seletor de Etiqueta */}
        <div className="relative flex items-center">
          <FiTag className="absolute left-3 text-violet-500 pointer-events-none text-xs" />
          <select
            value={selectedTag}
            onChange={(e) => onTagFilterChange(e.target.value)}
            className="pl-8 pr-7 py-1.5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 shadow-sm outline-none focus:ring-2 focus:ring-violet-500 transition-all cursor-pointer"
            title="Filtrar funis por etiqueta"
            data-testid="funnel-tag-filter-select"
          >
            <option value="">Todas as etiquetas ({logic.funnels.length})</option>
            {availableTags.map(tag => {
              const count = logic.funnels.filter(f => f.tag?.trim() === tag).length;
              return (
                <option key={tag} value={tag}>
                  🏷️ {tag} ({count})
                </option>
              );
            })}
            <option value="__no_tag__">
              Sem etiqueta ({logic.funnels.filter(f => !f.tag?.trim()).length})
            </option>
          </select>
        </div>

        {/* Campo de Busca Rápida */}
        <div className="relative flex-1 sm:w-56">
          <FiSearch className="absolute left-3 top-2.5 text-gray-400 text-xs pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar funil..."
            className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 shadow-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-400"
            data-testid="funnel-search-input"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              title="Limpar busca"
            >
              <FiX size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
