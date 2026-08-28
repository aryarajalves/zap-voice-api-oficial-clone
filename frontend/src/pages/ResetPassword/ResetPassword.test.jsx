import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ResetPassword from './index';

vi.mock('react-hot-toast', () => ({
  toast: {
    loading: vi.fn(() => 'loading-id'),
    success: vi.fn(),
    error: vi.fn(),
    dismiss: vi.fn(),
  }
}));

describe('ResetPassword Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('renderiza o formulário de redefinição e valida checklist', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ APP_NAME: 'ZapVoice Funnels' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          valid: true,
          token: 'token-reset-123',
          email: 'usuario@teste.com',
          full_name: 'Usuário Teste',
          role: 'user',
        }),
      });

    render(<ResetPassword token="token-reset-123" />);

    await waitFor(() => {
      expect(screen.getByText(/REDEFINIR SENHA DE ACESSO/i)).toBeDefined();
    });

    expect(screen.getByText('Usuário Teste')).toBeDefined();
    expect(screen.getByText('usuario@teste.com')).toBeDefined();

    expect(screen.getByPlaceholderText('Digite sua nova senha')).toBeDefined();
    expect(screen.getByPlaceholderText('Confirme sua nova senha')).toBeDefined();

    expect(screen.getByText(/12\+ caracteres/i)).toBeDefined();
    expect(screen.getByText(/Contém letras/i)).toBeDefined();
    expect(screen.getByText(/Contém números/i)).toBeDefined();
    expect(screen.getByText(/Caractere especial/i)).toBeDefined();
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
          valid: true,
          token: 'token-reset-123',
          email: 'usuario@teste.com',
          full_name: 'Usuário Teste',
        }),
      });

    render(<ResetPassword token="token-reset-123" />);

    await waitFor(() => {
      expect(screen.getByText(/Gerar Senha/i)).toBeDefined();
    });

    fireEvent.click(screen.getByText(/Gerar Senha/i));

    const passInput = screen.getByPlaceholderText('Digite sua nova senha');
    const confirmInput = screen.getByPlaceholderText('Confirme sua nova senha');

    expect(passInput.value.length).toBeGreaterThanOrEqual(12);
    expect(passInput.value.length).toBeLessThanOrEqual(20);
    expect(confirmInput.value).toBe(passInput.value);

    await waitFor(() => {
      expect(screen.getByText(/As senhas coincidem/i)).toBeDefined();
    });
  });

  it('envia a nova senha com sucesso ao backend', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ APP_NAME: 'ZapVoice Funnels' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          valid: true,
          token: 'token-reset-123',
          email: 'usuario@teste.com',
          full_name: 'Usuário Teste',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Sua senha foi redefinida com sucesso!' }),
      });

    render(<ResetPassword token="token-reset-123" />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Digite sua nova senha')).toBeDefined();
    });

    fireEvent.change(screen.getByPlaceholderText('Digite sua nova senha'), {
      target: { value: 'MinhaNovaSenha@2026!' },
    });
    fireEvent.change(screen.getByPlaceholderText('Confirme sua nova senha'), {
      target: { value: 'MinhaNovaSenha@2026!' },
    });

    const submitBtn = screen.getByRole('button', { name: /Salvar Nova Senha/i });
    expect(submitBtn.disabled).toBe(false);

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/reset-password-token/token-reset-123'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            password: 'MinhaNovaSenha@2026!',
            confirm_password: 'MinhaNovaSenha@2026!',
          }),
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Senha Atualizada!/i)).toBeDefined();
    });
  });

  it('exibe tela de erro para link inválido ou expirado', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ APP_NAME: 'ZapVoice Funnels' }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ detail: 'Este link de redefinição de senha expirou.' }),
      });

    render(<ResetPassword token="invalid-token" />);

    await waitFor(() => {
      expect(screen.getByText(/Link Inválido ou Expirado/i)).toBeDefined();
      expect(screen.getByText(/Este link de redefinição de senha expirou/i)).toBeDefined();
    });
  });
});
