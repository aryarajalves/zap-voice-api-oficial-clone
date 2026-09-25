import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CreateLabelModal from './CreateLabelModal';

describe('CreateLabelModal Component Unit Tests', () => {
  it('não renderiza nada quando isOpen for false', () => {
    const { container } = render(
      <CreateLabelModal
        isOpen={false}
        tagName="teste"
        tagColor="#3B82F6"
        targetCategory="chat"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        onChangeName={vi.fn()}
        onChangeColor={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renderiza corretamente o modal com título, input, contador de 25 caracteres e cores', () => {
    render(
      <CreateLabelModal
        isOpen={true}
        tagName="etiqueta-vip"
        tagColor="#10B981"
        targetCategory="chat"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        onChangeName={vi.fn()}
        onChangeColor={vi.fn()}
      />
    );

    expect(screen.getByText('Criar Nova Etiqueta')).toBeDefined();
    expect(screen.getByText('Etiqueta para conversas no Chat')).toBeDefined();
    expect(screen.getByDisplayValue('etiqueta-vip')).toBeDefined();
    expect(screen.getByText('12/25 caracteres')).toBeDefined();
    expect(screen.getByText('Selecione a Cor da Etiqueta')).toBeDefined();
    expect(screen.getByText('Pré-visualização:')).toBeDefined();
    expect(screen.getByText('etiqueta-vip')).toBeDefined();
    expect(screen.getByRole('button', { name: /^Criar e Selecionar$/i })).toBeDefined();
  });

  it('permite alterar nome respeitando o limite de 25 caracteres', () => {
    const onChangeName = vi.fn();
    render(
      <CreateLabelModal
        isOpen={true}
        tagName="nome"
        tagColor="#3B82F6"
        targetCategory="chat"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        onChangeName={onChangeName}
        onChangeColor={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText('Digite o nome da etiqueta...');
    expect(input.getAttribute('maxlength')).toBe('25');

    fireEvent.change(input, { target: { value: 'nome-longo-com-mais-de-25-caracteres-bloqueado' } });
    expect(onChangeName).toHaveBeenCalledWith('nome-longo-com-mais-de-25');
  });

  it('permite selecionar cor predefinida ao clicar nos botões da paleta', () => {
    const onChangeColor = vi.fn();
    render(
      <CreateLabelModal
        isOpen={true}
        tagName="etiqueta"
        tagColor="#3B82F6"
        targetCategory="chat"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        onChangeName={vi.fn()}
        onChangeColor={onChangeColor}
      />
    );

    const emeraldColorBtn = screen.getByTitle('Esmeralda');
    expect(emeraldColorBtn).toBeDefined();
    fireEvent.click(emeraldColorBtn);
    expect(onChangeColor).toHaveBeenCalledWith('#059669');
  });

  it('chama onConfirm ao clicar em Criar e Selecionar', () => {
    const onConfirm = vi.fn();
    render(
      <CreateLabelModal
        isOpen={true}
        tagName="nova-tag"
        tagColor="#3B82F6"
        targetCategory="chat"
        onClose={vi.fn()}
        onConfirm={onConfirm}
        onChangeName={vi.fn()}
        onChangeColor={vi.fn()}
      />
    );

    const confirmBtn = screen.getByRole('button', { name: /^Criar e Selecionar$/i });
    expect(confirmBtn.hasAttribute('disabled')).toBe(false);
    fireEvent.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalled();
  });

  it('desabilita o botão se o nome for vazio ou composto apenas por espaços', () => {
    const onConfirm = vi.fn();
    render(
      <CreateLabelModal
        isOpen={true}
        tagName="   "
        tagColor="#3B82F6"
        targetCategory="chat"
        onClose={vi.fn()}
        onConfirm={onConfirm}
        onChangeName={vi.fn()}
        onChangeColor={vi.fn()}
      />
    );

    const confirmBtn = screen.getByRole('button', { name: /^Criar e Selecionar$/i });
    expect(confirmBtn.hasAttribute('disabled')).toBe(true);
  });

  it('chama onClose ao clicar em Cancelar ou no botão X', () => {
    const onClose = vi.fn();
    render(
      <CreateLabelModal
        isOpen={true}
        tagName="tag"
        tagColor="#3B82F6"
        targetCategory="chat"
        onClose={onClose}
        onConfirm={vi.fn()}
        onChangeName={vi.fn()}
        onChangeColor={vi.fn()}
      />
    );

    const cancelBtn = screen.getByRole('button', { name: /Cancelar/i });
    fireEvent.click(cancelBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
