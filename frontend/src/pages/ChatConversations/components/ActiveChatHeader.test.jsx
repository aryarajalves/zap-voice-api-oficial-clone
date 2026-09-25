import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ActiveChatHeader from './ActiveChatHeader';

describe('ActiveChatHeader - Botão Maximizar Conversa', () => {
    const baseProps = {
        selectedConvo: {
            id: 1,
            contact_name: 'Aryaraj',
            phone: '5585998259497',
            pinned: false,
            urgent: false,
            status: 'open',
            block_status: 'none',
            labels: []
        },
        setSelectedConvo: vi.fn(),
        showRightSidebar: true,
        setShowRightSidebar: vi.fn(),
        engine: {
            timeLeft24h: '23:45:00',
            handleToggleStatus: vi.fn(),
            handleToggleArchive: vi.fn(),
            setIsBlockModalOpen: vi.fn(),
            getLabelColor: vi.fn(() => '#3b82f6'),
            availableLabels: []
        },
        handleTogglePin: vi.fn(),
        handleToggleUrgent: vi.fn(),
        handleUnblockContact: vi.fn(),
        setShowFunnelModal: vi.fn(),
        exportConversationToDoc: vi.fn(),
        activeClientId: 'client-1',
        isOpenAiConfigured: false,
        isAnalyzingAi: false,
        handleAnalyzeSingleChatDoubts: vi.fn(),
        isSearchMode: false,
        setIsSearchMode: vi.fn(),
        isChatMaximized: false,
        setIsChatMaximized: vi.fn()
    };

    it('renderiza o botão de maximizar com título correto quando não maximizado', () => {
        render(<ActiveChatHeader {...baseProps} />);
        const btn = screen.getByTitle('Maximizar conversa');
        expect(btn).toBeDefined();
    });

    it('renderiza o botão de minimizar com título correto quando maximizado', () => {
        render(<ActiveChatHeader {...baseProps} isChatMaximized={true} />);
        const btn = screen.getByTitle('Restaurar layout');
        expect(btn).toBeDefined();
    });

    it('chama setIsChatMaximized com true ao clicar no botão de maximizar', () => {
        const setIsChatMaximized = vi.fn();
        render(<ActiveChatHeader {...baseProps} isChatMaximized={false} setIsChatMaximized={setIsChatMaximized} />);
        const btn = screen.getByTitle('Maximizar conversa');
        fireEvent.click(btn);
        expect(setIsChatMaximized).toHaveBeenCalledWith(true);
    });

    it('chama setIsChatMaximized com false ao clicar no botão de restaurar', () => {
        const setIsChatMaximized = vi.fn();
        render(<ActiveChatHeader {...baseProps} isChatMaximized={true} setIsChatMaximized={setIsChatMaximized} />);
        const btn = screen.getByTitle('Restaurar layout');
        fireEvent.click(btn);
        expect(setIsChatMaximized).toHaveBeenCalledWith(false);
    });

    it('aplica estilo visual ativo (amber) quando maximizado', () => {
        render(<ActiveChatHeader {...baseProps} isChatMaximized={true} />);
        const btn = screen.getByTitle('Restaurar layout');
        expect(btn.className).toContain('bg-amber-500/15');
        expect(btn.className).toContain('border-amber-500/30');
    });

    it('aplica estilo visual inativo quando não maximizado', () => {
        render(<ActiveChatHeader {...baseProps} isChatMaximized={false} />);
        const btn = screen.getByTitle('Maximizar conversa');
        expect(btn.className).not.toContain('bg-amber-500/15');
    });
});
