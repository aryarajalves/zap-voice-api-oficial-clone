import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import SearchableSelect from './SearchableSelect';

describe('SearchableSelect with Tags Filtering', () => {
  const options = [
    { value: 't1', label: 'Template One', tags: ['finance', 'support'] },
    { value: 't2', label: 'Template Two', tags: ['support'] },
    { value: 't3', label: 'Template Three', tags: ['marketing'] },
  ];

  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar o placeholder e abrir o menu ao ser clicado', () => {
    render(
      <SearchableSelect
        options={options}
        value=""
        onChange={mockOnChange}
        placeholder="Selecione um Template..."
      />
    );

    expect(screen.getByText('Selecione um Template...')).toBeInTheDocument();
    
    // Abre o dropdown
    fireEvent.click(screen.getByText('Selecione um Template...'));
    
    // Deve mostrar as opções e os botões de tag
    expect(screen.getByPlaceholderText('Digite para buscar...')).toBeInTheDocument();
    expect(screen.getByText('Todos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'finance' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'support' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'marketing' })).toBeInTheDocument();
  });

  it('deve filtrar as opções ao clicar em uma tag', () => {
    render(
      <SearchableSelect
        options={options}
        value=""
        onChange={mockOnChange}
        placeholder="Selecione um Template..."
      />
    );

    // Abre o dropdown
    fireEvent.click(screen.getByText('Selecione um Template...'));

    // Clica na tag 'marketing'
    fireEvent.click(screen.getByRole('button', { name: 'marketing' }));

    // Apenas 'Template Three' deve estar visível
    expect(screen.getByText('Template Three')).toBeInTheDocument();
    expect(screen.queryByText('Template One')).not.toBeInTheDocument();
    expect(screen.queryByText('Template Two')).not.toBeInTheDocument();
  });

  it('deve chamar onChange com o valor correto ao selecionar uma opção', () => {
    render(
      <SearchableSelect
        options={options}
        value=""
        onChange={mockOnChange}
        placeholder="Selecione um Template..."
      />
    );

    // Abre o dropdown
    fireEvent.click(screen.getByText('Selecione um Template...'));

    // Clica na opção 'Template Two'
    fireEvent.click(screen.getByText('Template Two'));

    expect(mockOnChange).toHaveBeenCalledWith('t2');
  });

  it('deve ordenar opções pinadas no topo', () => {
    const testOptions = [
      { value: 'u1', label: 'Unpinned One', is_pinned: false },
      { value: 'p1', label: 'Pinned One', is_pinned: true },
      { value: 'u2', label: 'Unpinned Two', is_pinned: false },
      { value: 'p2', label: 'Pinned Two', is_pinned: true }
    ];

    render(
      <SearchableSelect
        options={testOptions}
        value=""
        onChange={mockOnChange}
        placeholder="Selecione um Template..."
      />
    );

    // Abre o dropdown
    fireEvent.click(screen.getByText('Selecione um Template...'));

    const items = screen.getAllByText(/Pinned|Unpinned/);
    // Deve renderizar na ordem: Pinned One, Pinned Two, Unpinned One, Unpinned Two
    expect(items[0].textContent).toContain('Pinned One');
    expect(items[1].textContent).toContain('Pinned Two');
    expect(items[2].textContent).toContain('Unpinned One');
    expect(items[3].textContent).toContain('Unpinned Two');
  });
});
