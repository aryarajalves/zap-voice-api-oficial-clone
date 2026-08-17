import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import EmailConfigTab from './EmailConfigTab';

// Mock contexts
vi.mock('../../contexts/ClientContext', () => ({
  useClient: () => ({
    activeClient: { id: 1, name: 'Empresa Teste' }
  })
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn()
  }
}));

// Mock config
vi.mock('../../config', () => ({
  API_URL: 'http://localhost:8000',
  WEBHOOK_BASE_URL: 'https://webhook.zapvoice.test'
}));

describe('EmailConfigTab Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            configured: true,
            config: {
              provider: 'ses',
              from_email: 'contato@zapvoice.test',
              from_name: 'ZapVoice',
              aws_access_key_id: 'AKIA_TEST',
              aws_region: 'us-east-1'
            }
          })
      })
    );
  });

  it('renderiza o título e opções de provedores', async () => {
    render(<EmailConfigTab />);

    expect(await screen.findByText('Provedor de Envio de E-mail')).toBeInTheDocument();
    expect(screen.getByText('⚡ Amazon SES')).toBeInTheDocument();
    expect(screen.getByText('🚀 Resend')).toBeInTheDocument();
    expect(screen.getByText('⚙️ SMTP Customizado')).toBeInTheDocument();
    expect(screen.getByText('✉️ Envio Direto (Sem SMTP)')).toBeInTheDocument();
  });

  it('permite alternar entre os provedores e renderiza os campos correspondentes', async () => {
    render(<EmailConfigTab />);

    // Inicia com SES
    expect(await screen.findByText(/Configuração Amazon SES/i)).toBeInTheDocument();

    // Clica em Resend
    fireEvent.click(screen.getByText('🚀 Resend'));
    expect(screen.getByText(/Configuração Resend API/i)).toBeInTheDocument();

    // Clica em SMTP
    fireEvent.click(screen.getByText('⚙️ SMTP Customizado'));
    expect(screen.getByText(/Configuração Servidor SMTP/i)).toBeInTheDocument();

    // Clica em Envio Direto
    fireEvent.click(screen.getByText('✉️ Envio Direto (Sem SMTP)'));
    expect(screen.getByText(/Envio Direto via Servidor Local/i)).toBeInTheDocument();
  });

  it('renderiza os campos de remetente e permite edição', async () => {
    render(<EmailConfigTab />);

    const emailInput = await screen.findByPlaceholderText('contato@seu-dominio.com.br');
    expect(emailInput).toBeInTheDocument();

    fireEvent.change(emailInput, { target: { value: 'novo_remetente@zapvoice.test' } });
    expect(emailInput.value).toBe('novo_remetente@zapvoice.test');
  });

  it('renderiza o card com a URL do webhook e permite copiar', async () => {
    const writeTextMock = vi.fn();
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock
      }
    });

    render(<EmailConfigTab />);

    expect(await screen.findByText(/Webhook de Status de Entrega/i)).toBeInTheDocument();
    const copyButton = screen.getByText('Copiar URL');
    fireEvent.click(copyButton);

    expect(writeTextMock).toHaveBeenCalledWith('https://webhook.zapvoice.test/api/email/status-webhook');
  });

  it('abre o modal de teste de envio de e-mail ao clicar no botão', async () => {
    render(<EmailConfigTab />);

    const testButton = await screen.findByText('Testar Envio de E-mail');
    fireEvent.click(testButton);

    expect(screen.getByText('Enviar E-mail de Teste')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('seuemail@gmail.com')).toBeInTheDocument();
  });
});
