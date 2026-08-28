import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ChatMessageList from './ChatMessageList';

describe('ChatMessageList', () => {
    const defaultProps = {
        selectedConvo: {
            id: 12800,
            contact_name: 'Aryaraj',
            phone: '5585996123586'
        },
        handleScrollMessages: vi.fn(),
        getMediaSrc: vi.fn(),
        formatMessageTimestamp: vi.fn(() => 'Hoje às 19:00'),
        editingNoteId: null,
        setEditingNoteId: vi.fn(),
        editingNoteText: '',
        setEditingNoteText: vi.fn(),
        isSavingNoteMsg: false,
        handleSaveEditedNote: vi.fn(),
        setIsNoteModalMaximized: vi.fn(),
        setDeleteNoteConfirmMsgId: vi.fn(),
        setReplyingTo: vi.fn(),
        chatInputRef: { current: null },
        highlightedMsgId: null
    };

    it('exibe a tela de carregamento dedicada com o nome e inicial do contato quando isLoadingMessages é true', () => {
        const engine = {
            isLoadingMessages: true,
            messages: [],
            messagesContainerRef: { current: null },
            messagesEndRef: { current: null }
        };

        render(<ChatMessageList {...defaultProps} engine={engine} />);

        // Deve exibir a tela de loading dedicada
        expect(screen.getByTestId('chat-loading-screen')).toBeInTheDocument();
        expect(screen.getByText('Carregando conversa')).toBeInTheDocument();
        expect(screen.getByText(/Sincronizando mensagens de/)).toBeInTheDocument();
        expect(screen.getByText('Aryaraj')).toBeInTheDocument();
        expect(screen.getByText('A')).toBeInTheDocument(); // Inicial do contato
        // Não deve renderizar a lista de mensagens enquanto carrega
        expect(screen.queryByTestId('chat-messages-container')).not.toBeInTheDocument();
    });

    it('renderiza as mensagens da conversa quando isLoadingMessages é false', () => {
        const engine = {
            isLoadingMessages: false,
            messages: [
                { id: 1, sender_type: 'contact', content: 'Olá, como funciona o curso de vcs', timestamp: '2026-08-19T19:04:00Z' },
                { id: 2, sender_type: 'user', content: 'O Método Laser Day é 100% online.', timestamp: '2026-08-19T19:05:00Z' }
            ],
            messagesContainerRef: { current: null },
            messagesEndRef: { current: null }
        };

        render(<ChatMessageList {...defaultProps} engine={engine} />);

        // Não deve exibir a tela de loading
        expect(screen.queryByTestId('chat-loading-screen')).not.toBeInTheDocument();
        // Deve exibir o container de mensagens
        expect(screen.getByTestId('chat-messages-container')).toBeInTheDocument();
        expect(screen.getByText('Olá, como funciona o curso de vcs')).toBeInTheDocument();
        expect(screen.getByText('O Método Laser Day é 100% online.')).toBeInTheDocument();
    });

    it('exibe estado vazio amigável quando a conversa não possui mensagens e isLoadingMessages é false', () => {
        const engine = {
            isLoadingMessages: false,
            messages: [],
            messagesContainerRef: { current: null },
            messagesEndRef: { current: null }
        };

        render(<ChatMessageList {...defaultProps} engine={engine} />);

        expect(screen.getByText('Nenhuma mensagem registrada ainda')).toBeInTheDocument();
        expect(screen.getByText('Envie uma mensagem abaixo para iniciar a conversa.')).toBeInTheDocument();
    });

    it('renderiza divisores de data entre mensagens de dias diferentes', () => {
        const engine = {
            isLoadingMessages: false,
            messages: [
                { id: 1, sender_type: 'contact', content: 'Mensagem de 18 de agosto', timestamp: '2026-08-18T10:00:00Z' },
                { id: 2, sender_type: 'user', content: 'Mensagem de 19 de agosto', timestamp: '2026-08-19T10:00:00Z' }
            ],
            messagesContainerRef: { current: null },
            messagesEndRef: { current: null }
        };

        render(<ChatMessageList {...defaultProps} engine={engine} />);

        const separators = screen.getAllByTestId('chat-date-separator');
        expect(separators.length).toBe(2);
        expect(separators[0].textContent).toMatch(/18 de agosto/i);
        expect(separators[1].textContent).toMatch(/19 de agosto/i);
    });

    it('renderiza o botão flutuante de rolar para o final quando showScrollBtn é true e executa o scroll ao clicar', async () => {
        const scrollIntoViewSpy = vi.fn();
        window.HTMLElement.prototype.scrollIntoView = scrollIntoViewSpy;
        const setShowScrollBtnMock = vi.fn();
        const engine = {
            isLoadingMessages: false,
            showScrollBtn: true,
            setShowScrollBtn: setShowScrollBtnMock,
            messages: [
                { id: 1, sender_type: 'contact', content: 'Mensagem antiga', timestamp: '2026-08-18T10:00:00Z' },
                { id: 2, sender_type: 'user', content: 'Última mensagem', timestamp: '2026-08-19T10:00:00Z' }
            ],
            messagesContainerRef: { current: null },
            messagesEndRef: { current: null }
        };

        const { rerender } = render(<ChatMessageList {...defaultProps} engine={engine} />);

        const scrollBtn = screen.getByTestId('scroll-to-bottom-button');
        expect(scrollBtn).toBeInTheDocument();
        expect(scrollBtn).toHaveAttribute('title', 'Rolar para a última mensagem');

        // Clica no botão
        scrollBtn.click();
        expect(scrollIntoViewSpy).toHaveBeenCalledWith({ behavior: 'smooth' });
        expect(setShowScrollBtnMock).toHaveBeenCalledWith(false);

        // Se showScrollBtn for false, o botão não deve aparecer
        rerender(<ChatMessageList {...defaultProps} engine={{ ...engine, showScrollBtn: false }} />);
        expect(screen.queryByTestId('scroll-to-bottom-button')).not.toBeInTheDocument();
    });

    it('renderiza o botão flutuante de rolar para o início (primeira mensagem) quando showScrollTopBtn é true e executa o scroll ao clicar', async () => {
        const setShowScrollTopBtnMock = vi.fn();
        const loadAllMock = vi.fn().mockResolvedValue(true);
        const engine = {
            isLoadingMessages: false,
            showScrollTopBtn: true,
            setShowScrollTopBtn: setShowScrollTopBtnMock,
            hasMoreMessages: true,
            loadAllMessagesAndScrollToTop: loadAllMock,
            messages: [
                { id: 1, sender_type: 'contact', content: 'Primeira mensagem', timestamp: '2026-08-18T10:00:00Z' },
                { id: 2, sender_type: 'user', content: 'Segunda mensagem', timestamp: '2026-08-19T10:00:00Z' }
            ],
            messagesContainerRef: { current: null },
            messagesEndRef: { current: null }
        };

        const { rerender } = render(<ChatMessageList {...defaultProps} engine={engine} />);

        const scrollTopBtn = screen.getByTestId('scroll-to-top-button');
        expect(scrollTopBtn).toBeInTheDocument();
        expect(scrollTopBtn).toHaveAttribute('title', 'Ir para a primeira mensagem');
        expect(scrollTopBtn).toHaveTextContent('Primeira mensagem');

        // Clica no botão
        await scrollTopBtn.click();
        expect(loadAllMock).toHaveBeenCalledTimes(1);
        expect(setShowScrollTopBtnMock).toHaveBeenCalledWith(false);

        // Se showScrollTopBtn for false, o botão não deve aparecer
        rerender(<ChatMessageList {...defaultProps} engine={{ ...engine, showScrollTopBtn: false }} />);
        expect(screen.queryByTestId('scroll-to-top-button')).not.toBeInTheDocument();
    });
});


