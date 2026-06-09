import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { FiMessageSquare } from 'react-icons/fi';
import NodeHeader from './NodeHeader';

describe('NodeHeader Component', () => {
  const defaultProps = {
    label: 'Mensagem',
    icon: FiMessageSquare,
    colorClass: 'bg-blue-100 text-blue-600',
    onDelete: vi.fn(),
    isStart: false,
    onSetStart: vi.fn(),
    onDuplicate: vi.fn()
  };

  it('deve renderizar o título do nó e o botão de ajuda', () => {
    render(<NodeHeader {...defaultProps} />);
    expect(screen.getByText('Mensagem')).toBeInTheDocument();
    
    const helpBtn = screen.getByTitle('Como funciona?');
    expect(helpBtn).toBeInTheDocument();
  });

  it('deve abrir o modal explicativo ao clicar no botão de ajuda e fechar ao clicar em fechar ou entendi', () => {
    render(<NodeHeader {...defaultProps} />);
    
    // Clicar no botão de ajuda
    const helpBtn = screen.getByTitle('Como funciona?');
    fireEvent.click(helpBtn);
    
    // Verificar se o modal foi aberto
    expect(screen.getByText('Nó: Mensagem')).toBeInTheDocument();
    expect(screen.getByText('O que faz?')).toBeInTheDocument();
    expect(screen.getByText('Envia uma mensagem de texto simples ou com variações. Suporta múltiplos botões interativos e restrição de envio em horário comercial.')).toBeInTheDocument();
    
    // Clicar em "Entendi" para fechar
    const closeBtn = screen.getByText('Entendi');
    fireEvent.click(closeBtn);
    
    // Verificar se o modal foi fechado
    expect(screen.queryByText('Nó: Mensagem')).not.toBeInTheDocument();
  });
});
