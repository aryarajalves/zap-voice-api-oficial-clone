import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AppContentHeader from './AppContentHeader';
import GuideButton from './GuideButton';
import PageGuard from './PageGuard';
import NoActiveClientScreen from './NoActiveClientScreen';
import VendedorHomeView from './VendedorHomeView';
import { VIEW_TITLES } from './constants';

vi.mock('../ConnectionStatus', () => ({
  default: () => <div data-testid="connection-status">Status Mock</div>
}));

vi.mock('../../pages/ChatConversations', () => ({
  default: ({ onClose }) => (
    <div data-testid="chat-conversations-mock">
      <button onClick={onClose}>Fechar Chat</button>
    </div>
  )
}));

describe('AppContent Subcomponents', () => {
  it('renders NoActiveClientScreen with guidance text', () => {
    render(<NoActiveClientScreen />);
    expect(screen.getByText(/Inicie uma Sessão/i)).toBeDefined();
    expect(screen.getByText(/Selecione um cliente ativo no menu ao lado/i)).toBeDefined();
  });

  it('renders GuideButton and triggers onClick', () => {
    const handleClick = vi.fn();
    render(<GuideButton onClick={handleClick} color="#818cf8" bg="rgba(99,102,241,0.1)" border="rgba(99,102,241,0.3)" />);
    const button = screen.getByRole('button', { name: /Guia/i });
    expect(button).toBeDefined();
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders PageGuard when built is true or undefined', () => {
    render(
      <PageGuard pageKey="funnels" pagesStatus={{ funnels: { built: true } }}>
        <div data-testid="funnels-content">Conteúdo do Funil</div>
      </PageGuard>
    );
    expect(screen.getByTestId('funnels-content')).toBeDefined();
  });

  it('renders PageGuard under construction when built is false', () => {
    render(
      <PageGuard pageKey="blocked" pagesStatus={{ blocked: { built: false, percentage: 50 } }}>
        <div data-testid="blocked-content">Conteúdo Bloqueado</div>
      </PageGuard>
    );
    expect(screen.queryByTestId('blocked-content')).toBeNull();
  });

  it('renders AppContentHeader with view title and guide button for funnels', () => {
    const mockLogic = {
      currentView: 'funnels',
      showBuilder: false,
      setIsFunnelGuideOpen: vi.fn(),
      settingsRefreshKey: 1,
    };
    render(<AppContentHeader logic={mockLogic} />);
    expect(screen.getByText(VIEW_TITLES.funnels)).toBeDefined();
    const guideBtn = screen.getByRole('button', { name: /Guia/i });
    fireEvent.click(guideBtn);
    expect(mockLogic.setIsFunnelGuideOpen).toHaveBeenCalledTimes(1);
  });

  it('renders VendedorHomeView and triggers view change', () => {
    const mockLogic = {
      handleViewChange: vi.fn()
    };
    render(<VendedorHomeView logic={mockLogic} />);
    expect(screen.getByText(/Clique no botão abaixo para abrir o chat/i)).toBeDefined();
    const button = screen.getByRole('button', { name: /Abrir Atendimento/i });
    fireEvent.click(button);
    expect(mockLogic.handleViewChange).toHaveBeenCalledWith('chat_conversations');
  });
});
