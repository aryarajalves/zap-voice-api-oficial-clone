import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import MaximizedInputModal from './MaximizedInputModal';

vi.mock('react-icons/fi', () => ({
  FiX: () => <span data-testid="icon-x" />,
  FiSend: () => <span data-testid="icon-send" />,
  FiMaximize2: () => <span data-testid="icon-maximize" />,
  FiRefreshCw: () => <span data-testid="icon-refresh" />,
}));

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  value: 'Olá\nTudo bem?',
  onChange: vi.fn(),
  onSend: vi.fn(),
  isSending: false,
  contactName: 'Neidivaldo Cabral',
};

describe('MaximizedInputModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('não renderiza quando isOpen=false', () => {
    render(<MaximizedInputModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText(/Responder para Neidivaldo Cabral/i)).not.toBeInTheDocument();
  });

  it('renderiza quando isOpen=true', () => {
    render(<MaximizedInputModal {...defaultProps} />);
    expect(screen.getByText(/Responder para Neidivaldo Cabral/i)).toBeInTheDocument();
    expect(screen.getByText('Enviar quebrando linhas (mensagens separadas)')).toBeInTheDocument();
  });

  it('chama onChange quando o texto é alterado', () => {
    const onChange = vi.fn();
    render(<MaximizedInputModal {...defaultProps} onChange={onChange} />);
    const textarea = screen.getByPlaceholderText('Digite ou cole sua resposta aqui...');
    fireEvent.change(textarea, { target: { value: 'Novo texto' } });
    expect(onChange).toHaveBeenCalledWith('Novo texto');
  });

  it('chama onSend com splitLines=false por padrão', () => {
    const onSend = vi.fn();
    render(<MaximizedInputModal {...defaultProps} onSend={onSend} />);
    fireEvent.click(screen.getByRole('button', { name: /Enviar Resposta/i }));
    expect(onSend).toHaveBeenCalledWith(expect.any(Object), { splitLines: false });
  });

  it('chama onSend com splitLines=true quando ativado', () => {
    const onSend = vi.fn();
    render(<MaximizedInputModal {...defaultProps} onSend={onSend} />);
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    fireEvent.click(screen.getByRole('button', { name: /Enviar Resposta/i }));
    expect(onSend).toHaveBeenCalledWith(expect.any(Object), { splitLines: true });
    expect(localStorage.getItem('zapvoice_split_lines')).toBe('true');
  });
});
