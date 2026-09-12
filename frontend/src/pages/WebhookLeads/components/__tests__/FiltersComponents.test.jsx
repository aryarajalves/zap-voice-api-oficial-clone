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
    it('renderiza o seletor de regra de filtro quando há 2 ou mais etiquetas selecionadas', () => {
      const setTagMode = vi.fn();
      render(
        <FilterTagDropdown
          selectedTags={['VIP', 'Lead Quente']}
          setSelectedTags={vi.fn()}
          tagMode="OR"
          setTagMode={setTagMode}
          excludedTags={[]}
          setExcludedTags={vi.fn()}
          availableTags={['VIP', 'Lead Quente']}
        />
      );

      // Botão mostra +2 (OU)
      expect(screen.getByText('+2 (OU)')).toBeDefined();

      // Abrir dropdown
      fireEvent.click(screen.getByRole('button', { name: /\+2 \(OU\)/i }));

      // Seletor de modo visível
      expect(screen.getByText('Regra de Filtro:')).toBeDefined();
      expect(screen.getByText('Qualquer (OU)')).toBeDefined();
      expect(screen.getByText('Todas (E)')).toBeDefined();

      // Clicar em Todas (E)
      fireEvent.click(screen.getByText('Todas (E)'));
      expect(setTagMode).toHaveBeenCalledWith('AND');
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

    it('renderiza badge de troca rápida de regra (E / OU) quando há 2+ etiquetas selecionadas', () => {
      const setTagMode = vi.fn();

      render(
        <ActiveFiltersBadges
          selectedTags={['VIP', 'Lead Quente']}
          setSelectedTags={vi.fn()}
          tagMode="OR"
          setTagMode={setTagMode}
          total={10}
        />
      );

      expect(screen.getByText('Qualquer uma (OU)')).toBeDefined();

      // Clicar no badge para alternar
      const toggleBtn = screen.getByRole('button', { name: /Qualquer uma \(OU\)/i });
      fireEvent.click(toggleBtn);
      expect(setTagMode).toHaveBeenCalledWith('AND');
    });
  });
});
