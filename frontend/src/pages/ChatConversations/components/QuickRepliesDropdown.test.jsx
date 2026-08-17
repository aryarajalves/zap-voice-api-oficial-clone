import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import QuickRepliesDropdown from './QuickRepliesDropdown';

const mockQuickMessages = [
    {
        id: 1,
        shortcut: 'pix',
        title: 'Chave PIX e Instruções',
        content: 'Olá {{nome}}, segue a chave pix: contato@zapvoice.com'
    },
    {
        id: 2,
        shortcut: 'ola',
        title: 'Boas-vindas Padrão',
        content: 'Olá {{primeiro_nome}}, como posso te ajudar hoje?'
    }
];

describe('QuickRepliesDropdown', () => {
    it('não renderiza nada se isOpen for false ou lista vazia', () => {
        const { container } = render(
            <QuickRepliesDropdown
                isOpen={false}
                quickMessages={mockQuickMessages}
                onSelect={vi.fn()}
            />
        );
        expect(container.firstChild).toBeNull();
    });

    it('renderiza o dropdown com a lista de respostas rápidas quando isOpen for true', () => {
        render(
            <QuickRepliesDropdown
                isOpen={true}
                quickMessages={mockQuickMessages}
                selectedIndex={0}
                onSelect={vi.fn()}
            />
        );

        expect(screen.getByText('Respostas Rápidas')).toBeInTheDocument();
        expect(screen.getByText('/pix')).toBeInTheDocument();
        expect(screen.getByText('Chave PIX e Instruções')).toBeInTheDocument();
        expect(screen.getByText('/ola')).toBeInTheDocument();
        expect(screen.getByText('Boas-vindas Padrão')).toBeInTheDocument();
    });

    it('dispara onSelect com o item correto ao clicar em uma opção', () => {
        const onSelect = vi.fn();
        render(
            <QuickRepliesDropdown
                isOpen={true}
                quickMessages={mockQuickMessages}
                selectedIndex={1}
                onSelect={onSelect}
            />
        );

        const pixOption = screen.getByText('/pix').closest('div[role="option"]');
        fireEvent.mouseDown(pixOption);

        expect(onSelect).toHaveBeenCalledWith(mockQuickMessages[0]);
    });

    it('renderiza paginação quando houver mais de 5 mensagens e permite navegar entre páginas', () => {
        const manyMessages = Array.from({ length: 12 }, (_, i) => ({
            id: i + 1,
            shortcut: `msg${i + 1}`,
            title: `Título ${i + 1}`,
            content: `Conteúdo da mensagem ${i + 1}`
        }));

        const onSelect = vi.fn();
        render(
            <QuickRepliesDropdown
                isOpen={true}
                quickMessages={manyMessages}
                selectedIndex={0}
                onSelect={onSelect}
            />
        );

        // Verifica itens da primeira página (1 a 5)
        expect(screen.getByText('/msg1')).toBeInTheDocument();
        expect(screen.getByText('/msg5')).toBeInTheDocument();
        expect(screen.queryByText('/msg6')).not.toBeInTheDocument();

        // Verifica indicador de páginas
        expect(screen.getByText(/Página/i)).toBeInTheDocument();
        expect(screen.getByText(/1-5 de 12/i)).toBeInTheDocument();

        // Clica para ir para a próxima página
        const nextBtn = screen.getByTitle('Próxima Página');
        fireEvent.mouseDown(nextBtn);

        // Agora deve exibir itens da página 2 (6 a 10)
        expect(screen.getByText('/msg6')).toBeInTheDocument();
        expect(screen.getByText('/msg10')).toBeInTheDocument();
        expect(screen.queryByText('/msg1')).not.toBeInTheDocument();
    });
});
