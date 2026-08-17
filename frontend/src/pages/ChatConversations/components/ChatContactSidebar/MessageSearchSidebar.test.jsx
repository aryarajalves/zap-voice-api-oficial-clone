import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MessageSearchSidebar from './MessageSearchSidebar';

describe('MessageSearchSidebar component', () => {
    it('renderiza o cabeçalho e campo de pesquisa', () => {
        render(
            <MessageSearchSidebar
                convoId={100}
                activeClientId={1}
                onClose={() => {}}
                onSelectMessage={() => {}}
            />
        );

        expect(screen.getByText('Pesquisar mensagens')).toBeDefined();
        expect(screen.getByPlaceholderText('Pesquisar...')).toBeDefined();
    });

    it('chama onClose ao clicar no botão de voltar', () => {
        const onClose = vi.fn();
        render(
            <MessageSearchSidebar
                convoId={100}
                activeClientId={1}
                onClose={onClose}
                onSelectMessage={() => {}}
            />
        );

        const backBtn = screen.getByTitle('Voltar para informações do contato');
        fireEvent.click(backBtn);
        expect(onClose).toHaveBeenCalled();
    });

    it('abre e fecha o seletor de data ao clicar no botão de calendário', () => {
        render(
            <MessageSearchSidebar
                convoId={100}
                activeClientId={1}
                onClose={() => {}}
                onSelectMessage={() => {}}
            />
        );

        const calendarBtn = screen.getByTitle('Filtrar por data');
        fireEvent.click(calendarBtn);

        expect(screen.getByText('Data:')).toBeDefined();
    });
});
