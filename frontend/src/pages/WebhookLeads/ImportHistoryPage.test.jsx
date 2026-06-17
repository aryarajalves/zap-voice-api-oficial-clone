import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import ImportHistoryPage from './ImportHistoryPage';

const mockFetchWithAuth = vi.fn();
const activeClientObj = { id: 1, name: 'Client Test' };

// Mock AuthContext
vi.mock('../../AuthContext', () => ({
  fetchWithAuth: (...args) => mockFetchWithAuth(...args)
}));

// Mock ClientContext
vi.mock('../../contexts/ClientContext', () => ({
  useClient: () => ({
    activeClient: activeClientObj
  })
}));

describe('ImportHistoryPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza o título e estado vazio', async () => {
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => []
    });

    render(<ImportHistoryPage />);

    await waitFor(() => {
      expect(screen.getByText('Histórico de Importação de Contatos')).toBeDefined();
    });
    expect(screen.getByText('Nenhuma lista carregada')).toBeDefined();
  });

  it('lista as importações e permite renomear uma lista', async () => {
    const fakeHistory = [
      {
        id: 1,
        filename: 'lista_antiga.csv',
        status: 'completed',
        total_rows: 10,
        imported_rows: 10,
        error_rows: 0,
        created_at: '2026-06-17T12:00:00Z',
        updated_at: '2026-06-17T12:05:00Z'
      }
    ];

    mockFetchWithAuth.mockImplementation((url) => {
      if (url.includes('/leads/import/history') || url.includes('/history')) {
        return Promise.resolve({
          ok: true,
          json: async () => fakeHistory
        });
      }
      if (url.includes('/rename')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ ...fakeHistory[0], filename: 'lista_nova.csv' })
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => []
      });
    });

    render(<ImportHistoryPage />);

    await waitFor(() => {
      expect(screen.getByText('lista_antiga.csv')).toBeDefined();
    });

    // Clicar no botão de edição (pencil icon)
    const editBtn = screen.getByTitle('Renomear lista');
    fireEvent.click(editBtn);

    // Aguardar o input de edição aparecer e preencher
    let input;
    await waitFor(() => {
      input = screen.getByPlaceholderText('Nome da lista');
      expect(input).toBeDefined();
    });
    
    fireEvent.change(input, { target: { value: 'lista_nova.csv' } });

    // Clicar no botão de confirmar (check icon)
    const saveBtn = screen.getByTitle('Salvar');
    fireEvent.click(saveBtn);

    // Verificar se a chamada PUT foi feita
    await waitFor(() => {
      expect(mockFetchWithAuth).toHaveBeenCalledWith(
        expect.stringContaining('/leads/import/1/rename'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ filename: 'lista_nova.csv' })
        }),
        1
      );
    });
  });

  it('suporta paginação e controle de limite de itens', async () => {
    const fakePaginatedResponse = {
      items: [
        {
          id: 1,
          filename: 'lista_paginada_1.csv',
          status: 'completed',
          total_rows: 50,
          imported_rows: 50,
          error_rows: 0,
          created_at: '2026-06-17T12:00:00Z',
          updated_at: '2026-06-17T12:10:00Z'
        }
      ],
      total: 45
    };

    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => fakePaginatedResponse
    });

    render(<ImportHistoryPage />);

    // Deve renderizar a lista da primeira página
    await waitFor(() => {
      expect(screen.getByText('lista_paginada_1.csv')).toBeDefined();
    });

    // Deve mostrar o indicador de paginação
    expect(screen.getByText('Mostrando 1 - 20 de 45 listas')).toBeDefined();

    // Clicar no botão 'Próxima'
    const nextBtn = screen.getByText('Próxima');
    fireEvent.click(nextBtn);

    // Verificar se fez a requisição com skip incrementado
    await waitFor(() => {
      expect(mockFetchWithAuth).toHaveBeenCalledWith(
        expect.stringContaining('skip=20'),
        expect.any(Object),
        1
      );
    });
  });

  it('exibe "Concluída em" com updated_at para importações concluídas', async () => {
    const fakeHistory = {
      items: [
        {
          id: 2,
          filename: 'base_grande.csv',
          status: 'completed',
          total_rows: 1200,
          imported_rows: 1200,
          error_rows: 0,
          created_at: '2026-06-17T17:01:00Z',
          updated_at: '2026-06-17T17:15:00Z'
        }
      ],
      total: 1
    };

    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => fakeHistory
    });

    render(<ImportHistoryPage />);

    await waitFor(() => {
      expect(screen.getByText('base_grande.csv')).toBeDefined();
    });

    // Deve exibir o label "Concluída em" para importação já finalizada
    const dateElements = screen.getAllByText(/Concluída em/i);
    expect(dateElements.length).toBeGreaterThan(0);

    // Não deve exibir "Iniciada em" para uma importação já concluída
    expect(screen.queryByText(/Iniciada em/i)).toBeNull();
  });

  it('exibe "Iniciada em" com created_at para importações em andamento', async () => {
    const fakeHistory = {
      items: [
        {
          id: 3,
          filename: 'processando.csv',
          status: 'processing',
          total_rows: 500,
          imported_rows: 100,
          error_rows: 0,
          created_at: '2026-06-17T17:10:00Z',
          updated_at: '2026-06-17T17:10:00Z'
        }
      ],
      total: 1
    };

    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => fakeHistory
    });

    render(<ImportHistoryPage />);

    await waitFor(() => {
      expect(screen.getByText('processando.csv')).toBeDefined();
    });

    // Deve exibir o label "Iniciada em" para importação em andamento
    const dateElements = screen.getAllByText(/Iniciada em/i);
    expect(dateElements.length).toBeGreaterThan(0);

    // Não deve exibir "Concluída em"
    expect(screen.queryByText(/Concluída em/i)).toBeNull();
  });

  it('não exibe "Invalid Date" para timestamp no formato PostgreSQL (+00:00)', async () => {
    // PostgreSQL retorna timestamps com +00:00 em vez de Z
    const fakeHistory = {
      items: [
        {
          id: 4,
          filename: 'base_postgres.csv',
          status: 'completed',
          total_rows: 300,
          imported_rows: 300,
          error_rows: 0,
          created_at: '2026-06-17T17:01:00+00:00',
          updated_at: '2026-06-17T17:15:00+00:00'
        }
      ],
      total: 1
    };

    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => fakeHistory
    });

    render(<ImportHistoryPage />);

    await waitFor(() => {
      expect(screen.getByText('base_postgres.csv')).toBeDefined();
    });

    // Não deve exibir "Invalid Date"
    expect(screen.queryByText(/Invalid Date/i)).toBeNull();
    // Não deve exibir "Data inválida"
    expect(screen.queryByText(/Data inválida/i)).toBeNull();
    // Deve exibir "Concluída em" com data válida
    const dateElements = screen.getAllByText(/Concluída em/i);
    expect(dateElements.length).toBeGreaterThan(0);
  });
});
