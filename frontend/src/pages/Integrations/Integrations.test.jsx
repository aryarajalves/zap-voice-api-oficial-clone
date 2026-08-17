import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import IntegrationsHeaderBanner from './components/IntegrationsHeaderBanner';
import IntegrationsFilterBar from './components/IntegrationsFilterBar';
import IntegrationsTable from './components/IntegrationsTable';

describe('Integrations Modular Components', () => {
  describe('IntegrationsHeaderBanner', () => {
    it('renderiza título, atalhos de navegação e botões principais', () => {
      const onNavigateToLeads = vi.fn();
      const onNavigateToBulk = vi.fn();
      const onNavigateToDispatchHistory = vi.fn();
      const onNavigateToFunnels = vi.fn();
      const onOpenMappingGuide = vi.fn();
      const onOpenNewModal = vi.fn();

      render(
        <IntegrationsHeaderBanner
          onNavigateToLeads={onNavigateToLeads}
          onNavigateToBulk={onNavigateToBulk}
          onNavigateToDispatchHistory={onNavigateToDispatchHistory}
          onNavigateToFunnels={onNavigateToFunnels}
          onOpenMappingGuide={onOpenMappingGuide}
          onOpenNewModal={onOpenNewModal}
        />
      );

      expect(screen.getByText('Webhook Integrations')).toBeDefined();
      expect(screen.getByText('Contatos')).toBeDefined();
      expect(screen.getByText('Disparo em Massa')).toBeDefined();
      expect(screen.getByText('Hist. Disparos')).toBeDefined();
      expect(screen.getByText('Funis')).toBeDefined();
      expect(screen.getByText('Guia')).toBeDefined();
      expect(screen.getByText('Nova Integração')).toBeDefined();

      fireEvent.click(screen.getByText('Contatos'));
      expect(onNavigateToLeads).toHaveBeenCalled();

      fireEvent.click(screen.getByText('Nova Integração'));
      expect(onOpenNewModal).toHaveBeenCalled();
    });
  });

  describe('IntegrationsFilterBar', () => {
    it('renderiza os botões de filtro e chama callbacks de toggle', () => {
      const setFilterPlatform = vi.fn();
      const setFilterHasTriggers = vi.fn();
      const setFilterHasHistory = vi.fn();
      const onResetPage = vi.fn();

      render(
        <IntegrationsFilterBar
          integrations={[
            { id: 1, platform: 'hotmart' },
            { id: 2, platform: 'kiwify' }
          ]}
          filterPlatform=""
          setFilterPlatform={setFilterPlatform}
          filterHasTriggers={false}
          setFilterHasTriggers={setFilterHasTriggers}
          filterHasHistory={false}
          setFilterHasHistory={setFilterHasHistory}
          onResetPage={onResetPage}
        />
      );

      expect(screen.getByText('Com Gatilhos')).toBeDefined();
      expect(screen.getByText('Com Histórico')).toBeDefined();

      fireEvent.click(screen.getByText('Com Gatilhos'));
      expect(setFilterHasTriggers).toHaveBeenCalledWith(true);
      expect(onResetPage).toHaveBeenCalled();

      fireEvent.click(screen.getByText('Com Histórico'));
      expect(setFilterHasHistory).toHaveBeenCalledWith(true);
    });
  });

  describe('IntegrationsTable', () => {
    it('renderiza lista de integrações e aciona ações de editar e excluir', () => {
      const onOpenHistory = vi.fn();
      const onOpenDispatchHistory = vi.fn();
      const onOpenTestModal = vi.fn();
      const onOpenEditModal = vi.fn();
      const onOpenDeleteModal = vi.fn();

      const mockIntegrations = [
        {
          id: 101,
          name: 'Hotmart Vendas',
          platform: 'hotmart',
          custom_slug: 'hotmart-vendas',
          mappings: [{ id: 1 }],
          history_count: 42
        }
      ];

      render(
        <IntegrationsTable
          loading={false}
          filteredIntegrations={mockIntegrations}
          paginatedIntegrations={mockIntegrations}
          listPageSize={5}
          setListPageSize={vi.fn()}
          listCurrentPage={1}
          setListCurrentPage={vi.fn()}
          safePage={1}
          totalPages={1}
          filterPlatform=""
          totalIntegrationsCount={1}
          onOpenHistory={onOpenHistory}
          onOpenDispatchHistory={onOpenDispatchHistory}
          onOpenTestModal={onOpenTestModal}
          onOpenEditModal={onOpenEditModal}
          onOpenDeleteModal={onOpenDeleteModal}
        />
      );

      expect(screen.getByText('Hotmart Vendas')).toBeDefined();
      expect(screen.getByText('1 gatilhos')).toBeDefined();
      expect(screen.getByText('42')).toBeDefined();

      fireEvent.click(screen.getByText('Disparos'));
      expect(onOpenDispatchHistory).toHaveBeenCalledWith(mockIntegrations[0]);

      fireEvent.click(screen.getByRole('button', { name: /Histórico/i }));
      expect(onOpenHistory).toHaveBeenCalledWith(mockIntegrations[0]);

      fireEvent.click(screen.getByText('Testar'));
      expect(onOpenTestModal).toHaveBeenCalledWith(mockIntegrations[0]);

      fireEvent.click(screen.getByTitle('Editar'));
      expect(onOpenEditModal).toHaveBeenCalledWith(mockIntegrations[0]);

      fireEvent.click(screen.getByTitle('Excluir'));
      expect(onOpenDeleteModal).toHaveBeenCalledWith(mockIntegrations[0]);
    });
  });
});
