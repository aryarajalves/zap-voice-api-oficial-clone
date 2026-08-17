import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import FilterTagDropdown from '../Filters/FilterTagDropdown';
import AdvancedFiltersPanel from '../Filters/AdvancedFiltersPanel';
import ActiveFiltersBadges from '../Filters/ActiveFiltersBadges';

describe('Filters Subcomponents', () => {
  describe('FilterTagDropdown', () => {
    it('renderiza o dropdown de etiquetas', () => {
      render(
        <FilterTagDropdown
          selectedTags={['VIP']}
          setSelectedTags={vi.fn()}
          excludedTags={[]}
          setExcludedTags={vi.fn()}
          availableTags={['VIP', 'Leads Frios']}
        />
      );

      expect(screen.getByText('+1')).toBeDefined();
    });
  });

  describe('AdvancedFiltersPanel', () => {
    it('renderiza os campos de filtros avançados', () => {
      render(
        <AdvancedFiltersPanel
          importedByClientId=""
          setImportedByClientId={vi.fn()}
          origin=""
          setOrigin={vi.fn()}
          lockedFilter=""
          setLockedFilter={vi.fn()}
          blockStatusFilter=""
          setBlockStatusFilter={vi.fn()}
          bsudFilter=""
          setBsudFilter={vi.fn()}
          filterDdi=""
          setFilterDdi={vi.fn()}
          filterDdd=""
          setFilterDdd={vi.fn()}
          ddiOptions={['55']}
          dddOptions={['85']}
          blockStatusOptions={[]}
          availableFilters={{ imported_by_clients: [] }}
        />
      );

      expect(screen.getByText('Criado por')).toBeDefined();
      expect(screen.getByText('Origem')).toBeDefined();
      expect(screen.getByText('Proteção de Exclusão')).toBeDefined();
      expect(screen.getByText('Bloqueio / Repouso')).toBeDefined();
    });
  });

  describe('ActiveFiltersBadges', () => {
    it('renderiza badges com botão de remover', () => {
      const handleClear = vi.fn();
      const setDdi = vi.fn();

      render(
        <ActiveFiltersBadges
          hasDateFilter={true}
          datePreset="last7"
          handleClearDateFilters={handleClear}
          filterDdi="55"
          setFilterDdi={setDdi}
          filterDdd=""
          setFilterDdd={vi.fn()}
          blockStatusFilter=""
          setBlockStatusFilter={vi.fn()}
          selectedTags={['VIP']}
          setSelectedTags={vi.fn()}
          total={42}
        />
      );

      expect(screen.getByText('Filtros ativos:')).toBeDefined();
      expect(screen.getByText('Últimos 7 dias')).toBeDefined();
      expect(screen.getByText('VIP')).toBeDefined();
      expect(screen.getByText('42 resultados')).toBeDefined();
    });
  });
});
