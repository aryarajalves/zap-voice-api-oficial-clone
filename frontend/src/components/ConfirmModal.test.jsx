import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import ConfirmModal from './ConfirmModal';

vi.mock('react-icons/fi', () => ({
  FiAlertCircle: () => <span data-testid="icon-alert-circle" />,
  FiAlertTriangle: () => <span data-testid="icon-alert-triangle" />,
  FiX: () => <span data-testid="icon-x" />,
}));

vi.mock('../hooks/useScrollLock', () => ({ default: vi.fn() }));

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onConfirm: vi.fn(),
  title: 'Confirmar Ação',
  message: 'Tem certeza que deseja continuar?',
};

describe('ConfirmModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('não renderiza quando isOpen=false', () => {
    render(<ConfirmModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Confirmar Ação')).not.toBeInTheDocument();
  });

  it('renderiza quando isOpen=true', () => {
    render(<ConfirmModal {...defaultProps} />);
    expect(screen.getByText('Confirmar Ação')).toBeInTheDocument();
    expect(screen.getByText('Tem certeza que deseja continuar?')).toBeInTheDocument();
  });

  it('exibe texto padrão dos botões', () => {
    render(<ConfirmModal {...defaultProps} />);
    expect(screen.getByRole('button', { name: /confirmar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
  });

  it('respeita confirmText e cancelText customizados', () => {
    render(<ConfirmModal {...defaultProps} confirmText="Excluir" cancelText="Voltar" />);
    expect(screen.getByRole('button', { name: /excluir/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /voltar/i })).toBeInTheDocument();
  });

  it('chama onConfirm e onClose ao clicar no botão de confirmação', () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(<ConfirmModal {...defaultProps} onConfirm={onConfirm} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('chama onClose ao clicar em Cancelar', () => {
    const onClose = vi.fn();
    render(<ConfirmModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('chama onClose ao clicar no botão X', () => {
    const onClose = vi.fn();
    render(<ConfirmModal {...defaultProps} onClose={onClose} />);
    const xButtons = screen.getAllByRole('button');
    // O botão X é o que contém o ícone FiX
    const xBtn = xButtons.find((b) => b.querySelector('[data-testid="icon-x"]'));
    expect(xBtn).toBeTruthy();
    fireEvent.click(xBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('exibe ícone de alerta vermelho quando isDangerous=true', () => {
    render(<ConfirmModal {...defaultProps} isDangerous={true} />);
    expect(screen.getByTestId('icon-alert-triangle')).toBeInTheDocument();
  });

  it('exibe ícone de alerta azul quando isDangerous=false', () => {
    render(<ConfirmModal {...defaultProps} isDangerous={false} />);
    expect(screen.getByTestId('icon-alert-circle')).toBeInTheDocument();
  });

  it('botão de confirmação tem classe vermelha quando isDangerous=true', () => {
    render(<ConfirmModal {...defaultProps} isDangerous={true} confirmText="Excluir" />);
    const btn = screen.getByRole('button', { name: /excluir/i });
    expect(btn.className).toMatch(/red/);
  });
});
