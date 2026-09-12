import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import ImportResultsModal from './ImportResultsModal';
import { fetchWithAuth } from '../../../AuthContext';

vi.mock('../../../AuthContext', () => ({
  fetchWithAuth: vi.fn(),
}));

vi.mock('../../../contexts/ClientContext', () => ({
  useClient: () => ({ activeClient: { id: 1 } }),
}));

describe('ImportResultsModal - Renderização e Prevenção de Loop Infinito', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve buscar os resultados uma única vez ao abrir e não entrar em loop infinito', async () => {
    const mockData = {
      items: [
        {
          id: 1,
          name: 'Lead Teste',
          phone: '5511999999999',
          status: 'imported',
          reason: null,
        },
      ],
      total: 1,
      status_counts: {
        imported: 1,
        updated: 0,
        rejected_invalid_phone: 0,
        rejected_duplicate_file: 0,
        error: 0,
      },
    };

    fetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    render(
      <ImportResultsModal
        isOpen={true}
        onClose={vi.fn()}
        importItem={{ id: 48, filename: 'SendFlow - Leads.csv' }}
      />
    );

    expect(screen.getByText('Detalhes da Importação')).toBeInTheDocument();
    expect(screen.getByText('SendFlow - Leads.csv')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Lead Teste')).toBeInTheDocument();
      expect(screen.getByText('5511999999999')).toBeInTheDocument();
      expect(screen.getByText('Etiquetas')).toBeInTheDocument();
    });

    // Confirma que a API foi chamada apenas uma vez
    expect(fetchWithAuth).toHaveBeenCalledTimes(1);
  });

  it('deve exibir a coluna Etiquetas e as tags dos contatos e do lote', async () => {
    const mockData = {
      items: [
        {
          id: 1,
          name: 'Aluno Astrowake',
          phone: '5511984913214',
          status: 'updated',
          reason: null,
          tags: 'Alunos, Astrowake, VIP',
        },
        {
          id: 2,
          name: 'Sem Tags',
          phone: '554199687565',
          status: 'imported',
          reason: null,
          tags: null,
        },
      ],
      total: 2,
      fixed_tags: 'Alunos, Astrowake',
      status_counts: {
        imported: 1,
        updated: 1,
        rejected_invalid_phone: 0,
        rejected_duplicate_file: 0,
        error: 0,
      },
    };

    fetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    render(
      <ImportResultsModal
        isOpen={true}
        onClose={vi.fn()}
        importItem={{ id: 50, filename: 'AlunosAstrowake.csv', fixed_tags: 'Alunos, Astrowake' }}
      />
    );

    expect(screen.getByText('Detalhes da Importação')).toBeInTheDocument();
    expect(screen.getByText('AlunosAstrowake.csv')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Etiquetas')).toBeInTheDocument();
      expect(screen.getAllByText('Alunos').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Astrowake').length).toBeGreaterThan(0);
      expect(screen.getByText('VIP')).toBeInTheDocument();
    });
  });
});
