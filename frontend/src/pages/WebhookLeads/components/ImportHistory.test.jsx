import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import ImportHistory from './ImportHistory';
import * as AuthContext from '../../../AuthContext';

// Mock AuthContext
vi.mock('../../../AuthContext', () => ({
  fetchWithAuth: vi.fn()
}));

describe('ImportHistory Component', () => {
  const activeClient = { id: 1, name: 'Client Test' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('não renderiza nada se não houver histórico de importações', async () => {
    vi.spyOn(AuthContext, 'fetchWithAuth').mockResolvedValue({
      ok: true,
      json: async () => []
    });

    render(<ImportHistory activeClient={activeClient} refreshTrigger={0} />);
    
    // De acordo com useEffect, deve chamar fetchWithAuth
    await waitFor(() => {
      expect(AuthContext.fetchWithAuth).toHaveBeenCalled();
    });

    expect(screen.queryByText('Histórico de Listas Carregadas')).toBeNull();
  });

  it('renderiza o cabeçalho e a lista expandida de histórico', async () => {
    const fakeHistory = [
      {
        id: 1,
        filename: 'leads_campanha_a.csv',
        status: 'processing',
        total_rows: 100,
        imported_rows: 45,
        error_rows: 5,
        error_message: null,
        created_at: '2026-06-17T12:00:00Z'
      },
      {
        id: 2,
        filename: 'leads_invalidos.xlsx',
        status: 'failed',
        total_rows: 50,
        imported_rows: 0,
        error_rows: 0,
        error_message: 'Arquivo corrompido.',
        created_at: '2026-06-17T11:30:00Z'
      }
    ];

    vi.spyOn(AuthContext, 'fetchWithAuth').mockResolvedValue({
      ok: true,
      json: async () => fakeHistory
    });

    render(<ImportHistory activeClient={activeClient} refreshTrigger={0} />);

    // Deve renderizar o botão expansor com o título
    await waitFor(() => {
      expect(screen.getByText('Histórico de Listas Carregadas')).toBeDefined();
    });

    // Clicar para expandir o histórico
    const toggleButton = screen.getByText('Histórico de Listas Carregadas');
    fireEvent.click(toggleButton);

    // Verificar se as linhas do histórico aparecem na tela
    expect(screen.getByText('leads_campanha_a.csv')).toBeDefined();
    expect(screen.getByText('leads_invalidos.xlsx')).toBeDefined();
    
    // Verificar status badges e estatísticas
    expect(screen.getByText('Processando')).toBeDefined();
    expect(screen.getByText('50% Processado')).toBeDefined(); // (45+5)/100 = 50%
    expect(screen.getByText('50 de 100 contatos')).toBeDefined();
    expect(screen.getByText('5 erros')).toBeDefined();
    
    expect(screen.getByText('Falhou')).toBeDefined();
    expect(screen.getByText('Arquivo corrompido.')).toBeDefined();
  });
});
