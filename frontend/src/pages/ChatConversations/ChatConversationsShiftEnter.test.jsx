import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Unit tests verifying textarea keydown behavior (Shift+Enter vs Enter) for chat input
describe('Chat Input Field Shift+Enter functionality', () => {
    it('allows Shift+Enter to insert a newline without calling handleSendMessage', () => {
        const handleSendMessage = vi.fn();
        let messageText = 'Linha 1';

        const handleKeyDown = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
            }
        };

        const handleChange = (e) => {
            messageText = e.target.value;
        };

        const { getByPlaceholderText } = render(
            <textarea
                placeholder="Digite sua mensagem de resposta..."
                value={messageText}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
            />
        );

        const textarea = getByPlaceholderText('Digite sua mensagem de resposta...');

        // Simulate pressing Shift+Enter
        fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

        // handleSendMessage must NOT be called when Shift is held
        expect(handleSendMessage).not.toHaveBeenCalled();
    });

    it('triggers handleSendMessage on Enter without Shift', () => {
        const handleSendMessage = vi.fn();
        const messageText = 'Mensagem de teste';

        const handleKeyDown = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (messageText.trim()) {
                    handleSendMessage(e);
                }
            }
        };

        const { getByPlaceholderText } = render(
            <textarea
                placeholder="Digite sua mensagem de resposta..."
                value={messageText}
                onChange={() => {}}
                onKeyDown={handleKeyDown}
            />
        );

        const textarea = getByPlaceholderText('Digite sua mensagem de resposta...');

        // Simulate pressing Enter alone
        fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

        // handleSendMessage MUST be called when Enter alone is pressed
        expect(handleSendMessage).toHaveBeenCalledTimes(1);
    });
});
