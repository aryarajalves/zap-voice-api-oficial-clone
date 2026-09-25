import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FunnelList } from './FunnelList';

describe('FunnelList Component - Filtro por Etiqueta e Busca', () => {
  const mockFunnels = [
    {
      id: 'f1',
      name: 'Funil Onboarding VIP',
      tag: 'Boas-Vindas',
      is_archived: false,
      is_pinned: false,
      steps: { nodes: [{ type: 'messageNode' }] },
      created_at: '2026-09-01T10:00:00Z'
    },
    {
      id: 'f2',
      name: 'Funil de Recuperação de Carrinho',
      tag: 'Vendas',
      is_archived: false,
      is_pinned: false,
      steps: { nodes: [{ type: 'audioNode' }] },
      created_at: '2026-09-02T10:00:00Z'
    },
    {
      id: 'f3',
      name: 'Funil Black Friday Sem Tag',
      tag: null,
      is_archived: false,
      is_pinned: false,
      steps: { nodes: [{ type: 'messageNode' }] },
      created_at: '2026-09-03T10:00:00Z'
    }
  ];

  let mockLogic;

  beforeEach(() => {
    mockLogic = {
      funnels: mockFunnels,
      selectedFunnelIds: [],
      setSelectedFunnelIds: vi.fn(),
      isArchivedTab: false,
      setIsArchivedTab: vi.fn(),
      itemsPerPage: 10,
      setItemsPerPage: vi.fn(),
      currentPage: 1,
      setCurrentPage: vi.fn(),
      selectedFunnel: null,
      setSelectedFunnel: vi.fn(),
      handleCreateFunnel: vi.fn(),
      handleEdit: vi.fn(),
      confirmDelete: vi.fn(),
      handleDuplicateFunnel: vi.fn(),
      handlePinFunnel: vi.fn(),
      handleArchiveFunnel: vi.fn(),
      setFunnelForTag: vi.fn(),
      setIsTagModalOpen: vi.fn(),
      toggleFunnelSelection: vi.fn(),
    };
  });

  it('deve renderizar todos os funis quando nenhuma etiqueta estiver selecionada', () => {
    render(<FunnelList logic={mockLogic} />);

    expect(screen.getByText('Funil Onboarding VIP')).toBeInTheDocument();
    expect(screen.getByText('Funil de Recuperação de Carrinho')).toBeInTheDocument();
    expect(screen.getByText('Funil Black Friday Sem Tag')).toBeInTheDocument();

    const tagSelect = screen.getByTestId('funnel-tag-filter-select');
    expect(tagSelect).toBeInTheDocument();
    expect(tagSelect.value).toBe('');
  });

  it('deve filtrar funis pela etiqueta selecionada no dropdown', () => {
    render(<FunnelList logic={mockLogic} />);

    const tagSelect = screen.getByTestId('funnel-tag-filter-select');
    fireEvent.change(tagSelect, { target: { value: 'Boas-Vindas' } });

    expect(screen.getByText('Funil Onboarding VIP')).toBeInTheDocument();
    expect(screen.queryByText('Funil de Recuperação de Carrinho')).not.toBeInTheDocument();
    expect(screen.queryByText('Funil Black Friday Sem Tag')).not.toBeInTheDocument();
    expect(screen.getByText('1 resultado(s)')).toBeInTheDocument();
    expect(mockLogic.setCurrentPage).toHaveBeenCalledWith(1);
  });

  it('deve filtrar funis sem etiqueta quando a opção "Sem etiqueta" for escolhida', () => {
    render(<FunnelList logic={mockLogic} />);

    const tagSelect = screen.getByTestId('funnel-tag-filter-select');
    fireEvent.change(tagSelect, { target: { value: '__no_tag__' } });

    expect(screen.queryByText('Funil Onboarding VIP')).not.toBeInTheDocument();
    expect(screen.queryByText('Funil de Recuperação de Carrinho')).not.toBeInTheDocument();
    expect(screen.getByText('Funil Black Friday Sem Tag')).toBeInTheDocument();
    expect(screen.getByText('1 resultado(s)')).toBeInTheDocument();
  });

  it('deve filtrar pelo campo de busca por nome do funil', () => {
    render(<FunnelList logic={mockLogic} />);

    const searchInput = screen.getByTestId('funnel-search-input');
    fireEvent.change(searchInput, { target: { value: 'recuperação' } });

    expect(screen.queryByText('Funil Onboarding VIP')).not.toBeInTheDocument();
    expect(screen.getByText('Funil de Recuperação de Carrinho')).toBeInTheDocument();
    expect(screen.queryByText('Funil Black Friday Sem Tag')).not.toBeInTheDocument();
  });

  it('deve exibir mensagem e botão de limpar filtros quando nenhum funil corresponder', () => {
    render(<FunnelList logic={mockLogic} />);

    const searchInput = screen.getByTestId('funnel-search-input');
    fireEvent.change(searchInput, { target: { value: 'termo-inexistente-xyz' } });

    expect(screen.getByText('Nenhum funil encontrado com os filtros aplicados.')).toBeInTheDocument();
    const clearButton = screen.getByText('Limpar filtros');
    expect(clearButton).toBeInTheDocument();

    fireEvent.click(clearButton);
    expect(screen.getByText('Funil Onboarding VIP')).toBeInTheDocument();
  });

  it('deve selecionar apenas os funis filtrados quando clicar no checkbox de selecionar todos', () => {
    render(<FunnelList logic={mockLogic} />);

    const tagSelect = screen.getByTestId('funnel-tag-filter-select');
    fireEvent.change(tagSelect, { target: { value: 'Vendas' } });

    const selectAllCheckbox = screen.getByTestId('funnel-select-all-checkbox');
    fireEvent.click(selectAllCheckbox);

    expect(mockLogic.setSelectedFunnelIds).toHaveBeenCalled();
  });
});
