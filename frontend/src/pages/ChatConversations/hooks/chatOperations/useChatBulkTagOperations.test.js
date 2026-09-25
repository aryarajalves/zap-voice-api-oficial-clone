import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChatBulkTagOperations } from './useChatBulkTagOperations';
import * as AuthContext from '../../../../AuthContext';

describe('useChatBulkTagOperations Unit Tests', () => {
    let mockEngine;
    let mockSelectedConvo;
    let setSelectedConvo;
    let activeClient;

    beforeEach(() => {
        vi.clearAllMocks();
        mockEngine = {
            selectedConvoIds: ['convo-1'],
            setSelectedConvoIds: vi.fn(),
            loadConversations: vi.fn(),
            loadAvailableLabels: vi.fn(),
            loadMessages: vi.fn()
        };
        mockSelectedConvo = {
            id: 'convo-1',
            contact_name: 'Lead Teste',
            phone: '551199999999',
            labels: ['antiga-tag', 'outra-tag']
        };
        setSelectedConvo = vi.fn();
        activeClient = { id: 123 };
    });

    it('envia remoção de etiquetas com remove_labels e mode sync quando etiquetas forem desmarcadas', async () => {
        const fetchWithAuthSpy = vi.spyOn(AuthContext, 'fetchWithAuth').mockResolvedValue({
            ok: true,
            json: async () => ({ updated_count: 1 })
        });

        const { result } = renderHook(() => useChatBulkTagOperations({
            engine: mockEngine,
            selectedConvo: mockSelectedConvo,
            setSelectedConvo,
            activeClient,
            activeTab: 'all',
            statusFilter: 'all',
            searchQuery: '',
            selectedLabelFilter: null,
            selectAllPages: false,
            setSelectAllPages: vi.fn(),
            excludedConvoIds: [],
            setExcludedConvoIds: vi.fn()
        }));

        await act(async () => {
            // Conversa tinha ['antiga-tag', 'outra-tag'], agora mantém apenas ['antiga-tag']
            await result.current.handleBulkTagConversations(['antiga-tag'], 'chat', {
                initialTags: ['antiga-tag', 'outra-tag']
            });
        });

        expect(fetchWithAuthSpy).toHaveBeenCalledTimes(1);
        const [url, options] = fetchWithAuthSpy.mock.calls[0];
        expect(url).toContain('/chat/conversations/bulk-tag');
        const body = JSON.parse(options.body);

        expect(body.labels).toEqual(['antiga-tag']);
        expect(body.remove_labels).toEqual(['outra-tag']);
        expect(body.mode).toBe('sync');
        expect(body.target).toBe('chat');

        // Confirma que setSelectedConvo e loadMessages foram chamados para atualizar a conversa aberta
        expect(setSelectedConvo).toHaveBeenCalled();
        expect(mockEngine.loadMessages).toHaveBeenCalledWith('convo-1');
    });

    it('permite remover todas as etiquetas da conversa com sucesso', async () => {
        const fetchWithAuthSpy = vi.spyOn(AuthContext, 'fetchWithAuth').mockResolvedValue({
            ok: true,
            json: async () => ({ updated_count: 1 })
        });

        const { result } = renderHook(() => useChatBulkTagOperations({
            engine: mockEngine,
            selectedConvo: mockSelectedConvo,
            setSelectedConvo,
            activeClient,
            activeTab: 'all',
            statusFilter: 'all',
            searchQuery: '',
            selectedLabelFilter: null,
            selectAllPages: false,
            setSelectAllPages: vi.fn(),
            excludedConvoIds: [],
            setExcludedConvoIds: vi.fn()
        }));

        await act(async () => {
            // Conversa tinha ['antiga-tag'], usuário desmarcou tudo e clicou em remover
            await result.current.handleBulkTagConversations([], 'chat', {
                initialTags: ['antiga-tag']
            });
        });

        expect(fetchWithAuthSpy).toHaveBeenCalledTimes(1);
        const body = JSON.parse(fetchWithAuthSpy.mock.calls[0][1].body);

        expect(body.labels).toEqual([]);
        expect(body.remove_labels).toEqual(['antiga-tag']);
        expect(body.mode).toBe('sync');
    });

    it('impede envio se nenhuma etiqueta for fornecida e não houver initialTags para remover', async () => {
        const fetchWithAuthSpy = vi.spyOn(AuthContext, 'fetchWithAuth').mockResolvedValue({
            ok: true,
            json: async () => ({ updated_count: 0 })
        });

        const { result } = renderHook(() => useChatBulkTagOperations({
            engine: mockEngine,
            selectedConvo: mockSelectedConvo,
            setSelectedConvo,
            activeClient,
            activeTab: 'all',
            statusFilter: 'all',
            searchQuery: '',
            selectedLabelFilter: null,
            selectAllPages: false,
            setSelectAllPages: vi.fn(),
            excludedConvoIds: [],
            setExcludedConvoIds: vi.fn()
        }));

        await act(async () => {
            await result.current.handleBulkTagConversations([], 'chat', {
                initialTags: []
            });
        });

        expect(fetchWithAuthSpy).not.toHaveBeenCalled();
    });
});
