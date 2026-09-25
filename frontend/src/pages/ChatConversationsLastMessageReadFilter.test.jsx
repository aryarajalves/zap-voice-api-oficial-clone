import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ChatListFilters from './ChatConversations/components/ChatListFilters';

describe('ChatListFilters - Filtros Viu / Não viu última mensagem', () => {
    it('deve exibir os botões na aba de Status e alternar corretamente entre eles', () => {
        const setFilterLastMessageRead = vi.fn();
        const setFilterLastMessageUnread = vi.fn();
        const setActiveFilterTab = vi.fn();

        const { rerender } = render(
            <ChatListFilters
                activeTab="todos"
                statusFilter="open"
                activeFilterTab="status"
                setActiveFilterTab={setActiveFilterTab}
                filterLastMessageRead={false}
                setFilterLastMessageRead={setFilterLastMessageRead}
                filterLastMessageUnread={false}
                setFilterLastMessageUnread={setFilterLastMessageUnread}
            />
        );

        // Verificar se os botões existem
        const btnViu = screen.getByText('Viu última msg');
        const btnNaoViu = screen.getByText('Não viu última msg');

        expect(btnViu).toBeInTheDocument();
        expect(btnNaoViu).toBeInTheDocument();

        // Clicar em "Viu última msg"
        fireEvent.click(btnViu);
        expect(setFilterLastMessageRead).toHaveBeenCalledWith(true);
        expect(setFilterLastMessageUnread).toHaveBeenCalledWith(false);

        // Rerender com filterLastMessageRead ativo
        rerender(
            <ChatListFilters
                activeTab="todos"
                statusFilter="open"
                activeFilterTab="status"
                setActiveFilterTab={setActiveFilterTab}
                filterLastMessageRead={true}
                setFilterLastMessageRead={setFilterLastMessageRead}
                filterLastMessageUnread={false}
                setFilterLastMessageUnread={setFilterLastMessageUnread}
            />
        );

        expect(screen.getByText('Viu última msg').className).toContain('bg-sky-500');

        // Clicar em "Não viu última msg"
        fireEvent.click(btnNaoViu);
        expect(setFilterLastMessageUnread).toHaveBeenCalledWith(true);
        expect(setFilterLastMessageRead).toHaveBeenCalledWith(false);
    });
});
