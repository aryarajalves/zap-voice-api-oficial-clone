import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth } from './AuthContext';

// Mock do fetch global
global.fetch = vi.fn();

const TestComponent = () => {
  const { user, login, logout } = useAuth();
  return (
    <div>
      <div data-testid="user-status">{user ? `logged-in-${user.email}` : 'logged-out'}</div>
      <button onClick={() => login('test@test.com', 'password')} data-testid="login-btn">Login</button>
      <button onClick={logout} data-testid="logout-btn">Logout</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('deve iniciar deslogado', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    expect(screen.getByTestId('user-status')).toHaveTextContent('logged-out');
  });

  it('deve realizar logout corretamente', async () => {
    // Simular usuário já logado com token (como na implementação real)
    localStorage.setItem('token', 'mock-token');

    // Mock do fetchCurrentUser que é chamado no mounting se houver token
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, email: 'test@test.com', full_name: 'Test User' }),
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Aguarda carregar dados do usuário
    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('logged-in-test@test.com');
    });

    await act(async () => {
      screen.getByTestId('logout-btn').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('logged-out');
    });
    
    expect(localStorage.getItem('token')).toBeNull();
  });
});
