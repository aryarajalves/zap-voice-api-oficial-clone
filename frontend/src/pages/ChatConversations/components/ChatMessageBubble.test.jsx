import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import ChatMessageBubble from './ChatMessageBubble';

describe('ChatMessageBubble Unit Tests', () => {
    it('renderiza links clicáveis no texto da mensagem', () => {
        const msg = {
            id: 1,
            sender_type: 'user',
            message_type: 'text',
            content: 'Olá! Acesse www.google.com.br para consultar.',
            timestamp: new Date().toISOString()
        };

        render(
            <ChatMessageBubble
                msg={msg}
                selectedConvo={{ id: 10, contact_name: 'Aryaraj', phone: '5585996123586' }}
                allMessages={[msg]}
                getMediaSrc={() => ''}
                formatMessageTimestamp={() => '10:00'}
            />
        );

        const link = screen.getByRole('link', { name: 'www.google.com.br' });
        expect(link).toBeDefined();
        expect(link.getAttribute('href')).toBe('https://www.google.com.br');
        expect(link.getAttribute('target')).toBe('_blank');
    });

    it('renderiza links https no texto de mensagens recebidas do contato', () => {
        const msg = {
            id: 2,
            sender_type: 'contact',
            message_type: 'text',
            content: 'Segue o link oficial: https://zapvoice.com.br/planos',
            timestamp: new Date().toISOString()
        };

        render(
            <ChatMessageBubble
                msg={msg}
                selectedConvo={{ id: 10, contact_name: 'Aryaraj', phone: '5585996123586' }}
                allMessages={[msg]}
                getMediaSrc={() => ''}
                formatMessageTimestamp={() => '10:05'}
            />
        );

        const link = screen.getByRole('link', { name: 'https://zapvoice.com.br/planos' });
        expect(link).toBeDefined();
        expect(link.getAttribute('href')).toBe('https://zapvoice.com.br/planos');
    });
});
