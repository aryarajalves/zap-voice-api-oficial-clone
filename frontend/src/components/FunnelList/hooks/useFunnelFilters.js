import { useState, useMemo } from 'react';

/**
 * Hook customizado para gerenciar filtros, busca e paginação de funis.
 */
export const useFunnelFilters = (logic) => {
  const [selectedTag, setSelectedTag] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Coletar todas as etiquetas únicas existentes na lista atual
  const availableTags = useMemo(() => {
    const tags = logic.funnels
      .map(f => f.tag?.trim())
      .filter(Boolean);
    return Array.from(new Set(tags)).sort();
  }, [logic.funnels]);

  // Filtrar os funis pela etiqueta selecionada e termo de busca
  const filteredFunnels = useMemo(() => {
    return logic.funnels.filter(funnel => {
      // Filtro de Etiqueta
      if (selectedTag === '__no_tag__') {
        if (funnel.tag && funnel.tag.trim()) return false;
      } else if (selectedTag) {
        if (funnel.tag?.trim() !== selectedTag) return false;
      }

      // Filtro de Busca por Nome / Gatilho / Etiqueta
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = funnel.name?.toLowerCase().includes(query);
        const matchesTrigger = funnel.trigger_phrase?.toLowerCase().includes(query);
        const matchesTag = funnel.tag?.toLowerCase().includes(query);
        if (!matchesName && !matchesTrigger && !matchesTag) return false;
      }

      return true;
    });
  }, [logic.funnels, selectedTag, searchQuery]);

  // Cálculo da Paginação sobre a lista filtrada
  const totalItems = filteredFunnels.length;
  const totalPages = Math.ceil(totalItems / logic.itemsPerPage) || 1;
  const startIndex = (logic.currentPage - 1) * logic.itemsPerPage;
  const paginatedFunnels = filteredFunnels.slice(startIndex, startIndex + logic.itemsPerPage);

  const handleTagFilterChange = (tag) => {
    setSelectedTag(tag);
    logic.setCurrentPage(1);
  };

  const handleSearchChange = (val) => {
    setSearchQuery(val);
    logic.setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSelectedTag('');
    setSearchQuery('');
    logic.setCurrentPage(1);
  };

  return {
    selectedTag,
    setSelectedTag,
    searchQuery,
    setSearchQuery,
    availableTags,
    filteredFunnels,
    paginatedFunnels,
    totalItems,
    totalPages,
    handleTagFilterChange,
    handleSearchChange,
    handleClearFilters
  };
};
