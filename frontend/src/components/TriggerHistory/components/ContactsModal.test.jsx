import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { toast } from 'react-hot-toast';
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
    vi.mocked(fetchWithAuth).mockImplementation(async (url) => {
      if (url.includes('/leads/filters')) {
        return {
          ok: true,
          json: async () => ({ tags: ['Cliente Fiel', 'Interessado'] }),
        };
      }
      if (url.includes('/chatwoot/labels')) {
        return {
          ok: true,
          json: async () => ([
            { id: 1, title: 'Chatwoot Tag 1' },
            { id: 2, title: 'Chatwoot Tag 2' }
          ]),
        };
      }
      if (url.includes('/leads/bulk')) {
        return {
          ok: true,
          json: async () => ({ status: 'success', imported: 2 }),
        };
      }
      return { ok: false };
    });
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
    contactsPage: 1,
    setContactsPage: vi.fn(),
    contactsPerPage: 20,
    setContactsPerPage: vi.fn(),
    contactsTotal: 2,
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
    render(<ContactsModal {...defaultProps} />);

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]); // Seleciona todos

    const tagButton = screen.getByRole('button', { name: /etiquetar \(2\)/i });
    fireEvent.click(tagButton);

    // Deve abrir o modal de etiquetas
    expect(screen.getByText('Adicionar Etiquetas')).toBeInTheDocument();

    // Simula foco no input de tags para abrir dropdown
    const dropdownTrigger = screen.getByPlaceholderText('Digite e pressione Enter ou selecione abaixo...');
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

    const inputTrigger = screen.getByPlaceholderText('Digite e pressione Enter ou selecione abaixo...');
    
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

  it('permite selecionar múltiplas etiquetas ao mesmo tempo e salvar', async () => {
    render(<ContactsModal {...defaultProps} />);

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]); // Seleciona todos

    const tagButton = screen.getByRole('button', { name: /etiquetar \(2\)/i });
    fireEvent.click(tagButton);

    // Simula foco no input de tags para abrir dropdown
    const dropdownTrigger = screen.getByPlaceholderText('Digite e pressione Enter ou selecione abaixo...');
    fireEvent.focus(dropdownTrigger);

    // Aguardar que as tags carreguem
    await waitFor(() => {
      expect(screen.getByText('Cliente Fiel')).toBeInTheDocument();
      expect(screen.getByText('Interessado')).toBeInTheDocument();
    });

    // Selecionar 'Cliente Fiel'
    fireEvent.click(screen.getByText('Cliente Fiel'));
    // Selecionar 'Interessado'
    fireEvent.click(screen.getByText('Interessado'));

    // Clicar em Salvar
    const saveButton = screen.getByRole('button', { name: 'Salvar' });
    fireEvent.click(saveButton);

    await waitFor(() => {
      // Verifica se a chamada correta para a API foi feita com ambas as tags separadas por vírgula
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
            tags: 'Cliente Fiel,Interessado'
          })
        }),
        1
      );
    });
  });

  it('exibe barra de paginação com dropdown e botões de navegação', () => {
    const propsComPaginacao = {
      ...defaultProps,
      contactsTotal: 100,
      contactsPage: 1,
      contactsPerPage: 20,
    };
    render(<ContactsModal {...propsComPaginacao} />);

    // Dropdown de itens por página deve estar presente
    const select = document.getElementById('contacts-per-page');
    expect(select).toBeInTheDocument();
    expect(select.value).toBe('20');

    // Deve ter as opções 20, 50, 100, 500
    expect(screen.getByRole('option', { name: '20' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '50' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '100' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '500' })).toBeInTheDocument();

    // Indicador de página
    expect(screen.getByText(/Pág\. 1/i)).toBeInTheDocument();

    // Botões de navegação devem existir
    expect(document.getElementById('contacts-prev-page')).toBeInTheDocument();
    expect(document.getElementById('contacts-next-page')).toBeInTheDocument();
  });

  it('exibe "–" para datas nulas ou de epoch (31/12/1969)', () => {
    const propsComDataNula = {
      ...defaultProps,
      contactsModal: {
        ...defaultProps.contactsModal,
        contacts: [
          {
            phone_number: '5511111111111',
            status: 'failed',
            message_type: 'TEMPLATE',
            updated_at: null,
            timestamp: null,
          },
          {
            phone_number: '5533333333333',
            status: 'delivered',
            message_type: 'TEMPLATE',
            updated_at: '2026-05-27T15:00:00Z',
            timestamp: null,
          },
        ],
        counts: { total: 2 },
      },
      contactsTotal: 2,
    };
    render(<ContactsModal {...propsComDataNula} />);

    // Deve exibir "–" para datas nulas
    const dashes = screen.getAllByText('–');
    expect(dashes.length).toBeGreaterThanOrEqual(1);

    // A data válida (2026) deve estar presente formatada com dia/mês/ano
    expect(screen.getByText(/27\/05\/2026/)).toBeInTheDocument();
  });

  it('exibe erro ao tentar copiar lista vazia', () => {
    const propsVazia = {
      ...defaultProps,
      contactsModal: {
        ...defaultProps.contactsModal,
        contacts: [],
        counts: { total: 0 },
      },
      contactsTotal: 0,
    };
    render(<ContactsModal {...propsVazia} />);

    const copyButton = screen.getByRole('button', { name: /copiar lista/i });
    fireEvent.click(copyButton);

    expect(toast.error).toHaveBeenCalledWith('A lista está vazia. Nenhum contato para copiar.');
  });

  it('copia contatos para o clipboard e exibe mensagem de sucesso se a lista contiver elementos', () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve()),
      },
    });

    render(<ContactsModal {...defaultProps} />);

    const copyButton = screen.getByRole('button', { name: /copiar lista/i });
    fireEvent.click(copyButton);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('5511999999999\n5511888888888');
    expect(toast.success).toHaveBeenCalledWith('Lista copiada!');
  });
});

