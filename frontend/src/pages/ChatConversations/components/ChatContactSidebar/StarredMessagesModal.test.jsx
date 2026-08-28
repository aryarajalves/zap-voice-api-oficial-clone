import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import StarredMessagesModal from './StarredMessagesModal';
import { fetchWithAuth } from '../../../../AuthContext';

vi.mock('../../../../config', () => ({
  API_URL: 'http://localhost:8000/api',
}));

vi.mock('../../../../AuthContext', () => ({
  fetchWithAuth: vi.fn(),
}));

describe('StarredMessagesModal', () => {
  const mockMessages = Array.from({ length: 20 }, (_, i) => ({
    id: 100 + i,
    sender_type: i % 2 === 0 ? 'user' : 'contact',
    content: `Mensagem favoritada de teste ${i + 1}`,
    timestamp: '2026-08-26T10:30:00Z',
    is_starred: true,
  }));

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    convoId: 1,
    activeClientId: 888,
    contactName: 'Aryaraj Crassus',
    onSelectMessage: vi.fn(),
    onToggleStarMessage: vi.fn(),
    formatMessageTimestamp: vi.fn(() => '10:30'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('não renderiza nada se isOpen for false', () => {
    render(<StarredMessagesModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('starred-messages-modal')).not.toBeInTheDocument();
  });

  it('renderiza o modal, carrega mensagens paginadas e exibe informações de paginação', async () => {
    vi.mocked(fetchWithAuth).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: mockMessages,
        total: 45,
        page: 1,
        per_page: 20,
        pages: 3,
      }),
    });

    render(<StarredMessagesModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Mensagens Favoritas')).toBeInTheDocument();
      expect(screen.getByText(/45 mensagens favoritadas/i)).toBeInTheDocument();
      expect(screen.getByText(/1-20 de 45/i)).toBeInTheDocument();
      expect(screen.getByText(/Pág\. 1\/3/i)).toBeInTheDocument();
      expect(screen.getByText('Mensagem favoritada de teste 1')).toBeInTheDocument();
    }, { timeout: 10000 });

    expect(screen.getByRole('button', { name: /Ant\./i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Próx\./i })).not.toBeDisabled();
  }, 15000);

  it('permite navegar para a próxima página ao clicar em Próx.', async () => {
    vi.mocked(fetchWithAuth)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: mockMessages,
          total: 45,
          page: 1,
          per_page: 20,
          pages: 3,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            {
              id: 201,
              sender_type: 'contact',
              content: 'Mensagem da página 2',
              timestamp: '2026-08-26T10:35:00Z',
              is_starred: true,
            }
          ],
          total: 45,
          page: 2,
          per_page: 20,
          pages: 3,
        }),
      });

    render(<StarredMessagesModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Mensagem favoritada de teste 1')).toBeInTheDocument();
    }, { timeout: 10000 });

    const nextBtn = screen.getByRole('button', { name: /Próx\./i });
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(fetchWithAuth).toHaveBeenLastCalledWith(
        expect.stringContaining('page=2'),
        {},
        888
      );
      expect(screen.getByText('Mensagem da página 2')).toBeInTheDocument();
    }, { timeout: 10000 });
  }, 15000);

  it('aciona onSelectMessage e fecha o modal ao clicar em Ir para mensagem', async () => {
    vi.mocked(fetchWithAuth).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [mockMessages[0]],
        total: 1,
        page: 1,
        per_page: 20,
        pages: 1,
      }),
    });

    render(<StarredMessagesModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Mensagem favoritada de teste 1')).toBeInTheDocument();
    }, { timeout: 10000 });

    const goToBtn = screen.getByRole('button', { name: /Ir para mensagem/i });
    fireEvent.click(goToBtn);

    expect(defaultProps.onSelectMessage).toHaveBeenCalledWith(100);
    expect(defaultProps.onClose).toHaveBeenCalled();
  }, 15000);

  it('abre popup de confirmação ao clicar na lixeira, permite cancelar ou confirmar remoção', async () => {
    vi.mocked(fetchWithAuth).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [mockMessages[0]],
        total: 1,
        page: 1,
        per_page: 20,
        pages: 1,
      }),
    });

    render(<StarredMessagesModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Mensagem favoritada de teste 1')).toBeInTheDocument();
    }, { timeout: 10000 });

    // 1. Clicar no botão de lixeira
    const removeBtn = screen.getByTitle('Remover dos favoritos');
    fireEvent.click(removeBtn);

    // 2. Verificar que o popup de confirmação abriu no centro da tela
    expect(screen.getByTestId('unstar-confirm-dialog')).toBeInTheDocument();
    expect(screen.getByText('Remover dos Favoritos?')).toBeInTheDocument();
    expect(screen.getByText(/Esta mensagem deixará de aparecer na lista de favoritos/i)).toBeInTheDocument();

    // 3. Testar botão Cancelar
    const cancelBtn = screen.getByRole('button', { name: 'Cancelar' });
    fireEvent.click(cancelBtn);
    expect(screen.queryByTestId('unstar-confirm-dialog')).not.toBeInTheDocument();
    expect(defaultProps.onToggleStarMessage).not.toHaveBeenCalled();

    // 4. Clicar na lixeira novamente e Confirmar
    fireEvent.click(removeBtn);
    const confirmBtn = screen.getByRole('button', { name: /Sim, Remover/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(defaultProps.onToggleStarMessage).toHaveBeenCalledWith(mockMessages[0]);
      expect(screen.queryByTestId('unstar-confirm-dialog')).not.toBeInTheDocument();
      expect(screen.getByText('Nenhuma mensagem favoritada')).toBeInTheDocument();
    }, { timeout: 10000 });
  }, 15000);
});
