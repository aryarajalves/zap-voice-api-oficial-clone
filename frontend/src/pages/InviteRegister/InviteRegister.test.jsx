import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import InviteRegister from './index';

// Mock do react-hot-toast
vi.mock('react-hot-toast', () => ({
  toast: {
    loading: vi.fn(() => 'loading-id'),
    success: vi.fn(),
    error: vi.fn(),
    dismiss: vi.fn(),
  }
}));

describe('InviteRegister Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('renders invite details and password strength checklist', async () => {
    // Mock branding e convite
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ APP_NAME: 'ZapVoice Funnels' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: 'test-token-123',
          role: 'admin',
          blocked_features: [],
        }),
      });

    render(<InviteRegister token="test-token-123" />);

    // Aguardar carregamento
    await waitFor(() => {
      expect(screen.getByText(/Você foi convidado como Administrador/i)).toBeDefined();
    });

    // Validar título da aba
    expect(document.title).toContain('Criando Conta');

    expect(screen.getByPlaceholderText('Seu nome completo')).toBeDefined();
    expect(screen.getByPlaceholderText('exemplo@email.com')).toBeDefined();
    expect(screen.getByPlaceholderText('Sua senha de acesso')).toBeDefined();
    expect(screen.getByPlaceholderText('Confirme sua senha de acesso')).toBeDefined();

    // Validar itens do checklist de força de senha
    expect(screen.getByText(/12\+ caracteres/i)).toBeDefined();
    expect(screen.getByText(/Contém letras/i)).toBeDefined();
    expect(screen.getByText(/Contém números/i)).toBeDefined();
    expect(screen.getByText(/Caractere especial/i)).toBeDefined();
  });

  it('validates password matching and triggers send-code transition', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ APP_NAME: 'ZapVoice Funnels' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: 'test-token-123',
          role: 'admin',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Código enviado com sucesso' }),
      });

    render(<InviteRegister token="test-token-123" />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Seu nome completo/i)).toBeDefined();
    });

    const nameInput = screen.getByPlaceholderText('Seu nome completo');
    const emailInput = screen.getByPlaceholderText('exemplo@email.com');
    const passInput = screen.getByPlaceholderText('Sua senha de acesso');
    const confirmInput = screen.getByPlaceholderText('Confirme sua senha de acesso');

    fireEvent.change(nameInput, { target: { value: 'Arya Teste' } });
    fireEvent.change(emailInput, { target: { value: 'arya@teste.com' } });
    fireEvent.change(passInput, { target: { value: 'MinhaSenha@2026!' } });
    fireEvent.change(confirmInput, { target: { value: 'MinhaSenha@2026!' } });

    await waitFor(() => {
      expect(screen.getByText(/As senhas coincidem/i)).toBeDefined();
    });

    const submitBtn = screen.getByRole('button', { name: /Registrar e Ativar Conta/i });
    expect(submitBtn).toBeDefined();
    expect(submitBtn.disabled).toBe(false);

    fireEvent.click(submitBtn);

    // Deve transicionar para a etapa de verificação de código
    await waitFor(() => {
      expect(screen.getByText(/Verifique seu E-mail/i)).toBeDefined();
      expect(screen.getByText('arya@teste.com')).toBeDefined();
      expect(screen.getByPlaceholderText('000000')).toBeDefined();
    });
  });

  it('completes registration when 6-digit code is submitted', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ APP_NAME: 'ZapVoice Funnels' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: 'test-token-123',
          role: 'admin',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Código enviado com sucesso' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Conta criada e ativada com sucesso!' }),
      });

    render(<InviteRegister token="test-token-123" />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Seu nome completo')).toBeDefined();
    });

    fireEvent.change(screen.getByPlaceholderText('Seu nome completo'), { target: { value: 'Arya Teste' } });
    fireEvent.change(screen.getByPlaceholderText('exemplo@email.com'), { target: { value: 'arya@teste.com' } });
    fireEvent.change(screen.getByPlaceholderText('Sua senha de acesso'), { target: { value: 'MinhaSenha@2026!' } });
    fireEvent.change(screen.getByPlaceholderText('Confirme sua senha de acesso'), { target: { value: 'MinhaSenha@2026!' } });

    fireEvent.click(screen.getByRole('button', { name: /Registrar e Ativar Conta/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('000000')).toBeDefined();
    });

    const codeInput = screen.getByPlaceholderText('000000');
    fireEvent.change(codeInput, { target: { value: '849201' } });

    const confirmCodeBtn = screen.getByRole('button', { name: /Confirmar e Ativar Conta/i });
    expect(confirmCodeBtn.disabled).toBe(false);

    fireEvent.click(confirmCodeBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/invitations/test-token-123/register'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            full_name: 'Arya Teste',
            email: 'arya@teste.com',
            password: 'MinhaSenha@2026!',
            code: '849201',
          }),
        })
      );
    });
  });

  it('gera senha aleatória segura ao clicar no botão Gerar Senha', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ APP_NAME: 'ZapVoice Funnels' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: 'test-token-123',
          role: 'admin',
        }),
      });

    render(<InviteRegister token="test-token-123" />);

    await waitFor(() => {
      expect(screen.getByText(/Gerar Senha/i)).toBeDefined();
    });

    const generateBtn = screen.getByText(/Gerar Senha/i);
    fireEvent.click(generateBtn);

    const passInput = screen.getByPlaceholderText('Sua senha de acesso');
    const confirmInput = screen.getByPlaceholderText('Confirme sua senha de acesso');

    // Senhas preenchidas e coincidentes
    expect(passInput.value.length).toBeGreaterThanOrEqual(12);
    expect(passInput.value.length).toBeLessThanOrEqual(20);
    expect(confirmInput.value).toBe(passInput.value);

    // Valida caracteres da senha gerada
    expect(/[A-Za-z]/.test(passInput.value)).toBe(true);
    expect(/\d/.test(passInput.value)).toBe(true);
    expect(/[^A-Za-z0-9]/.test(passInput.value)).toBe(true);

    await waitFor(() => {
      expect(screen.getByText(/As senhas coincidem/i)).toBeDefined();
    });
  });
});

