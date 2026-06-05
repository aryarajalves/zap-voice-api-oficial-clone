import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import ContextMenu from './ContextMenu';

vi.mock('react-icons/fi', () => ({
  FiMessageSquare: () => <span data-testid="icon-message" />,
  FiImage: () => <span data-testid="icon-image" />,
  FiMic: () => <span data-testid="icon-mic" />,
  FiClock: () => <span data-testid="icon-clock" />,
  FiCpu: () => <span data-testid="icon-cpu" />,
  FiShuffle: () => <span data-testid="icon-shuffle" />,
  FiLink: () => <span data-testid="icon-link" />,
  FiTag: () => <span data-testid="icon-tag" />,
  FiUser: () => <span data-testid="icon-user" />,
  FiCalendar: () => <span data-testid="icon-calendar" />,
  FiGlobe: () => <span data-testid="icon-globe" />,
}));

const defaultProps = {
  top: 100,
  left: 200,
  onClose: vi.fn(),
  onAddNode: vi.fn(),
};

describe('ContextMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza o título Adicionar Nó', () => {
    render(<ContextMenu {...defaultProps} />);
    expect(screen.getByText('Adicionar Nó')).toBeInTheDocument();
  });

  it('chama onAddNode com o tipo correto ao clicar nos botões', () => {
    render(<ContextMenu {...defaultProps} />);
    
    const messageButton = screen.getByText('Mensagem');
    fireEvent.click(messageButton);
    expect(defaultProps.onAddNode).toHaveBeenCalledWith('messageNode');
    
    const mediaButton = screen.getByText('Mídia');
    fireEvent.click(mediaButton);
    expect(defaultProps.onAddNode).toHaveBeenCalledWith('mediaNode');

    const audioButton = screen.getByText('Áudio');
    fireEvent.click(audioButton);
    expect(defaultProps.onAddNode).toHaveBeenCalledWith('audioNode');

    const httpButton = screen.getByText('Requisição HTTP (Webhook)');
    fireEvent.click(httpButton);
    expect(defaultProps.onAddNode).toHaveBeenCalledWith('httpRequestNode');
  });

  it('chama onClose ao sair com o mouse (onMouseLeave)', () => {
    const { container } = render(<ContextMenu {...defaultProps} />);
    const menuDiv = container.firstChild;
    fireEvent.mouseLeave(menuDiv);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });
});
