import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ReactionEmojiPickerModal from './ReactionEmojiPickerModal';

describe('ReactionEmojiPickerModal Unit Tests', () => {
    const mockMsg = {
        id: 501,
        sender_type: 'contact',
        content: 'Olá, tudo bem?',
        wa_message_id: 'wamid.HBgL...'
    };

    it('não renderiza quando isOpen é false', () => {
        const { container } = render(
            <ReactionEmojiPickerModal
                isOpen={false}
                onClose={vi.fn()}
                targetMessage={mockMsg}
                onSelectEmoji={vi.fn()}
            />
        );
        expect(container.firstChild).toBeNull();
    });

    it('renderiza o modal com título, categorias, campo de busca e grid de emojis', () => {
        render(
            <ReactionEmojiPickerModal
                isOpen={true}
                onClose={vi.fn()}
                targetMessage={mockMsg}
                onSelectEmoji={vi.fn()}
            />
        );

        expect(screen.getByTestId('reaction-emoji-picker-modal')).toBeInTheDocument();
        expect(screen.getByText('Escolha uma Reação')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Buscar emoji...')).toBeInTheDocument();
        expect(screen.getByTestId('reaction-emoji-grid')).toBeInTheDocument();
    });

    it('chama onSelectEmoji e fecha o modal ao clicar em um emoji', () => {
        const onSelectMock = vi.fn();
        const onCloseMock = vi.fn();

        render(
            <ReactionEmojiPickerModal
                isOpen={true}
                onClose={onCloseMock}
                targetMessage={mockMsg}
                onSelectEmoji={onSelectMock}
            />
        );

        const firstEmojiBtn = screen.getAllByTestId('reaction-emoji-item')[0];
        fireEvent.click(firstEmojiBtn);

        expect(onSelectMock).toHaveBeenCalledWith(mockMsg, expect.any(String));
        expect(onCloseMock).toHaveBeenCalled();
    });

    it('permite filtrar emojis pela busca', () => {
        render(
            <ReactionEmojiPickerModal
                isOpen={true}
                onClose={vi.fn()}
                targetMessage={mockMsg}
                onSelectEmoji={vi.fn()}
            />
        );

        const searchInput = screen.getByPlaceholderText('Buscar emoji...');
        fireEvent.change(searchInput, { target: { value: '🔥' } });

        const items = screen.getAllByTestId('reaction-emoji-item');
        expect(items.length).toBeGreaterThan(0);
        expect(items[0]).toHaveTextContent('🔥');
    });

    it('fecha o modal ao clicar no botão Fechar ou no botão X', () => {
        const onCloseMock = vi.fn();

        render(
            <ReactionEmojiPickerModal
                isOpen={true}
                onClose={onCloseMock}
                targetMessage={mockMsg}
                onSelectEmoji={vi.fn()}
            />
        );

        const closeBtn = screen.getByTitle('Fechar');
        fireEvent.click(closeBtn);
        expect(onCloseMock).toHaveBeenCalled();
    });
});
