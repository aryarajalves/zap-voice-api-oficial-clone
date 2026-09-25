import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChatOperations } from './useChatOperations.js';
import { useChatPipelineOperations } from './chatOperations/useChatPipelineOperations.js';
import { useChatTagsOperations } from './chatOperations/useChatTagsOperations.js';
import { useChatConvoStatusOperations } from './chatOperations/useChatConvoStatusOperations.js';
import { useChatMessageActionsOperations } from './chatOperations/useChatMessageActionsOperations.js';
import { useChatDeletionOperations } from './chatOperations/useChatDeletionOperations.js';
import { useChatBulkTagOperations } from './chatOperations/useChatBulkTagOperations.js';

vi.mock('../../../AuthContext', () => ({
    fetchWithAuth: vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 'ok', updated_count: 1 })
    }))
}));

describe('Modularização de useChatOperations', () => {
    const mockEngine = {
        setTagSearchQuery: vi.fn(),
        loadConversations: vi.fn(),
        loadAvailableLabels: vi.fn(),
        setConversations: vi.fn(),
        setIsBlockingContact: vi.fn(),
        setIsBlockModalOpen: vi.fn(),
        setIsSavingNote: vi.fn(),
        setMessages: vi.fn(),
        setShouldScrollToBottom: vi.fn(),
        setPrivateNote: vi.fn(),
        setIsClearingChat: vi.fn(),
        setIsClearChatModalOpen: vi.fn(),
        setSelectedConvoIds: vi.fn(),
        setConfirmDeleteConvos: vi.fn(),
        setDeletingConvoId: vi.fn(),
        selectedConvoIds: [1, 2],
        privateNote: 'Nota teste'
    };

    const mockConvo = {
        id: 10,
        phone: '5511999999999',
        labels: ['Lead'],
        pinned: false,
        urgent: false,
        block_status: null
    };

    const defaultProps = {
        engine: mockEngine,
        selectedConvo: mockConvo,
        setSelectedConvo: vi.fn(),
        activeClient: { id: 'client_123' },
        activeTab: 'all',
        statusFilter: 'all',
        searchQuery: '',
        selectedLabelFilter: '',
        filterBlockStatus: '',
        filterHasNote: '',
        filterStartDate: '',
        filterEndDate: '',
        filterUnread: false,
        filterWindowOpen: false,
        filterTemplate24h: false,
        filterHasReplied: false,
        selectAllPages: false,
        setSelectAllPages: vi.fn()
    };

    it('deve exportar todos os submódulos especializados e funções principais', () => {
        expect(useChatPipelineOperations).toBeTypeOf('function');
        expect(useChatTagsOperations).toBeTypeOf('function');
        expect(useChatConvoStatusOperations).toBeTypeOf('function');
        expect(useChatMessageActionsOperations).toBeTypeOf('function');
        expect(useChatDeletionOperations).toBeTypeOf('function');
        expect(useChatBulkTagOperations).toBeTypeOf('function');
    });

    it('deve inicializar o hook useChatOperations consolidando os sub-hooks', () => {
        const { result } = renderHook(() => useChatOperations(defaultProps));

        expect(result.current.pipelineTrigger).toBeNull();
        expect(result.current.isLoadingPipeline).toBe(false);
        expect(result.current.handleOpenActiveFunnelPipeline).toBeTypeOf('function');

        expect(result.current.handleAddTagWithName).toBeTypeOf('function');
        expect(result.current.handleRemoveTag).toBeTypeOf('function');

        expect(result.current.handleTogglePin).toBeTypeOf('function');
        expect(result.current.handleToggleUrgent).toBeTypeOf('function');
        expect(result.current.handleSaveNote).toBeTypeOf('function');
        expect(result.current.handleConfirmBlockContact).toBeTypeOf('function');
        expect(result.current.handleUnblockContact).toBeTypeOf('function');

        expect(result.current.handleTogglePinMessage).toBeTypeOf('function');
        expect(result.current.handleToggleStarMessage).toBeTypeOf('function');
        expect(result.current.handleCopyMessageContent).toBeTypeOf('function');
        expect(result.current.handleResendToAgentFlow).toBeTypeOf('function');

        expect(result.current.handleClearConversationMessages).toBeTypeOf('function');
        expect(result.current.handleDeleteConversation).toBeTypeOf('function');
        expect(result.current.handleDeleteSelectedConversations).toBeTypeOf('function');

        expect(result.current.isBulkTagModalOpen).toBe(false);
        expect(result.current.selectedBulkTag).toBe('');
        expect(result.current.handleBulkTagConversations).toBeTypeOf('function');
    });

    it('deve permitir atualizar estado local de bulk tag', () => {
        const { result } = renderHook(() => useChatOperations(defaultProps));

        act(() => {
            result.current.setIsBulkTagModalOpen(true);
            result.current.setSelectedBulkTag('VIP');
            result.current.setCustomBulkTag('Urgente');
        });

        expect(result.current.isBulkTagModalOpen).toBe(true);
        expect(result.current.selectedBulkTag).toBe('VIP');
        expect(result.current.customBulkTag).toBe('Urgente');
    });

    it('deve atualizar selectedConvo e chamar loadMessages ao aplicar tag com sucesso na conversa ativa', async () => {
        const mockSetSelectedConvo = vi.fn();
        const mockLoadMessages = vi.fn();
        const props = {
            ...defaultProps,
            setSelectedConvo: mockSetSelectedConvo,
            engine: {
                ...mockEngine,
                loadMessages: mockLoadMessages,
                selectedConvoIds: [10] // mesmo id do mockConvo
            }
        };

        const { result } = renderHook(() => useChatOperations(props));

        await act(async () => {
            await result.current.handleBulkTagConversations(['NovaEtiquetaChat'], 'chat');
        });

        expect(mockSetSelectedConvo).toHaveBeenCalled();
        expect(mockLoadMessages).toHaveBeenCalledWith(10);
    });
});
