import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import EmailInboundTab from './EmailInboundTab';
import { useClient } from '../../contexts/ClientContext';

vi.mock('../../contexts/ClientContext');
vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn()
  }
}));

const mockClient = { id: 'client-123', name: 'Test Client' };

const mockInboundsResponse = {
  items: [
    {
      id: 'inbound-1',
      from_name: 'Ana Paula',
      from_email: 'ana@exemplo.com',
      subject: 'Dúvida sobre o produto',
      body_text: 'Olá, gostaria de mais informações.',
      body_html: '<p>Olá, gostaria de mais informações.</p>',
      provider: 'resend',
      is_read: false,
      created_at: '2026-09-13T15:00:00Z'
    },
    {
      id: 'inbound-2',
      from_name: 'Bruno Souza',
      from_email: 'bruno@exemplo.com',
      subject: 'Comprovante de pagamento',
      body_text: 'Segue comprovante.',
      body_html: '<p>Segue comprovante.</p>',
      provider: 'ses',
      is_read: true,
      created_at: '2026-09-13T14:30:00Z'
    }
  ],
  total_unread: 1
};

describe('EmailInboundTab Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useClient.mockReturnValue({ activeClient: mockClient });

    // Mock global fetch
    global.fetch = vi.fn().mockImplementation((url, options = {}) => {
      if (url.includes('/email/inbounds?') && (!options.method || options.method === 'GET')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockInboundsResponse)
        });
      }
      if (url.includes('/read') && options.method === 'PUT') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        });
      }
      if (url.includes('/reply') && options.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ message: 'Réplica enviada com sucesso!' })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });

    // Mock clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve())
      }
    });
  });

  it('renders inbound header, webhook info and counts', async () => {
    render(<EmailInboundTab />);

    expect(screen.getByText(/Webhook de Captura de Respostas/i)).toBeInTheDocument();
    expect(screen.getByText('Total Recebidos')).toBeInTheDocument();
    expect(screen.getByText('Não Lidas')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Ana Paula')).toBeInTheDocument();
      expect(screen.getByText('Bruno Souza')).toBeInTheDocument();
      expect(screen.getByText('NOVA')).toBeInTheDocument();
      expect(screen.getByText('LIDA')).toBeInTheDocument();
    });
  });

  it('copies webhook url to clipboard when copy button is clicked', () => {
    render(<EmailInboundTab />);

    const copyBtn = screen.getByTitle('Copiar URL');
    fireEvent.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('/api/email/inbound-webhook')
    );
  });

  it('filters inbound emails using search input', async () => {
    render(<EmailInboundTab />);

    await waitFor(() => {
      expect(screen.getByText('Ana Paula')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Buscar por lead, e-mail ou assunto/i);
    fireEvent.change(searchInput, { target: { value: 'Comprovante' } });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('search=Comprovante'),
        expect.any(Object)
      );
    });
  });

  it('opens reply modal, marks message as read, and allows sending reply', async () => {
    render(<EmailInboundTab />);

    await waitFor(() => {
      expect(screen.getByText('Ana Paula')).toBeInTheDocument();
    });

    const replyButtons = screen.getAllByText('Ver & Responder');
    fireEvent.click(replyButtons[0]);

    // Modal opens
    await waitFor(() => {
      expect(screen.getByText(/Resposta de Ana Paula/i)).toBeInTheDocument();
      expect(screen.getByText('Olá, gostaria de mais informações.')).toBeInTheDocument();
    });

    // Validates that read endpoint was called
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/email/inbounds/inbound-1/read'),
      expect.objectContaining({ method: 'PUT' })
    );

    // Edit reply subject and body
    const subjectInput = screen.getByDisplayValue(/Re: Dúvida sobre o produto/i);
    fireEvent.change(subjectInput, { target: { value: 'Re: Resposta rápida' } });

    const replyBtn = screen.getByText('Enviar Resposta');
    fireEvent.click(replyBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/email/inbounds/inbound-1/reply'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('Re: Resposta rápida')
        })
      );
    });
  });

  it('triggers slash command suggestions when typing / in reply textarea', async () => {
    render(<EmailInboundTab />);

    await waitFor(() => {
      expect(screen.getByText('Bruno Souza')).toBeInTheDocument();
    });

    const replyButtons = screen.getAllByText('Ver & Responder');
    fireEvent.click(replyButtons[1]);

    await waitFor(() => {
      expect(screen.getByText(/Resposta de Bruno Souza/i)).toBeInTheDocument();
    });

    const textarea = document.querySelector('textarea');
    fireEvent.change(textarea, { target: { value: 'Olá /nom' } });

    await waitFor(() => {
      expect(screen.getByText('Variáveis do Contato')).toBeInTheDocument();
      expect(screen.getByText(/\{\{nome\}\}/i)).toBeInTheDocument();
    });

    // Click variable to insert
    const varBtn = screen.getByText(/\{\{nome\}\}/i);
    fireEvent.click(varBtn);

    expect(screen.queryByText('Variáveis do Contato')).not.toBeInTheDocument();
  });
});
