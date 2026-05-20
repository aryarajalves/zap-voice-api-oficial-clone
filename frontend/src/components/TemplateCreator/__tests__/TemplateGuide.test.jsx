/**
 * Testes unitários para o componente TemplateGuide (Vitest + React Testing Library).
 *
 * Valida:
 * 1. O botão X (fechar) NÃO existe no header.
 * 2. Clicar fora do painel central NÃO fecha o modal.
 * 3. O botão "Entendido!" fecha o modal corretamente.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TemplateGuide from '../components/TemplateGuide';

describe('TemplateGuide', () => {
    const mockOnClose = vi.fn();

    beforeEach(() => {
        mockOnClose.mockClear();
    });

    it('não renderiza nada quando isOpen=false', () => {
        const { container } = render(
            <TemplateGuide isOpen={false} onClose={mockOnClose} />
        );
        expect(container.firstChild).toBeNull();
    });

    it('renderiza o título quando isOpen=true', () => {
        render(<TemplateGuide isOpen={true} onClose={mockOnClose} />);
        expect(screen.getByText('Guia de Criação de Templates')).toBeInTheDocument();
    });

    it('NÃO exibe o botão X no header', () => {
        render(<TemplateGuide isOpen={true} onClose={mockOnClose} />);

        // Deve existir apenas 1 botão: o "Entendido!" no footer
        const allButtons = screen.getAllByRole('button');
        expect(allButtons).toHaveLength(1);
        expect(allButtons[0]).toHaveTextContent('Entendido!');
    });

    it('NÃO fecha ao clicar no backdrop (fora do painel central)', () => {
        render(<TemplateGuide isOpen={true} onClose={mockOnClose} />);

        // Pega o backdrop: o container fixo que cobre a tela inteira
        const backdrop = document.querySelector('.fixed.inset-0');
        expect(backdrop).not.toBeNull();

        // Simula clique diretamente no backdrop (e.target === e.currentTarget)
        fireEvent.click(backdrop);

        // onClose NÃO deve ter sido chamado pois o onClick foi removido
        expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('fecha ao clicar no botão "Entendido!"', () => {
        render(<TemplateGuide isOpen={true} onClose={mockOnClose} />);

        const entendidoBtn = screen.getByText('Entendido!');
        fireEvent.click(entendidoBtn);

        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
});
