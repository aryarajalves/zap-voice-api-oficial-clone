import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import Filters from './Filters';

const defaultProps = {
  search: '',
  setSearch: vi.fn(),
  selectedTags: [],
  setSelectedTags: vi.fn(),
  availableFilters: {
    tags: ['abandonou-carrinho', 'leads-marco-maio', 'vip', 'cliente-ativo', 'newsletter']
  },
  total: 42,
  datePreset: '',
  setDatePreset: vi.fn(),
  customDateFrom: '',
  setCustomDateFrom: vi.fn(),
  customDateTo: '',
  setCustomDateTo: vi.fn(),
  handleClearDateFilters: vi.fn(),
};

describe('Filters — Dropdown de Etiquetas com Busca', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza o botão "Todas as Etiquetas" por padrão', () => {
    render(<Filters {...defaultProps} />);
    expect(screen.getByText('Todas as Etiquetas')).toBeDefined();
  });

  it('abre o dropdown e mostra campo de busca ao clicar no botão de etiquetas', async () => {
    render(<Filters {...defaultProps} />);
    const btn = document.getElementById('contacts-tag-filter-btn');
    fireEvent.click(btn);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Buscar etiqueta...')).toBeDefined();
    });
  });

  it('filtra as etiquetas conforme o usuário digita', async () => {
    render(<Filters {...defaultProps} />);
    fireEvent.click(document.getElementById('contacts-tag-filter-btn'));

    const input = await screen.findByPlaceholderText('Buscar etiqueta...');
    fireEvent.change(input, { target: { value: 'vip' } });

    // Deve mostrar apenas "vip"
    await waitFor(() => {
      expect(screen.getByText('vip')).toBeDefined();
    });
    // Etiquetas que não batem com a busca não devem aparecer
    expect(screen.queryByText('leads-marco-maio')).toBeNull();
    expect(screen.queryByText('newsletter')).toBeNull();
  });

  it('exibe mensagem "Nenhuma etiqueta encontrada" quando a busca não tem resultado', async () => {
    render(<Filters {...defaultProps} />);
    fireEvent.click(document.getElementById('contacts-tag-filter-btn'));

    const input = await screen.findByPlaceholderText('Buscar etiqueta...');
    fireEvent.change(input, { target: { value: 'xyzxyzxyz' } });

    await waitFor(() => {
      expect(screen.getByText('Nenhuma etiqueta encontrada')).toBeDefined();
    });
  });

  it('chama setSelectedTags com toggle ao selecionar uma etiqueta', async () => {
    const setSelectedTags = vi.fn();
    render(<Filters {...defaultProps} setSelectedTags={setSelectedTags} />);

    fireEvent.click(document.getElementById('contacts-tag-filter-btn'));
    const tagBtn = await screen.findByText('vip');
    fireEvent.click(tagBtn);

    // Como o toggle de setSelectedTags é uma função de callback (setSelectedTags(prev => ...)),
    // vamos testar se setSelectedTags foi chamada com uma função.
    expect(setSelectedTags).toHaveBeenCalled();
    const callback = setSelectedTags.mock.calls[0][0];
    // Executa a função callback simulando a lista anterior
    expect(callback([])).toEqual(['vip']);
    expect(callback(['vip'])).toEqual([]);
    expect(callback(['newsletter'])).toEqual(['newsletter', 'vip']);
  });

  it('chama setSelectedTags com vazio ao clicar em "Todas as Etiquetas"', async () => {
    const setSelectedTags = vi.fn();
    render(<Filters {...defaultProps} selectedTags={['vip']} setSelectedTags={setSelectedTags} />);

    fireEvent.click(document.getElementById('contacts-tag-filter-btn'));

    const allBtn = document.getElementById('contacts-tag-option-all');
    fireEvent.click(allBtn);

    expect(setSelectedTags).toHaveBeenCalledWith([]);
  });

  it('exibe a etiqueta selecionada no botão quando uma está ativa', () => {
    render(<Filters {...defaultProps} selectedTags={['vip']} />);
    const btn = document.getElementById('contacts-tag-filter-btn');
    expect(btn.textContent).toContain('vip');
  });

  it('exibe o formato de contagem quando mais de uma etiqueta está ativa', () => {
    render(<Filters {...defaultProps} selectedTags={['vip', 'cliente-ativo', 'newsletter']} />);
    const btn = document.getElementById('contacts-tag-filter-btn');
    expect(btn.textContent).toContain('vip +2');
  });

  it('botão de etiqueta fica roxo quando pelo menos uma etiqueta está selecionada', () => {
    render(<Filters {...defaultProps} selectedTags={['newsletter']} />);
    const btn = document.getElementById('contacts-tag-filter-btn');
    expect(btn.className).toContain('bg-purple-600');
  });
});
