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

const mockConvo = {
    id: 64,
    phone: '5585996123586',
    contact_name: 'Aryaraj',
    status: 'open',
    block_status: null,
    labels: ['whatsapp'],
    unread_count: 0
};

vi.mock('./ChatConversations/useChatEngine', () => ({
    useChatEngine: (props) => ({
        conversations: [mockConvo],
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
        totalConvos: 1,
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
        tagSearchQuery: '',
        setTagSearchQuery: vi.fn(),
        getLabelColor: vi.fn().mockReturnValue('bg-emerald-500/10 text-emerald-500'),
        activeClient: props.activeClient,
        propsPassed: props
    })
}));

import ChatConversations from './ChatConversations';

describe('ChatConversations - Botão de Fechar Conversa', () => {
    it('deve desmarcar a conversa ao clicar no botão "Fechar conversa" e voltar para a Área de Atendimento livre', () => {
        render(<ChatConversations />);
        
        // Clicar na conversa para selecionar
        const convoCards = screen.getAllByText('Aryaraj');
        fireEvent.click(convoCards[0]);

        // Encontrar o botão de fechar conversa pelo title
        const closeButton = screen.getByTitle('Fechar conversa');
        expect(closeButton).toBeInTheDocument();

        // Clicar no botão de fechar conversa
        fireEvent.click(closeButton);

        // Verificar se a tela voltou para a "Área de Atendimento" limpa
        expect(screen.getByText('Área de Atendimento')).toBeInTheDocument();
        expect(screen.getByText('Selecione uma conversa para iniciar.')).toBeInTheDocument();
    });
});
