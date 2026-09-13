import { useState, useMemo } from 'react';

/**
 * Hook para gerenciar os filtros locais, ordenação, paginação e tags internas
 * da lista de integrações do webhook.
 */
export function useIntegrationsTableFilter(integrations = [], leadTags = []) {
  const [listPageSize, setListPageSize] = useState(5);
  const [listCurrentPage, setListCurrentPage] = useState(1);
  const [filterPlatform, setFilterPlatform] = useState('');
  const [filterHasTriggers, setFilterHasTriggers] = useState(false);
  const [filterHasHistory, setFilterHasHistory] = useState(false);

  // Extração de tags internas consolidadas
  const existingInternalTags = useMemo(() => {
    const tagsSet = new Set();
    (integrations || []).forEach(integration => {
      (integration.mappings || []).forEach(m => {
        if (m.internal_tags) {
          m.internal_tags.split(',').forEach(t => {
            const clean = t.trim();
            if (clean) tagsSet.add(clean);
          });
        }
      });
    });
    (leadTags || []).forEach(t => {
      const clean = t.trim();
      if (clean) tagsSet.add(clean);
    });
    return Array.from(tagsSet);
  }, [integrations, leadTags]);

  // Filtros locais da tabela
  let filteredIntegrations = filterPlatform
    ? integrations.filter(i => i.platform === filterPlatform)
    : integrations;

  if (filterHasTriggers) {
    filteredIntegrations = filteredIntegrations.filter(i => (i.mappings || []).length > 0);
  }

  if (filterHasHistory) {
    filteredIntegrations = filteredIntegrations.filter(i => (i.history_count || 0) > 0);
  }

  // Ordenação por quantidade de histórico decrescente
  const sortedIntegrations = [...filteredIntegrations].sort((a, b) => {
    const countA = a.history_count || 0;
    const countB = b.history_count || 0;
    return countB - countA;
  });

  // Cálculo de paginação
  const totalPages = Math.max(1, Math.ceil(sortedIntegrations.length / listPageSize));
  const safePage = Math.min(listCurrentPage, Math.max(1, totalPages));
  const paginatedIntegrations = sortedIntegrations.slice((safePage - 1) * listPageSize, safePage * listPageSize);

  return {
    listPageSize,
    setListPageSize,
    listCurrentPage,
    setListCurrentPage,
    filterPlatform,
    setFilterPlatform,
    filterHasTriggers,
    setFilterHasTriggers,
    filterHasHistory,
    setFilterHasHistory,
    existingInternalTags,
    filteredIntegrations,
    sortedIntegrations,
    totalPages,
    safePage,
    paginatedIntegrations
  };
}
