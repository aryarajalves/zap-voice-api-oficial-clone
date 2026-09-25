import React from 'react';

/**
 * Exibe o estado vazio quando a lista de funis está zerada ou filtrada.
 */
export const FunnelEmptyState = ({
  isFilterApplied,
  isArchivedTab,
  onClearFilters,
  onCreateFunnel
}) => {
  return (
    <div className="text-center py-10 text-gray-400">
      {isFilterApplied ? (
        <div>
          <p>Nenhum funil encontrado com os filtros aplicados.</p>
          <button
            onClick={onClearFilters}
            className="text-blue-600 dark:text-blue-400 font-semibold hover:underline mt-2 text-xs"
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <div>
          <p>{isArchivedTab ? 'Nenhum funil arquivado.' : 'Nenhum funil criado ainda.'}</p>
          {!isArchivedTab && (
            <button
              onClick={onCreateFunnel}
              className="text-blue-600 font-medium hover:underline mt-2"
            >
              Criar o primeiro
            </button>
          )}
        </div>
      )}
    </div>
  );
};
