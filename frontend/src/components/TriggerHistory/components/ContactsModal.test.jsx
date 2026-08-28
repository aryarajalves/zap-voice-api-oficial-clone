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

vi.mock('./BulkSendContactsModal', () => ({
    default: ({ isOpen, onClose, selectedPhones, onSuccess }) => isOpen ? (
        <div data-testid="bulk-send-modal">
            Bulk Send Modal Open for {selectedPhones.length}
            <button onClick={onSuccess}>Simulate Success Send</button>
            <button onClick={onClose}>Close</button>
        </div>
    ) : null
}));

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
    onRefresh: vi.fn(),
  };

  it('renderiza o modal e lista de contatos com checkboxes', () => {
    render(<ContactsModal {...defaultProps} />);
    expect(screen.getByText('Interações — teste')).toBeInTheDocument();
    expect(screen.getByText('5511999999999')).toBeInTheDocument();
    expect(screen.getByText('5511888888888')).toBeInTheDocument();
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(3);
  });

  it('permite selecionar contatos individualmente e exibe botão de etiquetar', async () => {
    render(<ContactsModal {...defaultProps} />);
    expect(screen.getByRole('button', { name: /etiquetar todos/i })).toBeInTheDocument();
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]);
    const tagButton = screen.getByRole('button', { name: /etiquetar \(1\)/i });
    expect(tagButton).toBeInTheDocument();
  });

  it('seleciona todos os contatos ao clicar no checkbox geral', () => {
    render(<ContactsModal {...defaultProps} />);
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    const tagButton = screen.getByRole('button', { name: /etiquetar \(2\)/i });
    expect(tagButton).toBeInTheDocument();
  });

  it('abre o modal de etiquetas ao clicar em etiquetar e envia tags para a API com sucesso', async () => {
    render(<ContactsModal {...defaultProps} />);
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    const tagButton = screen.getByRole('button', { name: /etiquetar \(2\)/i });
    fireEvent.click(tagButton);
    expect(screen.getByText('Adicionar Etiquetas')).toBeInTheDocument();

    const dropdownTrigger = screen.getByPlaceholderText('Digite e pressione Enter ou selecione abaixo...');
    fireEvent.focus(dropdownTrigger);

    await waitFor(() => {
      expect(screen.getByText('Cliente Fiel')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Cliente Fiel'));
    const saveButton = screen.getByRole('button', { name: 'Salvar' });
    fireEvent.click(saveButton);

    await waitFor(() => {
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
    fireEvent.click(checkboxes[0]);
    const tagButton = screen.getByRole('button', { name: /etiquetar \(2\)/i });
    fireEvent.click(tagButton);

    const inputTrigger = screen.getByPlaceholderText('Digite e pressione Enter ou selecione abaixo...');
    fireEvent.change(inputTrigger, { target: { value: 'MinhaTagCustom' } });
    const saveButton = screen.getByRole('button', { name: 'Salvar' });
    fireEvent.click(saveButton);

    await waitFor(() => {
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
    fireEvent.click(checkboxes[0]);
    const tagButton = screen.getByRole('button', { name: /etiquetar \(2\)/i });
    fireEvent.click(tagButton);

    const dropdownTrigger = screen.getByPlaceholderText('Digite e pressione Enter ou selecione abaixo...');
    fireEvent.focus(dropdownTrigger);

    await waitFor(() => {
      expect(screen.getByText('Cliente Fiel')).toBeInTheDocument();
      expect(screen.getByText('Interessado')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Cliente Fiel'));
    fireEvent.click(screen.getByText('Interessado'));
    const saveButton = screen.getByRole('button', { name: 'Salvar' });
    fireEvent.click(saveButton);

    await waitFor(() => {
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
    const select = document.getElementById('contacts-per-page');
    expect(select).toBeInTheDocument();
    expect(select.value).toBe('20');
    expect(screen.getByRole('option', { name: '20' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '50' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '100' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '500' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '1000' })).toBeInTheDocument();
    expect(screen.getByText(/Pág\. 1/i)).toBeInTheDocument();
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
    const dashes = screen.getAllByText('–');
    expect(dashes.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/27\/05\/2026/)).toBeInTheDocument();
  });

  it('exibe erro ao tentar copiar lista vazia', async () => {
    const propsVazia = {
      ...defaultProps,
      getAllTargetContacts: vi.fn().mockResolvedValue([]),
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
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Nenhum contato disponível para copiar.');
    });
  });

  it('copia contatos para o clipboard e exibe mensagem de sucesso se a lista contiver elementos', async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve()),
      },
    });

    render(<ContactsModal {...defaultProps} />);
    const checkboxes = screen.getAllByRole('checkbox');
    // Selecionar o primeiro contato
    fireEvent.click(checkboxes[1]);

    const copyButton = screen.getByRole('button', { name: /copiar selecionados/i });
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('5511999999999');
      expect(toast.success).toHaveBeenCalledWith('1 contato copiado para a área de transferência!');
    });
  });

  it('copia todos os contatos da lista diretamente pelo botão Copiar Lista (1) sem precisar selecionar checkbox', async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve()),
      },
    });

    const propsUnicoContato = {
      ...defaultProps,
      contactsModal: {
        ...defaultProps.contactsModal,
        contacts: [
          {
            phone_number: '5585996123586',
            contact_name: 'Aryaraj',
            status: 'skipped',
            message_type: 'TEMPLATE',
            failure_reason: 'TEMPLATE_ALREADY_SENT_24H'
          }
        ],
        counts: { total: 1 }
      },
      contactsTotal: 1
    };

    render(<ContactsModal {...propsUnicoContato} />);
    const copyButton = screen.getByRole('button', { name: /copiar lista \(1\)/i });
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('5585996123586');
      expect(toast.success).toHaveBeenCalledWith('1 contato copiado para a área de transferência!');
    });
  });

  it('exibe o dropdown de erros nos filtros de falhas e bloqueios quando existem motivos de erro', () => {
    const propsComFalhas = {
      ...defaultProps,
      contactsFilter: 'failed',
      contactsModal: {
        ...defaultProps.contactsModal,
        failureReasons: ['Too Many Requests', 'Invalid Number']
      },
      contactsErrorFilter: 'all',
      setContactsErrorFilter: vi.fn(),
    };
    const { rerender } = render(<ContactsModal {...propsComFalhas} />);
    let select = document.getElementById('contacts-error-filter');
    expect(select).toBeInTheDocument();
    expect(select.value).toBe('all');

    fireEvent.change(select, { target: { value: 'Too Many Requests' } });
    expect(propsComFalhas.setContactsErrorFilter).toHaveBeenCalledWith('Too Many Requests');

    const propsComBloqueios = {
      ...propsComFalhas,
      contactsFilter: 'blocked'
    };
    rerender(<ContactsModal {...propsComBloqueios} />);
    select = document.getElementById('contacts-error-filter');
    expect(select).toBeInTheDocument();

    const propsSemFiltro = {
      ...propsComFalhas,
      contactsFilter: 'all'
    };
    rerender(<ContactsModal {...propsSemFiltro} />);
    expect(document.getElementById('contacts-error-filter')).not.toBeInTheDocument();
  });

  it('exibe o botão Bloquear apenas na listagem de falhas', async () => {
    const propsComFalhas = {
      ...defaultProps,
      contactsFilter: 'failed',
    };
    const { rerender } = render(<ContactsModal {...propsComFalhas} />);
    expect(screen.getByRole('button', { name: /^Bloquear Todos \(2\)$/ })).toBeInTheDocument();

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]);
    const blockButton = screen.getByRole('button', { name: /^Bloquear \(1\)$/ });
    expect(blockButton).toBeInTheDocument();

    const propsSemFalhas = {
      ...propsComFalhas,
      contactsFilter: 'all',
    };
    rerender(<ContactsModal {...propsSemFalhas} />);
    expect(screen.queryByRole('button', { name: /^Bloquear Todos/ })).not.toBeInTheDocument();
  });

  it('deve bloquear o scroll do body quando o modal estiver aberto e liberar ao fechar/desmontar', () => {
    document.body.classList.remove('no-scroll');
    const { unmount, rerender } = render(<ContactsModal {...defaultProps} />);
    expect(document.body.classList.contains('no-scroll')).toBe(true);

    const closedProps = {
      ...defaultProps,
      contactsModal: {
        ...defaultProps.contactsModal,
        isOpen: false,
      }
    };
    rerender(<ContactsModal {...closedProps} />);
    expect(document.body.classList.contains('no-scroll')).toBe(false);

    rerender(<ContactsModal {...defaultProps} />);
    expect(document.body.classList.contains('no-scroll')).toBe(true);

    unmount();
    expect(document.body.classList.contains('no-scroll')).toBe(false);
  });

  it('exibe a explicação de BOT_BLOCK corretamento ao clicar no ícone de ajuda', async () => {
    const propsComBloqueioBot = {
      ...defaultProps,
      contactsModal: {
        ...defaultProps.contactsModal,
        contacts: [
          {
            phone_number: '5511999999999',
            status: 'failed',
            failure_reason: 'BLOCKED_VIA_BUTTON',
          }
        ]
      }
    };

    render(<ContactsModal {...propsComBloqueioBot} />);
    expect(screen.getByText('BLOQUEOU O BOT')).toBeInTheDocument();

    const infoButton = screen.getByTitle('Explicar erro');
    expect(infoButton).toBeInTheDocument();
    fireEvent.click(infoButton);

    expect(screen.getByText('Bloqueou o Bot (Ação do Contato)')).toBeInTheDocument();
    expect(screen.getByText(/O contato recebeu a mensagem e voluntariamente clicou/i)).toBeInTheDocument();

    const closeExplanationButton = screen.getByRole('button', { name: 'Entendido' });
    fireEvent.click(closeExplanationButton);
    expect(screen.queryByText('Bloqueou o Bot (Ação do Contato)')).not.toBeInTheDocument();
  });

  it('exibe mensagem explicativa de disparo em andamento quando a lista estiver vazia e o disparo estiver em processamento', () => {
    const propsDisparoEmAndamento = {
      ...defaultProps,
      contactsModal: {
        ...defaultProps.contactsModal,
        triggerStatus: 'processing',
        contacts: [],
        counts: { total: 0 },
      },
      contactsTotal: 0,
    };
    render(<ContactsModal {...propsDisparoEmAndamento} />);
    expect(screen.getByText('Nenhum contato encontrado neste filtro.')).toBeInTheDocument();
  });
});
