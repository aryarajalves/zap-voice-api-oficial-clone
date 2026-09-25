import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FunnelFiltersBar } from './components/FunnelFiltersBar';
import { FunnelEmptyState } from './components/FunnelEmptyState';
import { FunnelPagination } from './components/FunnelPagination';
import { FunnelListItem } from './components/FunnelListItem';

describe('FunnelList Componentes Modulares', () => {
  describe('FunnelFiltersBar', () => {
    it('deve alternar abas e disparar filtros de tag e busca', () => {
      const mockLogic = {
        isArchivedTab: false,
        setIsArchivedTab: vi.fn(),
        funnels: [{ id: '1', tag: 'Vendas' }, { id: '2', tag: 'Suporte' }]
      };
      const onTagFilterChange = vi.fn();
      const onSearchChange = vi.fn();
      const onClearFilters = vi.fn();

      render(
        <FunnelFiltersBar
          logic={mockLogic}
          selectedTag=""
          searchQuery="teste"
          availableTags={['Suporte', 'Vendas']}
          onTagFilterChange={onTagFilterChange}
          onSearchChange={onSearchChange}
          onClearFilters={onClearFilters}
        />
      );

      // Clicar em Arquivados
      fireEvent.click(screen.getByText('Arquivados'));
      expect(mockLogic.setIsArchivedTab).toHaveBeenCalledWith(true);
      expect(onClearFilters).toHaveBeenCalled();

      // Trocar tag no select
      const select = screen.getByTestId('funnel-tag-filter-select');
      fireEvent.change(select, { target: { value: 'Vendas' } });
      expect(onTagFilterChange).toHaveBeenCalledWith('Vendas');

      // Limpar busca pelo botão X
      const clearBtn = screen.getByTitle('Limpar busca');
      fireEvent.click(clearBtn);
      expect(onSearchChange).toHaveBeenCalledWith('');
    });
  });

  describe('FunnelEmptyState', () => {
    it('deve exibir mensagem de filtros quando houver filtro aplicado', () => {
      const onClearFilters = vi.fn();
      render(
        <FunnelEmptyState
          isFilterApplied={true}
          isArchivedTab={false}
          onClearFilters={onClearFilters}
          onCreateFunnel={vi.fn()}
        />
      );

      expect(screen.getByText('Nenhum funil encontrado com os filtros aplicados.')).toBeInTheDocument();
      fireEvent.click(screen.getByText('Limpar filtros'));
      expect(onClearFilters).toHaveBeenCalled();
    });

    it('deve exibir mensagem de nenhum funil criado e botão de criar', () => {
      const onCreateFunnel = vi.fn();
      render(
        <FunnelEmptyState
          isFilterApplied={false}
          isArchivedTab={false}
          onClearFilters={vi.fn()}
          onCreateFunnel={onCreateFunnel}
        />
      );

      expect(screen.getByText('Nenhum funil criado ainda.')).toBeInTheDocument();
      fireEvent.click(screen.getByText('Criar o primeiro'));
      expect(onCreateFunnel).toHaveBeenCalled();
    });
  });

  describe('FunnelPagination', () => {
    it('deve controlar navegação e itens por página', () => {
      const setItemsPerPage = vi.fn();
      const setCurrentPage = vi.fn();

      render(
        <FunnelPagination
          itemsPerPage={10}
          setItemsPerPage={setItemsPerPage}
          currentPage={1}
          setCurrentPage={setCurrentPage}
          totalPages={3}
        />
      );

      expect(screen.getByText('Página 1 de 3')).toBeInTheDocument();

      // Mudar itens por página
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '20' } });
      expect(setItemsPerPage).toHaveBeenCalledWith(20);
      expect(setCurrentPage).toHaveBeenCalledWith(1);
    });
  });

  describe('FunnelListItem', () => {
    it('deve renderizar badges, ações e disparar callbacks corretamente', () => {
      const mockFunnel = {
        id: 'f10',
        name: 'Funil Promocional',
        tag: 'Promo',
        is_pinned: true,
        is_archived: false,
        steps: [{ id: 's1' }],
        created_at: '2026-09-01T12:00:00Z'
      };

      const mockLogic = {
        selectedFunnelIds: ['f10'],
        selectedFunnel: null,
        toggleFunnelSelection: vi.fn(),
        setSelectedFunnel: vi.fn(),
        setIsTriggerModalOpen: vi.fn(),
        handlePinFunnel: vi.fn(),
        handleArchiveFunnel: vi.fn(),
        handleDuplicateFunnel: vi.fn(),
        handleEdit: vi.fn(),
        confirmDelete: vi.fn()
      };

      const onEditTag = vi.fn();

      render(
        <FunnelListItem
          funnel={mockFunnel}
          logic={mockLogic}
          onEditTag={onEditTag}
        />
      );

      expect(screen.getByText('Funil Promocional')).toBeInTheDocument();
      expect(screen.getByText('📌 FIXADO')).toBeInTheDocument();
      expect(screen.getByText('🏷️ Promo')).toBeInTheDocument();

      // Clicar em Disparar
      fireEvent.click(screen.getByTitle('Disparar Funil'));
      expect(mockLogic.setSelectedFunnel).toHaveBeenCalledWith(mockFunnel);
      expect(mockLogic.setIsTriggerModalOpen).toHaveBeenCalledWith(true);

      // Clicar em Etiqueta
      fireEvent.click(screen.getByTitle('Etiquetar Funil'));
      expect(onEditTag).toHaveBeenCalledWith(mockFunnel, expect.anything());

      // Clicar em Desafixar
      fireEvent.click(screen.getByTitle('Desafixar do Topo'));
      expect(mockLogic.handlePinFunnel).toHaveBeenCalledWith('f10', false);

      // Clicar em Excluir
      fireEvent.click(screen.getByTitle('Excluir'));
      expect(mockLogic.confirmDelete).toHaveBeenCalledWith('f10', expect.anything());
    });
  });
});
