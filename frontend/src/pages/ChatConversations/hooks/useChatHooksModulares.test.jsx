import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChatMediaAndDocs } from './useChatMediaAndDocs';
import { useChatConversationOpen } from './useChatConversationOpen';

vi.mock('../../../AuthContext', () => ({
  fetchWithAuth: vi.fn()
}));

vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

import { fetchWithAuth } from '../../../AuthContext';
import { toast } from 'react-hot-toast';

describe('useChatMediaAndDocs sub-hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve inicializar com valores vazios quando não houver selectedConvo', () => {
    const { result } = renderHook(() => useChatMediaAndDocs({
      activeClient: { id: 1 },
      selectedConvo: null,
      setPrivateNote: vi.fn()
    }));

    expect(result.current.mediaData.total_all).toBe(0);
    expect(result.current.isMediaModalOpen).toBe(false);
    expect(result.current.isLoadingMedia).toBe(false);
  });

  it('deve carregar dados de mídia quando selectedConvo for fornecido', async () => {
    fetchWithAuth.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        total_media: 2,
        total_docs: 1,
        total_links: 0,
        total_notes: 0,
        total_all: 3,
        media: [{ id: 1 }, { id: 2 }],
        docs: [{ id: 3 }],
        links: [],
        notes: []
      })
    });

    const setPrivateNote = vi.fn();
    const { result } = renderHook(() => useChatMediaAndDocs({
      activeClient: { id: 1 },
      selectedConvo: { id: 456 },
      setPrivateNote
    }));

    expect(setPrivateNote).toHaveBeenCalledWith('');
    await act(async () => {
      await result.current.loadConversationMedia(456);
    });

    expect(result.current.mediaData.total_media).toBe(2);
    expect(result.current.mediaData.total_all).toBe(3);
  });
});

describe('useChatConversationOpen sub-hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve selecionar conversa imediatamente se já estiver na memória', async () => {
    const existing = { id: 10, contact_name: 'Maria' };
    const setSelectedConvo = vi.fn();
    const setConversations = vi.fn();

    const { result } = renderHook(() => useChatConversationOpen({
      activeClient: { id: 1 },
      conversations: [existing],
      setConversations,
      setSelectedConvo
    }));

    await act(async () => {
      await result.current.openConversationById(10);
    });

    expect(setSelectedConvo).toHaveBeenCalledWith(existing);
    expect(toast.success).toHaveBeenCalledWith('Abrindo conversa de Maria');
  });

  it('deve buscar conversa via API se não estiver em memória', async () => {
    const setSelectedConvo = vi.fn();
    const setConversations = vi.fn();

    fetchWithAuth.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 20, contact_name: 'João' })
    });

    const { result } = renderHook(() => useChatConversationOpen({
      activeClient: { id: 1 },
      conversations: [],
      setConversations,
      setSelectedConvo
    }));

    await act(async () => {
      await result.current.openConversationById(20);
    });

    expect(fetchWithAuth).toHaveBeenCalled();
    expect(setSelectedConvo).toHaveBeenCalledWith({ id: 20, contact_name: 'João' });
    expect(toast.success).toHaveBeenCalledWith('Abrindo conversa de João');
  });
});
