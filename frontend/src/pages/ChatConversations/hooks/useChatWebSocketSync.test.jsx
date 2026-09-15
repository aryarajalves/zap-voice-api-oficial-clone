import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useChatWebSocketSync } from './useChatWebSocketSync';

// Mock do WebSocket global
class MockWebSocket {
  static instances = [];
  constructor(url) {
    this.url = url;
    this.onmessage = null;
    this.onclose = null;
    this.onerror = null;
    MockWebSocket.instances.push(this);
  }
  close() {
    if (this.onclose) this.onclose();
  }
}

describe('useChatWebSocketSync - message_reaction_updated e reset de 24h', () => {
  let originalWebSocket;

  beforeEach(() => {
    MockWebSocket.instances = [];
    originalWebSocket = global.WebSocket;
    global.WebSocket = MockWebSocket;
  });

  afterEach(() => {
    global.WebSocket = originalWebSocket;
    vi.restoreAllMocks();
  });

  it('deve atualizar conversas, selectedConvo e mensagens ao receber message_reaction_updated', () => {
    const activeClient = { id: 1 };
    const selectedConvo = {
      id: 1243,
      phone: '5511999999999',
      last_contact_message_at: '2026-09-15T08:00:00.000Z'
    };

    let conversations = [
      { id: 1243, phone: '5511999999999', last_contact_message_at: '2026-09-15T08:00:00.000Z', status: 'open' }
    ];
    const setConversations = vi.fn((updater) => {
      if (typeof updater === 'function') {
        conversations = updater(conversations);
      }
    });

    let currentSelectedConvo = { ...selectedConvo };
    const setSelectedConvo = vi.fn((updater) => {
      if (typeof updater === 'function') {
        currentSelectedConvo = updater(currentSelectedConvo);
      }
    });

    let messages = [
      { id: 555, wa_message_id: 'wamid.HBgLM123', meta_data: { reactions: [] } }
    ];
    const setMessages = vi.fn((updater) => {
      if (typeof updater === 'function') {
        messages = updater(messages);
      }
    });

    const setShouldScrollToBottom = vi.fn();
    const loadConversationMedia = vi.fn();

    renderHook(() =>
      useChatWebSocketSync({
        activeClient,
        selectedConvo,
        setSelectedConvo,
        setConversations,
        setMessages,
        setShouldScrollToBottom,
        loadConversationMedia
      })
    );

    expect(MockWebSocket.instances.length).toBe(1);
    const wsInstance = MockWebSocket.instances[0];

    // Simula evento message_reaction_updated vindo do backend
    const newTimestamp = '2026-09-15T14:15:00.000Z';
    const payload = {
      event: 'message_reaction_updated',
      data: {
        client_id: 1,
        conversation_id: 1243,
        message_id: 555,
        wa_message_id: 'wamid.HBgLM123',
        meta_data: {
          reactions: [{ emoji: '👍', sender: 'contact' }]
        },
        last_contact_message_at: newTimestamp,
        last_message_at: newTimestamp,
        status: 'open'
      }
    };

    wsInstance.onmessage({ data: JSON.stringify(payload) });

    // 1. Validar que setSelectedConvo foi chamado e atualizou o last_contact_message_at
    expect(setSelectedConvo).toHaveBeenCalled();
    expect(currentSelectedConvo.last_contact_message_at).toBe(newTimestamp);

    // 2. Validar que setConversations atualizou a conversa
    expect(setConversations).toHaveBeenCalled();
    expect(conversations[0].last_contact_message_at).toBe(newTimestamp);

    // 3. Validar que setMessages atualizou a reação na mensagem
    expect(setMessages).toHaveBeenCalled();
    expect(messages[0].meta_data.reactions).toEqual([{ emoji: '👍', sender: 'contact' }]);
  });

  it('deve ignorar mensagem se client_id for de outro cliente', () => {
    const activeClient = { id: 1 };
    const selectedConvo = { id: 1243 };
    const setSelectedConvo = vi.fn();
    const setConversations = vi.fn();
    const setMessages = vi.fn();

    renderHook(() =>
      useChatWebSocketSync({
        activeClient,
        selectedConvo,
        setSelectedConvo,
        setConversations,
        setMessages,
        setShouldScrollToBottom: vi.fn(),
        loadConversationMedia: vi.fn()
      })
    );

    const wsInstance = MockWebSocket.instances[0];

    // Evento de outro cliente (id: 99)
    const payload = {
      event: 'message_reaction_updated',
      data: {
        client_id: 99,
        conversation_id: 1243,
        last_contact_message_at: '2026-09-15T14:15:00.000Z'
      }
    };

    wsInstance.onmessage({ data: JSON.stringify(payload) });

    expect(setSelectedConvo).not.toHaveBeenCalled();
    expect(setConversations).not.toHaveBeenCalled();
  });
});
