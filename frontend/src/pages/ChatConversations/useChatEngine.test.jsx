import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChatEngine } from './useChatEngine';

vi.mock('../../AuthContext', () => ({
    fetchWithAuth: vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
            total_media: 1,
            total_docs: 0,
            total_links: 0,
            total_all: 1,
            media: [{ id: 1, url: 'test.png' }],
            docs: [],
            links: []
        })
    })
}));

describe('useChatEngine Hook', () => {
    let mockWsInstances = [];

    beforeEach(() => {
        mockWsInstances = [];
        global.WebSocket = vi.fn(function (url) {
            this.url = url;
            this.onmessage = null;
            this.onopen = null;
            this.onclose = null;
            this.onerror = null;
            this.close = vi.fn();
            this.send = vi.fn();
            mockWsInstances.push(this);
        });
    });

    it('deve inicializar com sucesso sem erros de runtime (useEffect/API_URL/fetchWithAuth definidos)', async () => {
        const { result } = renderHook(() => useChatEngine({
            activeClient: { id: 1, name: 'Cliente Teste' },
            activeTab: 'todos',
            statusFilter: 'open',
            searchQuery: '',
            selectedLabelFilter: null,
            filterBlockStatus: null,
            filterHasNote: false,
            filterStartDate: '',
            filterEndDate: '',
            filterUnread: false,
            filterWindowOpen: false,
            filterTemplate24h: false,
            filterUrgent: false,
            filterHasReplied: false,
            filterHasActiveFunnel: false,
            selectedConvo: null,
            setSelectedConvo: vi.fn()
        }));

        expect(result.current).toBeDefined();
        expect(result.current.timeLeft24h).toBe('');
        expect(result.current.shouldScrollToBottom).toBe(false);
        expect(result.current.selectedConvoIds).toEqual([]);
        expect(typeof result.current.loadConversationMedia).toBe('function');
    });

    it('deve carregar mídias da conversa quando selectedConvo mudar', async () => {
        const { result, rerender } = renderHook(
            ({ selectedConvo }) => useChatEngine({
                activeClient: { id: 1, name: 'Cliente Teste' },
                activeTab: 'todos',
                statusFilter: 'open',
                searchQuery: '',
                selectedLabelFilter: null,
                filterBlockStatus: null,
                filterHasNote: false,
                filterStartDate: '',
                filterEndDate: '',
                filterUnread: false,
                filterWindowOpen: false,
                filterTemplate24h: false,
                filterUrgent: false,
                filterHasReplied: false,
                filterHasActiveFunnel: false,
                selectedConvo,
                setSelectedConvo: vi.fn()
            }),
            { initialProps: { selectedConvo: null } }
        );

        expect(result.current.mediaData.total_all).toBe(0);

        await act(async () => {
            rerender({ selectedConvo: { id: 123, contact_name: 'Aryaraj' } });
        });

        expect(result.current.mediaData.total_media).toBe(1);
    });

    it('deve processar mensagem de mídia via WebSocket em tempo real e atualizar mídias', async () => {
        const { result } = renderHook(() => useChatEngine({
            activeClient: { id: 1, name: 'Cliente Teste' },
            activeTab: 'todos',
            statusFilter: 'open',
            searchQuery: '',
            selectedLabelFilter: null,
            filterBlockStatus: null,
            filterHasNote: false,
            filterStartDate: '',
            filterEndDate: '',
            filterUnread: false,
            filterWindowOpen: false,
            filterTemplate24h: false,
            filterUrgent: false,
            filterHasReplied: false,
            filterHasActiveFunnel: false,
            selectedConvo: { id: 123, contact_name: 'Aryaraj' },
            setSelectedConvo: vi.fn()
        }));

        expect(mockWsInstances.length).toBeGreaterThan(0);
        const ws = mockWsInstances[mockWsInstances.length - 1];

        // Simular evento WebSocket de nova mensagem com imagem
        await act(async () => {
            if (ws.onmessage) {
                ws.onmessage({
                    data: JSON.stringify({
                        event: 'new_message',
                        data: {
                            id: 999,
                            conversation_id: 123,
                            client_id: 1,
                            message_type: 'image',
                            content: 'Foto enviada',
                            media_url: 'https://example.com/nova_foto.jpg',
                            sender_type: 'contact',
                            timestamp: '2026-08-17T10:00:00Z'
                        }
                    })
                });
            }
        });

        // Mensagem deve ter sido inserida no chat
        expect(result.current.messages.some(m => m.id === 999)).toBe(true);
    });
});
