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

  // Extração de tags internas consolidadas (deduplicada case-insensitivamente)
  const existingInternalTags = useMemo(() => {
    const seen = new Set();
    const result = [];
    const addTag = (raw) => {
      if (!raw) return;
      const clean = String(raw).trim();
      if (!clean) return;
      const key = clean.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        result.push(clean);
      }
    };
    (integrations || []).forEach(integration => {
      (integration.mappings || []).forEach(m => {
        if (m.internal_tags) {
          m.internal_tags.split(',').forEach(t => addTag(t));
        }
      });
    });
    (leadTags || []).forEach(t => addTag(t));
    return result;
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
