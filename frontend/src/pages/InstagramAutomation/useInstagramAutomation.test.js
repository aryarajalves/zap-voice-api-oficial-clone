import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useInstagramAutomation from './useInstagramAutomation';
import {
  useInstagramSettings,
  useInstagramPosts,
  useInstagramLogs,
  useInstagramAutomations
} from './hooks';
import { toast } from 'react-hot-toast';

vi.mock('react-hot-toast', () => ({
  toast: {
    loading: vi.fn(() => 'loading-id'),
    success: vi.fn(),
    error: vi.fn()
  }
}));

const mockClient = { id: 10, name: 'Cliente Teste' };

describe('InstagramAutomation Hooks & Modules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({})
    });
  });

  describe('useInstagramSettings', () => {
    it('carrega configurações com sucesso', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          INSTAGRAM_ACCOUNT_ID: 'insta_123',
          INSTAGRAM_ACCESS_TOKEN: 'token_abc',
          WEBHOOK_BASE_URL: 'https://api.teste.com',
          INSTAGRAM_WEBHOOK_SLUG: 'slug-insta'
        })
      });

      const onTokenLoaded = vi.fn();
      const { result } = renderHook(() => useInstagramSettings(mockClient, onTokenLoaded));

      await act(async () => {
        await result.current.fetchSettings();
      });

      expect(result.current.instaAccountID).toBe('insta_123');
      expect(result.current.tokenJaConfigurado).toBe(true);
      expect(result.current.instaWebhookSlug).toBe('slug-insta');
      expect(onTokenLoaded).toHaveBeenCalledWith(true);
    });

    it('revela token de acesso com sucesso', async () => {
      global.fetch.mockImplementation(async (url) => {
        const urlStr = typeof url === 'string' ? url : url?.url || '';
        if (urlStr.includes('/reveal')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ value: 'token_secreto_revelado' })
          };
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({
            INSTAGRAM_ACCESS_TOKEN: 'token_abc'
          })
        };
      });

      const onTokenLoaded = vi.fn();
      const { result } = renderHook(() => useInstagramSettings(mockClient, onTokenLoaded));

      await act(async () => {
        await result.current.fetchSettings();
      });

      expect(result.current.tokenJaConfigurado).toBe(true);

      await act(async () => {
        await result.current.handleRevealToken();
      });

      expect(result.current.tokenRevelado).toBe('token_secreto_revelado');
      expect(result.current.showToken).toBe(true);
    });

    it('salva configurações com sucesso', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true })
      });

      const { result } = renderHook(() => useInstagramSettings(mockClient, vi.fn()));

      act(() => {
        result.current.setInstaAccountID('novo_id');
      });

      await act(async () => {
        await result.current.handleSaveSettings();
      });

      expect(toast.success).toHaveBeenCalledWith(
        'Configurações do Instagram salvas com sucesso!',
        expect.anything()
      );
    });
  });

  describe('useInstagramPosts', () => {
    it('busca posts quando possui token configurado', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [
          { id: 'post_1', caption: 'Post 1' },
          { id: 'post_2', caption: 'Post 2' }
        ]
      });

      const { result } = renderHook(() => useInstagramPosts(mockClient, true));

      await act(async () => {
        await result.current.fetchInstagramPosts();
      });

      expect(result.current.instagramPosts).toHaveLength(2);
      expect(result.current.loadingPosts).toBe(false);
    });

    it('não busca posts se tokenJaConfigurado for falso e forceHasToken não for fornecido', async () => {
      const { result } = renderHook(() => useInstagramPosts(mockClient, false));

      await act(async () => {
        await result.current.fetchInstagramPosts();
      });

      expect(result.current.instagramPosts).toEqual([]);
    });
  });

  describe('useInstagramLogs', () => {
    it('busca logs com paginação', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          logs: [{ id: 1, comment: 'Olá' }],
          pages: 3,
          total: 25
        })
      });

      const { result } = renderHook(() => useInstagramLogs(mockClient));

      await act(async () => {
        result.current.setActiveTab('logs');
      });

      expect(result.current.logs).toHaveLength(1);
      expect(result.current.logsTotalPages).toBe(3);
      expect(result.current.logsTotalItems).toBe(25);
    });
  });

  describe('useInstagramAutomations', () => {
    it('abre modal de criação e limpa estados', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => []
      });

      const onFetchPosts = vi.fn();
      let result;
      await act(async () => {
        const rendered = renderHook(() => useInstagramAutomations(mockClient, onFetchPosts));
        result = rendered.result;
      });

      act(() => {
        result.current.handleOpenNew();
      });

      expect(result.current.isModalOpen).toBe(true);
      expect(result.current.editingId).toBeNull();
      expect(result.current.name).toBe('');
      expect(result.current.selectedPostIds).toEqual(['all']);
      expect(onFetchPosts).toHaveBeenCalled();
    });

    it('adiciona e remove variações de resposta', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => []
      });

      let result;
      await act(async () => {
        const rendered = renderHook(() => useInstagramAutomations(mockClient, vi.fn()));
        result = rendered.result;
      });

      act(() => {
        result.current.handleAddReplyVariation();
      });
      expect(result.current.replyComments).toHaveLength(2);

      act(() => {
        result.current.handleReplyChange(1, 'Resposta 2');
      });
      expect(result.current.replyComments[1]).toBe('Resposta 2');

      act(() => {
        result.current.handleRemoveReplyVariation(1);
      });
      expect(result.current.replyComments).toHaveLength(1);
    });

    it('valida resposta de comentário obrigatória se actionType não for send_dm', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => []
      });

      let result;
      await act(async () => {
        const rendered = renderHook(() => useInstagramAutomations(mockClient, vi.fn()));
        result = rendered.result;
      });

      act(() => {
        result.current.setActionType('both');
        result.current.handleReplyChange(0, '   '); // Resposta vazia
      });

      await act(async () => {
        await result.current.handleSaveAutomation({ preventDefault: vi.fn() });
      });

      expect(toast.error).toHaveBeenCalledWith('Você precisa definir pelo menos uma resposta de comentário.');
    });
  });

  describe('useInstagramAutomation (orquestrador)', () => {
    it('retorna todas as propriedades e funções agregadas', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => []
      });

      let result;
      await act(async () => {
        const rendered = renderHook(() => useInstagramAutomation(mockClient));
        result = rendered.result;
      });

      expect(result.current).toHaveProperty('automations');
      expect(result.current).toHaveProperty('funnels');
      expect(result.current).toHaveProperty('handleOpenNew');
      expect(result.current).toHaveProperty('handleSaveSettings');
      expect(result.current).toHaveProperty('handleRevealToken');
      expect(result.current).toHaveProperty('instagramPosts');
      expect(result.current).toHaveProperty('activeTab');
    });
  });
});
