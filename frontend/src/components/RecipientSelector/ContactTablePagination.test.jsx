import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';
import ContactTable from './components/ContactList/ContactTable';

describe('ContactTable - Paginação e Seleção em Lote', () => {
  const mockContacts = Array.from({ length: 120 }, (_, idx) => ({
    phone: `55119000000${idx.toString().padStart(2, '0')}`,
    vars: { var1: `Nome ${idx}` },
    status: 'pending'
  }));

  it('deve renderizar 50 contatos por padrão e permitir trocar a quantidade por página', () => {
    render(
      <ContactTable
        displayedContacts={mockContacts.slice(0, 50)}
        filteredContacts={mockContacts}
        filteredContactsCount={120}
        activeVarColumns={[]}
      />
    );

    // Verificar se o seletor de itens por página mostra 50 por padrão
    const select = screen.getByRole('combobox');
    expect(select.value).toBe('50');

    // Trocar para 100 por página
    fireEvent.change(select, { target: { value: '100' } });
    expect(select.value).toBe('100');
  });

  it('deve permitir a seleção em lote de contatos', () => {
    const setContactsMock = vi.fn();
    render(
      <ContactTable
        displayedContacts={mockContacts.slice(0, 50)}
        filteredContacts={mockContacts}
        filteredContactsCount={120}
        activeVarColumns={[]}
        setContacts={setContactsMock}
      />
    );

    // Selecionar o primeiro checkbox de linha
    const checkboxes = screen.getAllByRole('checkbox');
    // Index 0 é o master, Index 1 é a primeira linha
    fireEvent.click(checkboxes[1]);

    // A barra de ação em lote deve aparecer com "1 selecionado"
    expect(screen.getByText(/1 selecionado/i)).toBeInTheDocument();
  });
});
