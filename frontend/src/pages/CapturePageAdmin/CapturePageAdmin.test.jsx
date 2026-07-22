import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import CapturePageAdmin from './index';

// Mocks
vi.mock('../../config', () => ({
  API_URL: 'http://localhost:8000/api'
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

describe('CapturePageAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn((url) => {
      if (url.includes('/chat/capture-page/config')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            slug: 'masterclass-teste',
            headline: 'INTENSIVO TESTE',
            badge_text: 'Aulas VIP',
            badge_status: 'AO VIVO',
            event_date: 'Hoje às 20h',
            main_title: 'VOCÊ ESTÁ QUASE LÁ!',
            main_description: 'Digite seu email.',
            email_placeholder: 'Seu melhor email',
            button_text: 'GARANTIR VAGA',
            footer_note: 'Sem spam.',
            thank_you_title: 'Inscrição Confirmada!',
            thank_you_description: 'Entre no grupo do WhatsApp.',
            whatsapp_group_url: 'https://chat.whatsapp.com/teste',
            whatsapp_button_text: 'ENTRAR NO GRUPO',
            tag_name: 'Lead Teste'
          })
        });
      }
      if (url.includes('/chat/capture-page/leads')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            leads: [
              { id: 1, email: 'lead1@teste.com', created_at: '2026-07-22T10:00:00Z' }
            ],
            total_count: 1,
            page: 1,
            limit: 15
          })
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  it('renderiza o painel de configurações da Página de Captura com os campos preenchidos', async () => {
    render(<CapturePageAdmin />);

    await waitFor(() => {
      expect(screen.getByText('Página de Captura Personalizada')).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue('masterclass-teste')).toBeInTheDocument();
    expect(screen.getByDisplayValue('INTENSIVO TESTE')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://chat.whatsapp.com/teste')).toBeInTheDocument();
  });

  it('permite alternar para a aba de Leads Capturados e exibe os e-mails registrados', async () => {
    render(<CapturePageAdmin />);

    await waitFor(() => {
      expect(screen.getByText('Leads Capturados (1)')).toBeInTheDocument();
    });

    const leadsTab = screen.getByText('Leads Capturados (1)');
    fireEvent.click(leadsTab);

    await waitFor(() => {
      expect(screen.getByText('lead1@teste.com')).toBeInTheDocument();
    });
  });
});
