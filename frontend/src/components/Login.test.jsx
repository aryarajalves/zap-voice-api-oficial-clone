import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import Login from './Login';

// Mocks
vi.mock('../AuthContext', () => ({
  useAuth: () => ({
    login: vi.fn(),
  }),
}));

vi.mock('react-hot-toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('../config', () => ({ API_URL: 'http://localhost:8000' }));

vi.mock('react-icons/fi', () => ({
  FiGlobe: () => <span data-testid="fi-globe" />,
}));

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza o formulário corretamente', () => {
    render(<Login />);
    expect(screen.getByPlaceholderText('seu@email.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
  });

  it('exibe texto do branding', () => {
    render(<Login />);
    expect(screen.getByText(/ZapVoice/i)).toBeInTheDocument();
    expect(screen.getByText(/Entre na sua conta/i)).toBeInTheDocument();
  });

  it('atualiza o campo email ao digitar', () => {
    render(<Login />);
    const input = screen.getByPlaceholderText('seu@email.com');
    fireEvent.change(input, { target: { value: 'test@example.com' } });
    expect(input.value).toBe('test@example.com');
  });

  it('atualiza o campo senha ao digitar', () => {
    render(<Login />);
    const input = screen.getByPlaceholderText('••••••••');
    fireEvent.change(input, { target: { value: 'mypassword' } });
    expect(input.value).toBe('mypassword');
  });

  it('campo senha inicia como type=password', () => {
    render(<Login />);
    const input = screen.getByPlaceholderText('••••••••');
    expect(input.type).toBe('password');
  });

  it('toggle mostra/oculta senha ao clicar no botão', () => {
    render(<Login />);
    const input = screen.getByPlaceholderText('••••••••');
    const toggleBtn = screen.getByTitle(/mostrar senha/i);
    fireEvent.click(toggleBtn);
    expect(input.type).toBe('text');
    fireEvent.click(screen.getByTitle(/ocultar senha/i));
    expect(input.type).toBe('password');
  });

  it('botão submit fica desabilitado durante loading', async () => {
    const { useAuth } = await import('../AuthContext');
    useAuth.mockReturnValue({
      login: () => new Promise((resolve) => setTimeout(resolve, 500)),
    });

    render(<Login />);
    fireEvent.change(screen.getByPlaceholderText('seu@email.com'), {
      target: { value: 'user@test.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'pass' },
    });

    const btn = screen.getByRole('button', { name: /entrar/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByText(/entrando/i)).toBeInTheDocument();
    });
  });

  it('exibe mensagem de erro quando login falha', async () => {
    const { useAuth } = await import('../AuthContext');
    useAuth.mockReturnValue({
      login: vi.fn().mockRejectedValue(new Error('Email ou senha incorretos')),
    });

    render(<Login />);
    fireEvent.change(screen.getByPlaceholderText('seu@email.com'), {
      target: { value: 'wrong@test.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'wrongpass' },
    });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(screen.getByText(/Email ou senha incorretos/i)).toBeInTheDocument();
    });
  });

  it('redireciona para / após login com sucesso', async () => {
    const { useAuth } = await import('../AuthContext');
    const mockLogin = vi.fn().mockResolvedValue(undefined);
    useAuth.mockReturnValue({ login: mockLogin });

    // Mock window.location.href
    const originalHref = window.location.href;
    delete window.location;
    window.location = { href: '' };

    render(<Login />);
    fireEvent.change(screen.getByPlaceholderText('seu@email.com'), {
      target: { value: 'admin@test.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'pass' },
    });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('admin@test.com', 'pass');
    });

    window.location = { href: originalHref };
  });
});
