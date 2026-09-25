import React from 'react';
import { useFunnelFilters } from './hooks/useFunnelFilters';
import { FunnelFiltersBar } from './components/FunnelFiltersBar';
import { FunnelListItem } from './components/FunnelListItem';
import { FunnelEmptyState } from './components/FunnelEmptyState';
import { FunnelPagination } from './components/FunnelPagination';

/**
 * Componente principal de Listagem de Funis (Modularizado).
 */
export const FunnelList = ({ logic }) => {
  const {
    selectedTag,
    searchQuery,
    availableTags,
    filteredFunnels,
    paginatedFunnels,
    totalPages,
    handleTagFilterChange,
    handleSearchChange,
    handleClearFilters
  } = useFunnelFilters(logic);

  const handleEditTag = (funnel, e) => {
    if (e) e.stopPropagation();
    logic.setFunnelForTag(funnel);
    logic.setIsTagModalOpen(true);
  };

  const isAllFilteredSelected =
    filteredFunnels.length > 0 &&
    filteredFunnels.every(f => logic.selectedFunnelIds.includes(f.id));

  const handleToggleSelectAll = (e) => {
    if (e.target.checked) {
      const filteredIds = filteredFunnels.map(f => f.id);
      logic.setSelectedFunnelIds(prev => Array.from(new Set([...prev, ...filteredIds])));
    } else {
      const filteredIdSet = new Set(filteredFunnels.map(f => f.id));
      logic.setSelectedFunnelIds(prev => prev.filter(id => !filteredIdSet.has(id)));
    }
  };

  return (
    <div className="lg:col-span-12 space-y-4">
      {/* Barra de Filtros, Abas e Busca */}
      <FunnelFiltersBar
        logic={logic}
        selectedTag={selectedTag}
        searchQuery={searchQuery}
        availableTags={availableTags}
        onTagFilterChange={handleTagFilterChange}
        onSearchChange={handleSearchChange}
        onClearFilters={handleClearFilters}
      />

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header do Card da Lista */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-between items-center flex-wrap gap-3">
          <div className="flex items-center gap-3">
            {filteredFunnels.length > 0 && (
              <input
                type="checkbox"
                checked={isAllFilteredSelected}
                onChange={handleToggleSelectAll}
                className="w-5 h-5 text-blue-600 rounded border-gray-300 cursor-pointer"
                title="Selecionar Todos"
                data-testid="funnel-select-all-checkbox"
              />
            )}
            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              {logic.isArchivedTab ? 'Funis Arquivados' : 'Seus Funis'}
              {(selectedTag || searchQuery) && (
                <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                  {filteredFunnels.length} resultado(s)
                </span>
              )}
            </h2>
          </div>
          {logic.selectedFunnelIds.length > 0 && (
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
              {logic.selectedFunnelIds.length} de {filteredFunnels.length} selecionados
            </span>
          )}
        </div>

        {/* Lista de Itens */}
        <div className="p-4 space-y-3">
          {filteredFunnels.length === 0 ? (
            <FunnelEmptyState
              isFilterApplied={Boolean(selectedTag || searchQuery)}
              isArchivedTab={logic.isArchivedTab}
              onClearFilters={handleClearFilters}
              onCreateFunnel={logic.handleCreateFunnel}
            />
          ) : (
            paginatedFunnels.map(funnel => (
              <FunnelListItem
                key={funnel.id}
                funnel={funnel}
                logic={logic}
                onEditTag={handleEditTag}
              />
            ))
          )}
        </div>

        {/* Paginação */}
        {logic.funnels.length > 0 && (
          <FunnelPagination
            itemsPerPage={logic.itemsPerPage}
            setItemsPerPage={logic.setItemsPerPage}
            currentPage={logic.currentPage}
            setCurrentPage={logic.setCurrentPage}
            totalPages={totalPages}
          />
        )}
      </div>
    </div>
  );
};
