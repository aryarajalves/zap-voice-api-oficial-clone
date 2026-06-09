import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import ClientModal from './ClientModal';

const mockCreateClient = vi.fn();
const mockSwitchClient = vi.fn();

vi.mock('../contexts/ClientContext', () => ({
  useClient: () => ({
    createClient: mockCreateClient,
    switchClient: mockSwitchClient,
  })
}));

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
};

describe('ClientModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('não renderiza quando isOpen=false', () => {
    render(<ClientModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Novo Cliente')).not.toBeInTheDocument();
  });

  it('renderiza quando isOpen=true', () => {
    render(<ClientModal {...defaultProps} />);
    expect(screen.getByText('Novo Cliente')).toBeInTheDocument();
    expect(screen.getByText('Nome do Cliente')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ex: Empresa XYZ')).toBeInTheDocument();
  });

  it('possui o z-index correto [99999]', () => {
    const { container } = render(<ClientModal {...defaultProps} />);
    const mainDiv = container.firstChild;
    expect(mainDiv.className).toContain('z-[99999]');
  });

  it('chama onClose ao clicar em Cancelar', () => {
    const onClose = vi.fn();
    render(<ClientModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
