import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DeleteConvoModal from './DeleteConvoModal';

describe('DeleteConvoModal Component', () => {
    it('não deve renderizar quando isOpen for false', () => {
        const { container } = render(
            <DeleteConvoModal
                isOpen={false}
                onClose={vi.fn()}
                onConfirm={vi.fn()}
            />
        );
        expect(container.firstChild).toBeNull();
    });

    it('deve renderizar o estado de confirmação (idle) com botões Cancelar e Deletar', () => {
        render(
            <DeleteConvoModal
                isOpen={true}
                contactName="Maria Silva"
                onClose={vi.fn()}
                onConfirm={vi.fn()}
            />
        );

        expect(screen.getByText('Deletar conversa de Maria Silva?')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /^deletar$/i })).toBeInTheDocument();
    });

    it('deve disparar onClose ao clicar em Cancelar', () => {
        const handleClose = vi.fn();
        render(
            <DeleteConvoModal
                isOpen={true}
                onClose={handleClose}
                onConfirm={vi.fn()}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
        expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('deve exibir o estado de loading e em seguida a tela de sucesso com botão Fechar', async () => {
        let resolveConfirm;
        const confirmPromise = new Promise((resolve) => {
            resolveConfirm = resolve;
        });
        const handleConfirm = vi.fn().mockImplementation(() => confirmPromise);
        const handleClose = vi.fn();

        render(
            <DeleteConvoModal
                isOpen={true}
                contactName="João Santos"
                onClose={handleClose}
                onConfirm={handleConfirm}
            />
        );

        // Clica em Deletar
        fireEvent.click(screen.getByRole('button', { name: /^deletar$/i }));

        // Deve exibir o estado de carregamento/deletando
        expect(screen.getByTestId('delete-loading-state')).toBeInTheDocument();
        expect(screen.getByText('Deletando contato...')).toBeInTheDocument();
        expect(screen.getByText(/Aguarde enquanto os dados e mensagens estão sendo removidos/i)).toBeInTheDocument();

        // Resolve a exclusão com sucesso
        resolveConfirm(true);

        // Deve transicionar para o estado de sucesso
        await waitFor(() => {
            expect(screen.getByTestId('delete-success-state')).toBeInTheDocument();
        });

        expect(screen.getByText('Contato deletado com sucesso!')).toBeInTheDocument();
        expect(screen.getByText(/O contato e todo o histórico de mensagens foram excluídos permanentemente/i)).toBeInTheDocument();
        
        // Verifica o botão de fechar
        const closeBtn = screen.getByRole('button', { name: /fechar/i });
        expect(closeBtn).toBeInTheDocument();

        // Clica no botão Fechar
        fireEvent.click(closeBtn);
        expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('deve exibir o estado de erro quando a exclusão falhar', async () => {
        const handleConfirm = vi.fn().mockResolvedValue(false);
        const handleClose = vi.fn();

        render(
            <DeleteConvoModal
                isOpen={true}
                onClose={handleClose}
                onConfirm={handleConfirm}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: /^deletar$/i }));

        await waitFor(() => {
            expect(screen.getByTestId('delete-error-state')).toBeInTheDocument();
        });

        expect(screen.getByText('Falha ao deletar')).toBeInTheDocument();
        const closeBtn = screen.getByRole('button', { name: /fechar/i });
        expect(closeBtn).toBeInTheDocument();

        fireEvent.click(closeBtn);
        expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('deve exibir títulos adequados para deleção em massa (isBulk)', async () => {
        const handleConfirm = vi.fn().mockResolvedValue(true);
        render(
            <DeleteConvoModal
                isOpen={true}
                isBulk={true}
                selectedCount={5}
                onClose={vi.fn()}
                onConfirm={handleConfirm}
            />
        );

        expect(screen.getByText('Deletar 5 conversa(s)?')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /^deletar$/i }));

        await waitFor(() => {
            expect(screen.getByText('Conversas deletadas com sucesso!')).toBeInTheDocument();
        });
    });
});
