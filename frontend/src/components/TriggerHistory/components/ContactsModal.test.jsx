import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import ContactsModal from './ContactsModal';
import { fetchWithAuth } from '../../../AuthContext';

vi.mock('../../../config', () => ({
  API_URL: 'http://localhost:8000',
}));

vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

vi.mock('../../../AuthContext', () => ({
  fetchWithAuth: vi.fn(),
}));

vi.mock('../../../contexts/ClientContext', () => ({
  useClient: () => ({ activeClient: { id: 1 } }),
}));

const mockContacts = [
  {
    phone_number: '5511999999999',
    contact_name: 'Cliente Teste 1',
    status: 'delivered',
    message_type: 'TEMPLATE',
    is_interaction: true,
    updated_at: '2026-05-23T18:07:52Z',
  },
  {
    phone_number: '5511888888888',
    contact_name: 'Cliente Teste 2',
    status: 'sent',
    message_type: 'FREE_MESSAGE',
    is_interaction: false,
    updated_at: '2026-05-23T18:10:00Z',
  }
];

describe('ContactsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = {
    contactsModal: {
      isOpen: true,
      title: 'Interações — teste',
      isTemplate: true,
      showTabs: true,
      contacts: mockContacts,
      counts: { total: 2, sent: 1, delivered: 1 },
    },
    setContactsModal: vi.fn(),
    contactsFilter: 'all',
    setContactsFilter: vi.fn(),
    contactsTypeFilter: 'all',
    setContactsTypeFilter: vi.fn(),
    loadingContacts: false,
  };

  it('renderiza o modal e lista de contatos com checkboxes', () => {
    render(<ContactsModal {...defaultProps} />);

    expect(screen.getByText('Interações — teste')).toBeInTheDocument();
    expect(screen.getByText('5511999999999')).toBeInTheDocument();
    expect(screen.getByText('5511888888888')).toBeInTheDocument();
    
    // Devem existir 3 checkboxes: 1 do "Selecionar Todos" e 2 dos contatos
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(3);
  });

  it('permite selecionar contatos individualmente e exibe botão de etiquetar', async () => {
    render(<ContactsModal {...defaultProps} />);

    // Botão de etiquetar não deve estar visível antes de selecionar
    expect(screen.queryByRole('button', { name: /etiquetar/i })).not.toBeInTheDocument();

    const checkboxes = screen.getAllByRole('checkbox');
    
    // Selecionar o primeiro contato
    fireEvent.click(checkboxes[1]);

    // Botão de etiquetar deve aparecer
    const tagButton = screen.getByRole('button', { name: /etiquetar \(1\)/i });
    expect(tagButton).toBeInTheDocument();
  });

  it('seleciona todos os contatos ao clicar no checkbox geral', () => {
    render(<ContactsModal {...defaultProps} />);

    const checkboxes = screen.getAllByRole('checkbox');
    
    // Clicar no "Selecionar Todos" (checkboxes[0])
    fireEvent.click(checkboxes[0]);

    // Botão de etiquetar deve exibir a quantidade total de contatos (2)
    const tagButton = screen.getByRole('button', { name: /etiquetar \(2\)/i });
    expect(tagButton).toBeInTheDocument();
  });

  it('abre o modal de etiquetas ao clicar em etiquetar e envia tags para a API com sucesso', async () => {
    // Mock do fetch de tags existentes
    vi.mocked(fetchWithAuth).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tags: ['Cliente Fiel', 'Interessado'] }),
    });

    render(<ContactsModal {...defaultProps} />);

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]); // Seleciona todos

    const tagButton = screen.getByRole('button', { name: /etiquetar \(2\)/i });
    fireEvent.click(tagButton);

    // Deve abrir o modal de etiquetas
    expect(screen.getByText('Adicionar Etiquetas')).toBeInTheDocument();

    // Mock da chamada de bulk save
    vi.mocked(fetchWithAuth).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'success', imported: 2 }),
    });

    // Simula foco no input de tags para abrir dropdown
    const dropdownTrigger = screen.getByPlaceholderText('Digite ou selecione uma etiqueta...');
    fireEvent.focus(dropdownTrigger);

    // Aguardar que as tags carreguem e selecionar a tag 'Cliente Fiel'
    await waitFor(() => {
      expect(screen.getByText('Cliente Fiel')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Cliente Fiel'));

    // Clicar em Salvar
    const saveButton = screen.getByRole('button', { name: 'Salvar' });
    fireEvent.click(saveButton);

    await waitFor(() => {
      // Verifica se a chamada correta para a API foi feita
      expect(fetchWithAuth).toHaveBeenLastCalledWith(
        'http://localhost:8000/leads/bulk',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leads: [
              { phone: '5511999999999', name: 'Cliente Teste 1', email: null },
              { phone: '5511888888888', name: 'Cliente Teste 2', email: null }
            ],
            tags: 'Cliente Fiel'
          })
        }),
        1
      );
    });
  });

  it('permite digitar uma etiqueta personalizada diretamente e salvar', async () => {
    render(<ContactsModal {...defaultProps} />);

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]); // Seleciona todos

    const tagButton = screen.getByRole('button', { name: /etiquetar \(2\)/i });
    fireEvent.click(tagButton);

    // Mock da chamada de bulk save
    vi.mocked(fetchWithAuth).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'success', imported: 2 }),
    });

    const inputTrigger = screen.getByPlaceholderText('Digite ou selecione uma etiqueta...');
    
    // Digitar etiqueta customizada
    fireEvent.change(inputTrigger, { target: { value: 'MinhaTagCustom' } });
    
    // Clicar em Salvar
    const saveButton = screen.getByRole('button', { name: 'Salvar' });
    fireEvent.click(saveButton);

    await waitFor(() => {
      // Verifica se a chamada correta para a API foi feita com a tag personalizada digitada
      expect(fetchWithAuth).toHaveBeenLastCalledWith(
        'http://localhost:8000/leads/bulk',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leads: [
              { phone: '5511999999999', name: 'Cliente Teste 1', email: null },
              { phone: '5511888888888', name: 'Cliente Teste 2', email: null }
            ],
            tags: 'MinhaTagCustom'
          })
        }),
        1
      );
    });
  });
});
