import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PinnedMessageBanner from './PinnedMessageBanner';

describe('PinnedMessageBanner Unit Tests', () => {
    const mockMessages = [
        { id: 1, content: 'Primeira mensagem', sender_type: 'contact' },
        { id: 2, content: 'Mensagem fixada importante sobre o plano VIP', sender_type: 'user' },
    ];

    const mockConvo = {
        id: 10,
        contact_name: 'Carlos Silva',
        phone: '5511999990000',
        pinned_message_id: 2
    };

    it('não renderiza quando não há pinnedMessageId', () => {
        const { container } = render(
            <PinnedMessageBanner
                pinnedMessageId={null}
                allMessages={mockMessages}
                selectedConvo={mockConvo}
            />
        );
        expect(container.firstChild).toBeNull();
    });

    it('renderiza o conteúdo e autor da mensagem fixada', () => {
        render(
            <PinnedMessageBanner
                pinnedMessageId={2}
                allMessages={mockMessages}
                selectedConvo={mockConvo}
            />
        );

        expect(screen.getByTestId('pinned-message-banner')).toBeInTheDocument();
        expect(screen.getByText('Mensagem Fixada')).toBeInTheDocument();
        expect(screen.getByText(/Você/)).toBeInTheDocument();
        expect(screen.getByText('Mensagem fixada importante sobre o plano VIP')).toBeInTheDocument();
    });

    it('chama onScrollToMessage ao clicar no banner', () => {
        const onScrollMock = vi.fn();

        render(
            <PinnedMessageBanner
                pinnedMessageId={2}
                allMessages={mockMessages}
                selectedConvo={mockConvo}
                onScrollToMessage={onScrollMock}
            />
        );

        fireEvent.click(screen.getByTestId('pinned-message-banner'));
        expect(onScrollMock).toHaveBeenCalledWith(2);
    });

    it('chama onUnpin ao clicar no botão de fechar/desafixar', () => {
        const onUnpinMock = vi.fn();

        render(
            <PinnedMessageBanner
                pinnedMessageId={2}
                allMessages={mockMessages}
                selectedConvo={mockConvo}
                onUnpin={onUnpinMock}
            />
        );

        const unpinBtn = screen.getByTitle('Desafixar mensagem');
        fireEvent.click(unpinBtn);
        expect(onUnpinMock).toHaveBeenCalledWith(mockMessages[1]);
    });
});
