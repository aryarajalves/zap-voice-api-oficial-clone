import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MessageContextMenu from './MessageContextMenu';

describe('MessageContextMenu Unit Tests', () => {
    const mockMsg = {
        id: 101,
        sender_type: 'user',
        content: 'Mensagem de teste para menu de contexto',
        timestamp: new Date().toISOString(),
        is_starred: false
    };

    const mockConvo = {
        id: 50,
        contact_name: 'Lead Teste',
        pinned_message_id: null
    };

    it('não renderiza quando isOpen é false', () => {
        const { container } = render(
            <MessageContextMenu
                isOpen={false}
                position={{ x: 100, y: 100 }}
                targetMessage={mockMsg}
                selectedConvo={mockConvo}
            />
        );
        expect(container.firstChild).toBeNull();
    });

    it('renderiza opções completas e barra de emojis quando aberto', () => {
        render(
            <MessageContextMenu
                isOpen={true}
                position={{ x: 150, y: 200 }}
                targetMessage={mockMsg}
                selectedConvo={mockConvo}
            />
        );

        expect(screen.getByTestId('message-context-menu')).toBeInTheDocument();
        expect(screen.getByText('Responder')).toBeInTheDocument();
        expect(screen.getByText('Copiar')).toBeInTheDocument();
        expect(screen.getByText('Fixar')).toBeInTheDocument();
        expect(screen.getByText('Favoritar')).toBeInTheDocument();
        expect(screen.queryByTestId('context-menu-react')).not.toBeInTheDocument();
        expect(screen.queryByTestId('context-menu-delete')).not.toBeInTheDocument();
        expect(screen.getByTitle('Reagir com 👍')).toBeInTheDocument();
        expect(screen.getByTitle('Reagir com ❤️')).toBeInTheDocument();
    });

    it('chama onReply ao clicar em Responder', () => {
        const onReplyMock = vi.fn();
        const onCloseMock = vi.fn();

        render(
            <MessageContextMenu
                isOpen={true}
                position={{ x: 100, y: 100 }}
                targetMessage={mockMsg}
                selectedConvo={mockConvo}
                onReply={onReplyMock}
                onClose={onCloseMock}
            />
        );

        fireEvent.click(screen.getByTestId('context-menu-reply'));
        expect(onReplyMock).toHaveBeenCalledWith(mockMsg);
        expect(onCloseMock).toHaveBeenCalled();
    });

    it('chama onCopy ao clicar em Copiar', () => {
        const onCopyMock = vi.fn();
        const onCloseMock = vi.fn();

        render(
            <MessageContextMenu
                isOpen={true}
                position={{ x: 100, y: 100 }}
                targetMessage={mockMsg}
                selectedConvo={mockConvo}
                onCopy={onCopyMock}
                onClose={onCloseMock}
            />
        );

        fireEvent.click(screen.getByTestId('context-menu-copy'));
        expect(onCopyMock).toHaveBeenCalledWith(mockMsg);
        expect(onCloseMock).toHaveBeenCalled();
    });

    it('chama onTogglePin ao clicar em Fixar/Desafixar', () => {
        const onTogglePinMock = vi.fn();

        render(
            <MessageContextMenu
                isOpen={true}
                position={{ x: 100, y: 100 }}
                targetMessage={mockMsg}
                selectedConvo={{ ...mockConvo, pinned_message_id: 101 }}
                onTogglePin={onTogglePinMock}
            />
        );

        expect(screen.getByText('Desafixar')).toBeInTheDocument();
        fireEvent.click(screen.getByTestId('context-menu-pin'));
        expect(onTogglePinMock).toHaveBeenCalledWith(mockMsg);
    });

    it('chama onToggleStar ao clicar em Favoritar/Desfavoritar', () => {
        const onToggleStarMock = vi.fn();

        render(
            <MessageContextMenu
                isOpen={true}
                position={{ x: 100, y: 100 }}
                targetMessage={{ ...mockMsg, is_starred: true }}
                selectedConvo={mockConvo}
                onToggleStar={onToggleStarMock}
            />
        );

        expect(screen.getByText('Desfavoritar')).toBeInTheDocument();
        fireEvent.click(screen.getByTestId('context-menu-star'));
        expect(onToggleStarMock).toHaveBeenCalledWith({ ...mockMsg, is_starred: true });
    });

    it('chama onReact ao clicar em um emoji da barra rápida', () => {
        const onReactMock = vi.fn();

        render(
            <MessageContextMenu
                isOpen={true}
                position={{ x: 100, y: 100 }}
                targetMessage={mockMsg}
                selectedConvo={mockConvo}
                onReact={onReactMock}
            />
        );

        fireEvent.click(screen.getByTitle('Reagir com 😂'));
        expect(onReactMock).toHaveBeenCalledWith(mockMsg, '😂');
    });
});
