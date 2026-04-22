import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import Sidebar from './Sidebar';

vi.mock('react-icons/fi', () => ({
  FiHome: () => <span />,
  FiLayers: () => <span />,
  FiClock: () => <span />,
  FiSettings: () => <span />,
  FiLogOut: () => <span />,
  FiSlash: () => <span />,
  FiUsers: () => <span />,
  FiGitMerge: () => <span />,
  FiPlus: () => <span />,
  FiCalendar: () => <span />,
  FiGlobe: () => <span />,
  FiActivity: () => <span />,
}));

vi.mock('./ClientSelector', () => ({
  default: ({ onCreateClick }) => (
    <div data-testid="client-selector">
      <button onClick={onCreateClick}>Criar Cliente</button>
    </div>
  ),
}));

vi.mock('./ConfirmModal', () => ({
  default: ({ isOpen, onConfirm, onClose, title }) =>
    isOpen ? (
      <div data-testid="confirm-modal">
        <span>{title}</span>
        <button data-testid="modal-confirm" onClick={onConfirm}>Confirmar</button>
        <button data-testid="modal-cancel" onClick={onClose}>Cancelar</button>
      </div>
    ) : null,
}));

vi.mock('../contexts/ClientContext', () => ({
  useClient: () => ({ activeClient: { id: 1, name: 'TestClient' } }),
}));

const baseProps = {
  activeView: 'bulk_sender',
  onViewChange: vi.fn(),
  onLogout: vi.fn(),
  onSettings: vi.fn(),
  user: { role: 'super_admin' },
  clientName: 'Acme Corp',
  onClientCreate: vi.fn(),
  appBranding: { name: 'ZapVoice', logo: null, logoSize: 'medium' },
};

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza o nome do app', () => {
    render(<Sidebar {...baseProps} />);
    expect(screen.getByText('ZapVoice')).toBeInTheDocument();
  });

  it('exibe o nome do cliente', () => {
    render(<Sidebar {...baseProps} />);
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
  });

  it('renderiza ClientSelector', () => {
    render(<Sidebar {...baseProps} />);
    expect(screen.getByTestId('client-selector')).toBeInTheDocument();
  });

  it('exibe item de menu "Gestão de Usuários" apenas para super_admin', () => {
    render(<Sidebar {...baseProps} user={{ role: 'super_admin' }} />);
    expect(screen.getByText('Gestão de Usuários')).toBeInTheDocument();
  });

  it('oculta "Gestão de Usuários" para role=user', () => {
    render(<Sidebar {...baseProps} user={{ role: 'user' }} />);
    expect(screen.queryByText('Gestão de Usuários')).not.toBeInTheDocument();
  });

  it('oculta itens premium para role=user', () => {
    render(<Sidebar {...baseProps} user={{ role: 'user' }} />);
    expect(screen.queryByText('Disparo em Massa')).not.toBeInTheDocument();
    expect(screen.queryByText('Meus Funis')).not.toBeInTheDocument();
  });

  it('exibe todos os itens para super_admin', () => {
    render(<Sidebar {...baseProps} user={{ role: 'super_admin' }} />);
    expect(screen.getByText('Disparo em Massa')).toBeInTheDocument();
    expect(screen.getByText('Meus Funis')).toBeInTheDocument();
    expect(screen.getByText('Histórico')).toBeInTheDocument();
    expect(screen.getByText('Monitoramento')).toBeInTheDocument();
  });

  it('chama onViewChange ao clicar em item de menu', () => {
    const onViewChange = vi.fn();
    render(<Sidebar {...baseProps} onViewChange={onViewChange} />);
    fireEvent.click(screen.getByText('Meus Funis'));
    expect(onViewChange).toHaveBeenCalledWith('funnels');
  });

  it('abre modal de confirmação ao clicar em logout', () => {
    render(<Sidebar {...baseProps} />);
    const logoutBtn = screen.getByText(/sair/i);
    fireEvent.click(logoutBtn);
    expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
    expect(screen.getByText('Sair do Sistema')).toBeInTheDocument();
  });

  it('chama onLogout ao confirmar logout', () => {
    const onLogout = vi.fn();
    render(<Sidebar {...baseProps} onLogout={onLogout} />);
    fireEvent.click(screen.getByText(/sair/i));
    fireEvent.click(screen.getByTestId('modal-confirm'));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('renderiza logo customizada quando fornecida', () => {
    render(
      <Sidebar
        {...baseProps}
        appBranding={{ name: 'MyApp', logo: 'https://example.com/logo.png', logoSize: 'large' }}
      />
    );
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://example.com/logo.png');
  });

  it('usa primeira letra do app name quando sem logo', () => {
    render(<Sidebar {...baseProps} appBranding={{ name: 'ZapVoice', logo: null }} />);
    expect(screen.getByText('Z')).toBeInTheDocument();
  });
});
