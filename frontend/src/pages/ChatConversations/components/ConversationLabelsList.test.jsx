import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ConversationLabelsList from './ConversationLabelsList';

describe('ConversationLabelsList Unit Tests', () => {
    const mockGetColor = vi.fn((label) => {
        if (label === 'tag1') return '#EF4444';
        if (label === 'tag2') return '#3B82F6';
        return '#10B981';
    });

    it('retorna null se a lista de etiquetas for vazia ou indefinida', () => {
        const { container } = render(<ConversationLabelsList labels={[]} getLabelColor={mockGetColor} />);
        expect(container.firstChild).toBeNull();
    });

    it('renderiza até 3 etiquetas diretamente sem exibir botão +X', () => {
        const labels = ['teste_do_amor', 'pepepopop', 'tete-toto'];
        render(
            <ConversationLabelsList
                labels={labels}
                getLabelColor={mockGetColor}
                contactName="Aryaraj"
                variant="card"
            />
        );

        expect(screen.getByText(/teste_do_amor/i)).toBeDefined();
        expect(screen.getByText(/pepepopop/i)).toBeDefined();
        expect(screen.getByText(/tete-toto/i)).toBeDefined();
        expect(screen.queryByTestId('btn-show-more-labels')).toBeNull();
    });

    it('exibe apenas as 3 primeiras e mostra o botão +X quando houver mais de 3 etiquetas', () => {
        const labels = [
            'teste_do_amor',
            'tettotoklkkkllklklkl',
            'pepepopop',
            'compra_aprovada_bussula',
            'tete-toto',
            'porrrrrrrr'
        ];

        render(
            <ConversationLabelsList
                labels={labels}
                getLabelColor={mockGetColor}
                contactName="Aryaraj"
                variant="card"
            />
        );

        // As 3 primeiras aparecem na interface
        expect(screen.getByText(/teste_do_amor/i)).toBeDefined();
        expect(screen.getByText(/tettotoklkkkllklklkl/i)).toBeDefined();
        expect(screen.getByText(/pepepopop/i)).toBeDefined();

        // O botão +3 deve estar presente
        const moreBtn = screen.getByTestId('btn-show-more-labels');
        expect(moreBtn).toBeDefined();
        expect(moreBtn.textContent).toBe('+3');

        // As etiquetas excedentes NÃO devem estar no documento antes de abrir o modal
        expect(screen.queryByText(/compra_aprovada_bussula/i)).toBeNull();
        expect(screen.queryByText(/porrrrrrrr/i)).toBeNull();
    });

    it('abre o modal popup ao clicar em +X e exibe todas as etiquetas da conversa', () => {
        const labels = [
            'teste_do_amor',
            'tettotoklkkkllklklkl',
            'pepepopop',
            'compra_aprovada_bussula',
            'tete-toto',
            'porrrrrrrr'
        ];

        render(
            <ConversationLabelsList
                labels={labels}
                getLabelColor={mockGetColor}
                contactName="Aryaraj"
                variant="header"
            />
        );

        const moreBtn = screen.getByTestId('btn-show-more-labels');
        fireEvent.click(moreBtn);

        // O modal abre
        expect(screen.getByTestId('conversation-labels-modal')).toBeDefined();
        expect(screen.getByText('Etiquetas da Conversa')).toBeDefined();
        expect(screen.getByText(/Aryaraj/)).toBeDefined();
        expect(screen.getByText('6')).toBeDefined();

        // Agora todas as 6 etiquetas devem estar visíveis no modal
        expect(screen.getAllByText(/teste_do_amor/i).length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText(/compra_aprovada_bussula/i)).toBeDefined();
        expect(screen.getByText(/tete-toto/i)).toBeDefined();
        expect(screen.getByText(/porrrrrrrr/i)).toBeDefined();

        // Clica em fechar
        const closeBtn = screen.getByText('Fechar');
        fireEvent.click(closeBtn);

        // Modal é fechado
        expect(screen.queryByTestId('conversation-labels-modal')).toBeNull();
    });

    it('interrompe a propagação do clique (stopPropagation) ao clicar no botão +X', () => {
        const labels = ['tag1', 'tag2', 'tag3', 'tag4'];
        const parentOnClick = vi.fn();

        render(
            <div onClick={parentOnClick}>
                <ConversationLabelsList
                    labels={labels}
                    getLabelColor={mockGetColor}
                    variant="card"
                />
            </div>
        );

        const moreBtn = screen.getByTestId('btn-show-more-labels');
        fireEvent.click(moreBtn);

        expect(parentOnClick).not.toHaveBeenCalled();
        expect(screen.getByTestId('conversation-labels-modal')).toBeDefined();
    });
});
