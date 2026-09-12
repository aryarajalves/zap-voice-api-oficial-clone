import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ContactList from './index';

describe('ContactList Toolbar e Painel Unificado', () => {
    const mockContacts = [
        { phone: '5511999990001', name: 'Contato 1', status: 'pending' },
        { phone: '5511999990002', name: 'Contato 2', status: 'pending' }
    ];

    it('deve renderizar o título, contador e botões de ação dentro do painel unificado', () => {
        const setContacts = vi.fn();
        const clearAll = vi.fn();

        render(
            <ContactList
                title="Destinatários"
                contacts={mockContacts}
                setContacts={setContacts}
                clearAll={clearAll}
                searchTerm=""
                setSearchTerm={vi.fn()}
                dddSearch=""
                setDddSearch={vi.fn()}
                filterOpenOnly={false}
                setFilterOpenOnly={vi.fn()}
                filterBlockedOnly={false}
                setFilterBlockedOnly={vi.fn()}
                blockedCount={0}
                filterExcludedOnly={false}
                setFilterExcludedOnly={vi.fn()}
                excludedCount={0}
                selectedList={mockContacts}
                displayedContacts={mockContacts}
                filteredContacts={mockContacts}
                displayLimit={50}
                setDisplayLimit={vi.fn()}
            />
        );

        // Verifica se o título e o badge aparecem
        expect(screen.getByText('Destinatários')).toBeInTheDocument();
        const countBadges = screen.getAllByText('2');
        expect(countBadges.length).toBeGreaterThan(0);

        // Verifica os botões Inverter Ordem e Limpar Lista
        const reverseBtn = screen.getByTitle(/Inverter a ordem da lista/i);
        expect(reverseBtn).toBeInTheDocument();
        expect(reverseBtn).toHaveTextContent(/Inverter Ordem/i);

        const clearBtn = screen.getByText(/Limpar Lista/i);
        expect(clearBtn).toBeInTheDocument();

        // Testa cliques nos botões
        fireEvent.click(reverseBtn);
        expect(setContacts).toHaveBeenCalledTimes(1);

        fireEvent.click(clearBtn);
        expect(clearAll).toHaveBeenCalledTimes(1);
    });
});
