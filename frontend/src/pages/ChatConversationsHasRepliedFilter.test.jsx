import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Mock dependências do ChatConversations
vi.mock('../AuthContext', () => ({
    useClient: () => ({ activeClient: { id: 1 } }),
    useAuth: () => ({ user: { id: 1, email: 'admin@teste.com' }, token: 'mock' }),
    fetchWithAuth: vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ conversations: [], total_count: 0 })
    })
}));

vi.mock('../contexts/ClientContext', () => ({
    useClient: () => ({ activeClient: { id: 1 } })
}));

vi.mock('./ChatConversations/useChatEngine', () => ({
    useChatEngine: (props) => ({
        conversations: [],
        messages: [],
        newMessage: '',
        setNewMessage: vi.fn(),
        availableLabels: [],
        availableLabelsDetails: [],
        availableAgents: [],
        isAssigning: false,
        isLoadingConvos: false,
        isLoadingMessages: false,
        isSending: false,
        timeLeft24h: '',
        setTimeLeft24h: vi.fn(),
        shouldScrollToBottom: false,
        setShouldScrollToBottom: vi.fn(),
        showScrollBtn: false,
        setShowScrollBtn: vi.fn(),
        selectedConvoIds: [],
        setSelectedConvoIds: vi.fn(),
        page: 1,
        setPage: vi.fn(),
        limit: 20,
        setLimit: vi.fn(),
        totalConvos: 0,
        hasMoreMessages: false,
        isLoadingMoreMessages: false,
        loadConversations: vi.fn(),
        loadAvailableLabels: vi.fn(),
        loadAvailableAgents: vi.fn(),
        loadMessages: vi.fn(),
        setConversations: vi.fn(),
        setMessages: vi.fn(),
        mediaPreview: null,
        setMediaPreview: vi.fn(),
        previewCaption: '',
        setPreviewCaption: vi.fn(),
        isSendingMedia: false,
        setIsSendingMedia: vi.fn(),
        audioChunksRef: { current: [] },
        mediaRecorderRef: { current: null },
        audioTimerRef: { current: null },
        isRecording: false,
        setIsRecording: vi.fn(),
        audioSeconds: 0,
        setAudioSeconds: vi.fn(),
        privateNote: '',
        setPrivateNote: vi.fn(),
        isSavingNote: false,
        setIsSavingNote: vi.fn(),
        confirmDeleteConvos: null,
        setConfirmDeleteConvos: vi.fn(),
        activeClient: props.activeClient,
        propsPassed: props
    })
}));

import ChatConversations from './ChatConversations';

describe('ChatConversations - Filtro Respondeu', () => {
    it('deve exibir o botão "Respondeu" na aba de Status e permitir a seleção', () => {
        render(<ChatConversations />);
        
        // Clicar no filtro de Status
        const statusTabButton = screen.getByText('Status');
        fireEvent.click(statusTabButton);

        // Verificar se o botão Respondeu está presente
        const button = screen.getByText('Respondeu');
        expect(button).toBeInTheDocument();

        // Clicar no botão Respondeu
        fireEvent.click(button);
        expect(button.className).toContain('bg-purple-500');
    });
});
