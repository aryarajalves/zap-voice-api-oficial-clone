import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import InternalTagsInput from './InternalTagsInput';

describe('InternalTagsInput Component', () => {
  const existingTags = ['lead_quente', 'lead_frio', 'vip', 'cliente_recorrente'];
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar o placeholder quando não houver tags', () => {
    render(
      <InternalTagsInput
        value=""
        onChange={mockOnChange}
        existingTags={existingTags}
        placeholder="Digite uma tag..."
      />
    );

    expect(screen.getByPlaceholderText('Digite uma tag...')).toBeInTheDocument();
  });

  it('deve renderizar as tags existentes no topo', () => {
    render(
      <InternalTagsInput
        value="vip, lead_quente"
        onChange={mockOnChange}
        existingTags={existingTags}
      />
    );

    expect(screen.getByText('vip')).toBeInTheDocument();
    expect(screen.getByText('lead_quente')).toBeInTheDocument();
  });

  it('deve chamar onChange ao digitar uma tag e pressionar Enter', () => {
    render(
      <InternalTagsInput
        value="vip"
        onChange={mockOnChange}
        existingTags={existingTags}
      />
    );

    const input = screen.getByPlaceholderText('Adicione outra tag...');
    fireEvent.change(input, { target: { value: 'lead_novo' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(mockOnChange).toHaveBeenCalledWith('vip, lead_novo');
  });

  it('deve remover a tag quando o botão de fechar for clicado', () => {
    render(
      <InternalTagsInput
        value="vip, lead_quente"
        onChange={mockOnChange}
        existingTags={existingTags}
      />
    );

    const removeButtons = screen.getAllByRole('button');
    // Clica no botão de remover da tag 'vip' (primeiro botão)
    fireEvent.click(removeButtons[0]);

    expect(mockOnChange).toHaveBeenCalledWith('lead_quente');
  });

  it('deve abrir o dropdown de tags existentes ao focar no input', () => {
    render(
      <InternalTagsInput
        value="vip"
        onChange={mockOnChange}
        existingTags={existingTags}
      />
    );

    const input = screen.getByPlaceholderText('Adicione outra tag...');
    fireEvent.focus(input);

    // O dropdown deve mostrar as tags existentes não selecionadas (lead_quente, lead_frio, cliente_recorrente)
    expect(screen.getByText('Tags Existentes')).toBeInTheDocument();
    expect(screen.getByText('lead_quente')).toBeInTheDocument();
    expect(screen.getByText('lead_frio')).toBeInTheDocument();
    expect(screen.getByText('cliente_recorrente')).toBeInTheDocument();
    
    // Não deve mostrar 'vip' pois já está selecionado
    expect(screen.queryByText('vip', { selector: 'div' })).not.toBeInTheDocument();
  });
});
