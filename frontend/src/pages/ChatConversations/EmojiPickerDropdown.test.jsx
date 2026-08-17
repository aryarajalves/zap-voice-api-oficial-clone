import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EmojiPickerDropdown, { EMOJI_CATEGORIES } from './components/EmojiPickerDropdown';

describe('EmojiPickerDropdown', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('não renderiza nada se isOpen=false', () => {
        const { container } = render(
            <EmojiPickerDropdown
                isOpen={false}
                onClose={vi.fn()}
                onSelectEmoji={vi.fn()}
            />
        );
        expect(container.firstChild).toBeNull();
    });

    it('renderiza categorias e emojis quando isOpen=true', () => {
        render(
            <EmojiPickerDropdown
                isOpen={true}
                onClose={vi.fn()}
                onSelectEmoji={vi.fn()}
            />
        );
        expect(screen.getByPlaceholderText('Buscar emoji...')).toBeInTheDocument();
        const emojis = screen.getAllByTestId('emoji-item');
        expect(emojis.length).toBeGreaterThan(0);
    });

    it('chama onSelectEmoji ao clicar em um emoji', () => {
        const onSelectEmoji = vi.fn();
        render(
            <EmojiPickerDropdown
                isOpen={true}
                onClose={vi.fn()}
                onSelectEmoji={onSelectEmoji}
            />
        );

        const emojiItems = screen.getAllByTestId('emoji-item');
        fireEvent.click(emojiItems[0]);
        expect(onSelectEmoji).toHaveBeenCalledTimes(1);
    });

    it('permite alternar entre categorias', () => {
        render(
            <EmojiPickerDropdown
                isOpen={true}
                onClose={vi.fn()}
                onSelectEmoji={vi.fn()}
            />
        );

        const gesturesCategory = screen.getByTitle('Mãos & Gestos');
        fireEvent.click(gesturesCategory);
        expect(screen.getByText('👏')).toBeInTheDocument();
    });

    it('filtra emojis ao digitar na busca', () => {
        render(
            <EmojiPickerDropdown
                isOpen={true}
                onClose={vi.fn()}
                onSelectEmoji={vi.fn()}
            />
        );

        const searchInput = screen.getByPlaceholderText('Buscar emoji...');
        fireEvent.change(searchInput, { target: { value: '❤️' } });
        const gridItems = screen.getAllByTestId('emoji-item');
        expect(gridItems.length).toBeGreaterThan(0);
        expect(gridItems[0]).toHaveTextContent('❤️');
    });

    it('fecha ao clicar no botão X', () => {
        const onClose = vi.fn();
        render(
            <EmojiPickerDropdown
                isOpen={true}
                onClose={onClose}
                onSelectEmoji={vi.fn()}
            />
        );

        const closeBtn = screen.getByTitle('Fechar seletor de emojis');
        fireEvent.click(closeBtn);
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
