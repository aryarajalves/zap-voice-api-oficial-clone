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

    it('renderiza badge de custo da IA com Pré-Router e Agente Principal na parte inferior da mensagem', () => {
        const msgWithAiCost = {
            id: 3,
            sender_type: 'user',
            message_type: 'text',
            content: 'O Método Laser Day é 100% online.',
            timestamp: new Date().toISOString(),
            meta_data: {
                total_cost: 0.0025,
                router_cost: 0.0004,
                agent_cost: 0.0021
            }
        };

        render(
            <ChatMessageBubble
                msg={msgWithAiCost}
                selectedConvo={{ id: 10, contact_name: 'Aryaraj', phone: '5585996123586' }}
                allMessages={[msgWithAiCost]}
                getMediaSrc={() => ''}
                formatMessageTimestamp={() => '19:05'}
            />
        );

        expect(screen.getByText('⚡ IA:')).toBeInTheDocument();
        expect(screen.getByText('R$ 0.014')).toBeInTheDocument();
        expect(screen.getByText(/Router: R\$ 0.0022/)).toBeInTheDocument();
        expect(screen.getByText(/Agente: R\$ 0.012/)).toBeInTheDocument();
    });

    it('renderiza ícones de fixada e favoritada quando a mensagem possui esses atributos', () => {
        const msgPinnedAndStarred = {
            id: 4,
            sender_type: 'contact',
            message_type: 'text',
            content: 'Mensagem com estrela e alfinete',
            timestamp: new Date().toISOString(),
            is_starred: true
        };

        render(
            <ChatMessageBubble
                msg={msgPinnedAndStarred}
                selectedConvo={{ id: 10, contact_name: 'Aryaraj', phone: '5585996123586', pinned_message_id: 4 }}
                allMessages={[msgPinnedAndStarred]}
                getMediaSrc={() => ''}
                formatMessageTimestamp={() => '11:20'}
            />
        );

        expect(screen.getByTitle('Mensagem fixada nesta conversa')).toBeInTheDocument();
        expect(screen.getByTitle('Mensagem favoritada')).toBeInTheDocument();
    });

    it('renderiza badge de custo da IA como Gratuito quando o custo total for 0', () => {
        const msgFreeAi = {
            id: 5,
            sender_type: 'user',
            message_type: 'text',
            content: 'Por nada! Se precisar de mais alguma coisa, é só chamar.',
            timestamp: new Date().toISOString(),
            meta_data: {
                total_cost: 0,
                router_cost: 0,
                agent_cost: 0
            }
        };

        render(
            <ChatMessageBubble
                msg={msgFreeAi}
                selectedConvo={{ id: 10, contact_name: 'Aryaraj', phone: '5585996123586' }}
                allMessages={[msgFreeAi]}
                getMediaSrc={() => ''}
                formatMessageTimestamp={() => '09:12'}
            />
        );

        expect(screen.getByText('⚡ IA:')).toBeInTheDocument();
        expect(screen.getByText('Gratuito')).toBeInTheDocument();
    });
});
