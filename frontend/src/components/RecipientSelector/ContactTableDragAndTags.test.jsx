import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import ContactTable from './components/ContactList/ContactTable';

// Mock do fetchWithAuth e API_URL
vi.mock('../../AuthContext', () => ({
  fetchWithAuth: vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      '5535984297193': {
        is_registered: true,
        name: 'Douglas',
        tags: ['aryaraj', 'vip']
      },
      '5511984913214': {
        is_registered: false,
        name: null,
        tags: []
      }
    })
  })
}));

vi.mock('../../contexts/ClientContext', () => ({
  useClient: () => ({
    activeClient: { id: 1, name: 'Cliente Teste' }
  })
}));

describe('ContactTable - Drag-to-Scroll e Consulta de Etiquetas da Aba Contatos', () => {
  const mockContacts = [
    {
      phone: '5535984297193',
      vars: { '1': 'Douglas' },
      status: 'verified',
      window_open: true
    },
    {
      phone: '5511984913214',
      vars: { '1': 'Lead Dois' },
      status: 'verified',
      window_open: false
    }
  ];

  it('deve renderizar a dica de navegação por arraste e o container com cursor-grab', () => {
    render(
      <ContactTable
        displayedContacts={mockContacts}
        filteredContacts={mockContacts}
        filteredContactsCount={2}
        activeVarColumns={[{ key: '1', label: 'Nome' }]}
        showValidation={true}
      />
    );

    // Verificar se a dica de arraste do mouse é renderizada
    expect(screen.getByText(/Segure com o botão esquerdo para arrastar a tabela/i)).toBeInTheDocument();

    // Verificar se o botão de consultar etiquetas da aba contatos está presente
    const toggleButton = screen.getByRole('button', { name: /Ver Etiquetas da Aba Contatos/i });
    expect(toggleButton).toBeInTheDocument();
  });

  it('deve ativar a coluna de etiquetas e exibir os dados dos contatos ao clicar no botão', async () => {
    render(
      <ContactTable
        displayedContacts={mockContacts}
        filteredContacts={mockContacts}
        filteredContactsCount={2}
        activeVarColumns={[{ key: '1', label: 'Nome' }]}
        showValidation={true}
      />
    );

    const toggleButton = screen.getByRole('button', { name: /Ver Etiquetas da Aba Contatos/i });
    fireEvent.click(toggleButton);

    // O cabeçalho da coluna deve ser exibido
    expect(await screen.findByText(/Aba Contatos \/ Etiquetas/i)).toBeInTheDocument();

    // Deve exibir as tags do contato cadastrado
    expect(await screen.findByText('aryaraj')).toBeInTheDocument();
    expect(screen.getByText('vip')).toBeInTheDocument();

    // Deve exibir o badge de Não Cadastrado para o contato não registrado
    expect(screen.getByText(/Não Cadastrado/i)).toBeInTheDocument();
  });

  it('deve renderizar o botão Ver Excluídos e o badge de exclusão quando houver contatos excluídos', () => {
    const handleSetFilterExcluded = vi.fn();

    render(
      <ContactTable
        displayedContacts={mockContacts}
        filteredContacts={mockContacts}
        filteredContactsCount={2}
        exclusionList={['5535984297193']}
        excludedCount={1}
        filterExcludedOnly={false}
        setFilterExcludedOnly={handleSetFilterExcluded}
        showValidation={true}
      />
    );

    // Botão Ver Excluídos (1)
    const btn = screen.getByRole('button', { name: /Ver Excluídos \(1\)/i });
    expect(btn).toBeInTheDocument();

    fireEvent.click(btn);
    expect(handleSetFilterExcluded).toHaveBeenCalledWith(true);

    // Badge de Filtro Exclusão no contato
    expect(screen.getAllByText(/Filtro Exclusão/i).length).toBeGreaterThan(0);
  });
});
