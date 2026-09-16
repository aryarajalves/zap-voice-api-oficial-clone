import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ActiveChatHeader from './components/ActiveChatHeader';
import SystemMessageBubble from './components/SystemMessageBubble';

describe('ChatConversations - Badges de Marcadores e Etiquetas', () => {
    it('ActiveChatHeader deve renderizar badges de etiquetas quando a conversa possuir labels', () => {
        const selectedConvo = {
            id: 28015,
            phone: '5585998259497',
            contact_name: 'Aryaraj',
            status: 'open',
            labels: ['lead_bussola', 'vip_cliente']
        };

        const mockGetLabelColor = vi.fn((label) => {
            if (label === 'lead_bussola') return '#10B981';
            return '#3B82F6';
        });

        render(
            <ActiveChatHeader
                selectedConvo={selectedConvo}
                setSelectedConvo={vi.fn()}
                showRightSidebar={false}
                setShowRightSidebar={vi.fn()}
                engine={{
                    timeLeft24h: '18:30:00',
                    handleToggleStatus: vi.fn(),
                    handleToggleArchive: vi.fn(),
                    getLabelColor: mockGetLabelColor,
                    messages: []
                }}
                handleTogglePin={vi.fn()}
                handleToggleUrgent={vi.fn()}
                handleUnblockContact={vi.fn()}
                setShowFunnelModal={vi.fn()}
                exportConversationToDoc={vi.fn()}
            />
        );

        const container = screen.getByTestId('chat-header-labels');
        expect(container).toBeInTheDocument();
        expect(screen.getByText('lead_bussola')).toBeInTheDocument();
        expect(screen.getByText('vip_cliente')).toBeInTheDocument();
        expect(mockGetLabelColor).toHaveBeenCalledWith('lead_bussola');
    });

    it('ActiveChatHeader não deve renderizar container de badges quando não houver labels', () => {
        const selectedConvo = {
            id: 28015,
            phone: '5585998259497',
            contact_name: 'Aryaraj',
            status: 'open',
            labels: []
        };

        render(
            <ActiveChatHeader
                selectedConvo={selectedConvo}
                setSelectedConvo={vi.fn()}
                showRightSidebar={false}
                setShowRightSidebar={vi.fn()}
                engine={{
                    timeLeft24h: '18:30:00',
                    handleToggleStatus: vi.fn(),
                    handleToggleArchive: vi.fn(),
                    messages: []
                }}
                handleTogglePin={vi.fn()}
                handleToggleUrgent={vi.fn()}
                handleUnblockContact={vi.fn()}
                setShowFunnelModal={vi.fn()}
                exportConversationToDoc={vi.fn()}
            />
        );

        expect(screen.queryByTestId('chat-header-labels')).not.toBeInTheDocument();
    });

    it('SystemMessageBubble deve renderizar badge para etiqueta entre aspas via funil', () => {
        const msg = {
            id: 1,
            sender_type: 'system',
            message_type: 'text',
            content: "Marcador(es) 'lead_bussola' adicionado(s) via Funil em 16/09/2026 às 16:08",
            timestamp: new Date().toISOString()
        };

        render(
            <SystemMessageBubble
                msg={msg}
                isHighlighted={false}
                formatMessageTimestamp={() => '16:08'}
                engine={{
                    getLabelColor: () => '#10B981'
                }}
            />
        );

        expect(screen.getByText('lead_bussola')).toBeInTheDocument();
    });

    it('SystemMessageBubble deve renderizar múltiplos badges para marcadores adicionados por atendente', () => {
        const msg = {
            id: 2,
            sender_type: 'system',
            message_type: 'text',
            content: 'O atendente Super Admin adicionou marcador(es): 24-horas, robo, whatsapp',
            timestamp: new Date().toISOString()
        };

        render(
            <SystemMessageBubble
                msg={msg}
                isHighlighted={false}
                formatMessageTimestamp={() => '16:09'}
                engine={{
                    getLabelColor: () => '#3B82F6'
                }}
            />
        );

        expect(screen.getByText('24-horas')).toBeInTheDocument();
        expect(screen.getByText('robo')).toBeInTheDocument();
        expect(screen.getByText('whatsapp')).toBeInTheDocument();
    });
});
