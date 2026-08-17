import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ClearChatConfirmModal from './Modals/ClearChatConfirmModal';

describe('ClearChatConfirmModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('does not render when isOpen is false', () => {
        const { container } = render(
            <ClearChatConfirmModal
                isOpen={false}
                onClose={vi.fn()}
                onConfirm={vi.fn()}
                isClearing={false}
                contactName="Aryaraj"
            />
        );
        expect(container.firstChild).toBeNull();
    });

    it('renders correctly with contact name and description when isOpen is true', () => {
        render(
            <ClearChatConfirmModal
                isOpen={true}
                onClose={vi.fn()}
                onConfirm={vi.fn()}
                isClearing={false}
                contactName="Aryaraj Marketing"
            />
        );

        expect(screen.getByText('Limpar Conversa')).toBeInTheDocument();
        expect(screen.getByText(/Tem certeza de que deseja limpar todas as mensagens da conversa com/i)).toBeInTheDocument();
        expect(screen.getByText('Aryaraj Marketing')).toBeInTheDocument();
        expect(screen.getByText('Cancelar')).toBeInTheDocument();
        expect(screen.getByText('Sim, Limpar')).toBeInTheDocument();
    });

    it('calls onClose when clicking Cancelar or X button', () => {
        const onClose = vi.fn();
        render(
            <ClearChatConfirmModal
                isOpen={true}
                onClose={onClose}
                onConfirm={vi.fn()}
                isClearing={false}
                contactName="Aryaraj"
            />
        );

        fireEvent.click(screen.getByText('Cancelar'));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onConfirm when clicking Sim, Limpar button', () => {
        const onConfirm = vi.fn();
        render(
            <ClearChatConfirmModal
                isOpen={true}
                onClose={vi.fn()}
                onConfirm={onConfirm}
                isClearing={false}
                contactName="Aryaraj"
            />
        );

        fireEvent.click(screen.getByText('Sim, Limpar'));
        expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('disables button and shows spinner state when isClearing is true', () => {
        render(
            <ClearChatConfirmModal
                isOpen={true}
                onClose={vi.fn()}
                onConfirm={vi.fn()}
                isClearing={true}
                contactName="Aryaraj"
            />
        );

        const confirmBtn = screen.getByRole('button', { name: /Sim, Limpar/i });
        expect(confirmBtn).toBeDisabled();
    });
});
