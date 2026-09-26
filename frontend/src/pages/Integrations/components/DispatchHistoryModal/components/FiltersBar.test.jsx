import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import FiltersBar from './FiltersBar';
import AdvancedFiltersPanel from './AdvancedFiltersPanel';

describe('FiltersBar & AdvancedFiltersPanel Components', () => {
  const defaultProps = {
    dispatchSearch: '',
    setDispatchSearch: vi.fn(),
    dispatchHistory: [
      { event_type: 'compra_aprovada' },
      { event_type: 'carrinho_abandonado' }
    ],
    dispatchEventFilter: '',
    setDispatchEventFilter: vi.fn(),
    setDispatchPage: vi.fn(),
    dispatchTypeFilter: '',
    setDispatchTypeFilter: vi.fn(),
    dispatchStatusFilter: '',
    setDispatchStatusFilter: vi.fn(),
    dispatchStartDate: '',
    setDispatchStartDate: vi.fn(),
    dispatchEndDate: '',
    setDispatchEndDate: vi.fn(),
    fetchDispatches: vi.fn(),
    integrationId: 10,
    dispatchLimit: 20,
    dispatchTemplateFilter: '',
    setDispatchTemplateFilter: vi.fn(),
    distinctTemplates: ['template_boas_vindas', 'template_recuperacao']
  };

  it('renderiza os elementos principais da barra básica e não exibe o painel avançado inicialmente', () => {
    render(<FiltersBar {...defaultProps} />);

    expect(screen.getByPlaceholderText('Buscar por telefone ou nome...')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Filtros Avançados/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Limpar/i })).toBeInTheDocument();

    // Painel avançado não deve estar visível
    expect(screen.queryByTestId('advanced-filters-panel')).not.toBeInTheDocument();
  });

  it('abre o painel de filtros avançados ao clicar no botão Filtros Avançados', () => {
    render(<FiltersBar {...defaultProps} />);

    const advancedBtn = screen.getByRole('button', { name: /Filtros Avançados/i });
    fireEvent.click(advancedBtn);

    // Painel avançado agora deve estar visível
    expect(screen.getByTestId('advanced-filters-panel')).toBeInTheDocument();
    expect(screen.getByText('Evento')).toBeInTheDocument();
    expect(screen.getByText('Tipo')).toBeInTheDocument();
    expect(screen.getByText('Template')).toBeInTheDocument();
    expect(screen.getByText('Desde')).toBeInTheDocument();
    expect(screen.getByText('Até')).toBeInTheDocument();
  });

  it('fecha o painel ao clicar novamente no botão Filtros Avançados', () => {
    render(<FiltersBar {...defaultProps} />);

    const advancedBtn = screen.getByRole('button', { name: /Filtros Avançados/i });
    // Abrir
    fireEvent.click(advancedBtn);
    expect(screen.getByTestId('advanced-filters-panel')).toBeInTheDocument();

    // Fechar
    fireEvent.click(advancedBtn);
    expect(screen.queryByTestId('advanced-filters-panel')).not.toBeInTheDocument();
  });

  it('exibe badge com contagem de filtros avançados ativos', () => {
    render(
      <FiltersBar
        {...defaultProps}
        dispatchEventFilter="compra_aprovada"
        dispatchStartDate="2026-09-01"
      />
    );

    // 2 filtros ativos
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('chama setDispatchSearch com string vazia ao clicar no botão X de limpar busca', () => {
    const setDispatchSearchMock = vi.fn();
    render(
      <FiltersBar
        {...defaultProps}
        dispatchSearch="5511999999999"
        setDispatchSearch={setDispatchSearchMock}
      />
    );

    const clearSearchBtn = screen.getByTitle('Limpar busca');
    fireEvent.click(clearSearchBtn);
    expect(setDispatchSearchMock).toHaveBeenCalledWith('');
  });

  it('chama os setters e fetchDispatches ao clicar no botão Limpar principal', () => {
    const fetchDispatchesMock = vi.fn();
    const setPageMock = vi.fn();
    const setSearchMock = vi.fn();

    render(
      <FiltersBar
        {...defaultProps}
        dispatchSearch="teste"
        setDispatchSearch={setSearchMock}
        setDispatchPage={setPageMock}
        fetchDispatches={fetchDispatchesMock}
      />
    );

    const clearBtn = screen.getByTitle('Limpar todos os filtros e resetar busca');
    fireEvent.click(clearBtn);

    expect(setSearchMock).toHaveBeenCalledWith('');
    expect(setPageMock).toHaveBeenCalledWith(1);
    expect(fetchDispatchesMock).toHaveBeenCalledWith(10, 1, 20, '', '', '', '', '', '', '', '');
  });

  it('chama onClearAdvanced ao clicar no botão Limpar avançados dentro do painel', () => {
    const onClearAdvancedMock = vi.fn();

    render(
      <AdvancedFiltersPanel
        dispatchEventFilter="compra_aprovada"
        setDispatchEventFilter={vi.fn()}
        dispatchTypeFilter=""
        setDispatchTypeFilter={vi.fn()}
        dispatchTemplateFilter=""
        setDispatchTemplateFilter={vi.fn()}
        dispatchStartDate="2026-09-01"
        setDispatchStartDate={vi.fn()}
        dispatchEndDate=""
        setDispatchEndDate={vi.fn()}
        setDispatchPage={vi.fn()}
        distinctTemplates={['template_1']}
        dispatchHistory={[]}
        activeAdvancedCount={2}
        onClearAdvanced={onClearAdvancedMock}
      />
    );

    const clearAdvancedBtn = screen.getByRole('button', { name: /Limpar avançados/i });
    fireEvent.click(clearAdvancedBtn);
    expect(onClearAdvancedMock).toHaveBeenCalledTimes(1);
  });
});
