import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SearchableSelect from '../SearchableSelect';

describe('SearchableSelect - Criar Nova Etiqueta Personalizada', () => {
  it('deve permitir a criação e seleção imediata de uma etiqueta que ainda não existe', () => {
    const handleChange = vi.fn();
    const options = [
      { value: 'suuporte acesso', label: 'suuporte acesso' }
    ];

    const { rerender } = render(
      <SearchableSelect
        options={options}
        value={[]}
        onChange={handleChange}
        placeholder="Adicione etiquetas..."
        isMulti={true}
      />
    );

    // Abrir o seletor
    const container = screen.getByText('Adicione etiquetas...');
    fireEvent.click(container);

    // Digitar termo que não existe na lista
    const searchInput = screen.getByPlaceholderText('Digite para buscar...');
    fireEvent.change(searchInput, { target: { value: 'teste_hoje' } });

    // Clicar no botão "+ Criar etiqueta: teste_hoje"
    const createBtn = screen.getByText(/Criar etiqueta:/i);
    fireEvent.click(createBtn);

    // Verificar se onChange foi disparado com o novo valor ["teste_hoje"]
    expect(handleChange).toHaveBeenCalledWith(['teste_hoje']);

    // Rerender com a nova prop value contendo "teste_hoje"
    rerender(
      <SearchableSelect
        options={options}
        value={['teste_hoje']}
        onChange={handleChange}
        placeholder="Adicione etiquetas..."
        isMulti={true}
      />
    );

    // Deve exibir a badge da nova etiqueta "teste_hoje" na interface
    expect(screen.getByText('teste_hoje')).toBeDefined();
  });

  it('não deve exibir botão de criar etiqueta se o termo já existir em options com casing diferente', () => {
    const handleChange = vi.fn();
    const options = [
      { value: 'compra_aprovada_bussula', label: 'compra_aprovada_bussula' }
    ];

    render(
      <SearchableSelect
        options={options}
        value={[]}
        onChange={handleChange}
        placeholder="Adicione etiquetas..."
        isMulti={true}
      />
    );

    fireEvent.click(screen.getByText('Adicione etiquetas...'));
    const searchInput = screen.getByPlaceholderText('Digite para buscar...');
    fireEvent.change(searchInput, { target: { value: 'Compra_Aprovada_Bussula' } });

    // O botão Criar etiqueta NÃO deve existir
    expect(screen.queryByText(/Criar etiqueta:/i)).not.toBeInTheDocument();
  });

  it('não deve exibir botão de criar etiqueta se ela já estiver selecionada em value', () => {
    const handleChange = vi.fn();
    const options = [];

    render(
      <SearchableSelect
        options={options}
        value={['minha_tag']}
        onChange={handleChange}
        placeholder="Adicione etiquetas..."
        isMulti={true}
      />
    );

    fireEvent.click(screen.getByText('minha_tag'));
    const searchInput = screen.getByPlaceholderText('Digite para buscar...');
    fireEvent.change(searchInput, { target: { value: 'Minha_Tag' } });

    expect(screen.queryByText(/Criar etiqueta:/i)).not.toBeInTheDocument();
  });

  it('deve deduplicar opções repetidas ou com casing/espaços diferentes na listagem', () => {
    const handleChange = vi.fn();
    const duplicateOptions = [
      { value: 'compra_aprovada_bussula', label: 'compra_aprovada_bussula' },
      { value: 'Compra_Aprovada_Bussula', label: 'Compra_Aprovada_Bussula' },
      { value: ' compra_aprovada_bussula ', label: ' compra_aprovada_bussula ' }
    ];

    render(
      <SearchableSelect
        options={duplicateOptions}
        value={[]}
        onChange={handleChange}
        placeholder="Adicione etiquetas..."
        isMulti={true}
      />
    );

    fireEvent.click(screen.getByText('Adicione etiquetas...'));
    // Deve haver exatamente 1 item no dropdown
    const items = screen.getAllByText('compra_aprovada_bussula');
    expect(items.length).toBe(1);
  });
});
