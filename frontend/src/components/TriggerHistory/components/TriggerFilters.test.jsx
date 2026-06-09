import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import TriggerFilters from './TriggerFilters';

describe('TriggerFilters Component', () => {
  const defaultProps = {
    filterName: '',
    setFilterName: vi.fn(),
    dateRange: 'all',
    setDateRange: vi.fn(),
    filterStatus: 'all',
    setFilterStatus: vi.fn(),
    triggerType: 'all',
    setTriggerType: vi.fn(),
    customStart: '',
    setCustomStart: vi.fn(),
    customEnd: '',
    setCustomEnd: vi.fn(),
    itemsPerPage: 10,
    setItemsPerPage: vi.fn(),
    fetchHistory: vi.fn(),
    setPage: vi.fn()
  };

  it('deve renderizar campos de busca, ordenação e filtros padrão', () => {
    render(<TriggerFilters {...defaultProps} />);
    expect(screen.getByPlaceholderText('Buscar por funil...')).toBeInTheDocument();
    expect(screen.getByText('Todo o período')).toBeInTheDocument();
    expect(screen.getByText('Todos os status')).toBeInTheDocument();
  });

  it('deve chamar onNavigateToBulk quando botão "Disparo em Massa" for clicado', () => {
    const onNavigateToBulk = vi.fn();
    render(<TriggerFilters {...defaultProps} onNavigateToBulk={onNavigateToBulk} />);
    
    const bulkBtn = screen.getByText('Disparo em Massa');
    expect(bulkBtn).toBeInTheDocument();
    fireEvent.click(bulkBtn);
    expect(onNavigateToBulk).toHaveBeenCalledTimes(1);
  });

  it('deve renderizar o botão de Funis ao lado e disparar o callback ao ser clicado', () => {
    const onNavigateToFunnels = vi.fn();
    render(<TriggerFilters {...defaultProps} onNavigateToFunnels={onNavigateToFunnels} />);
    
    const funnelsBtn = screen.getByText('Funis');
    expect(funnelsBtn).toBeInTheDocument();
    fireEvent.click(funnelsBtn);
    expect(onNavigateToFunnels).toHaveBeenCalledTimes(1);
  });
});
