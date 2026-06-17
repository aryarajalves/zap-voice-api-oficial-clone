import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import Table from './Table';
import { useClient } from '../../../contexts/ClientContext';
import { toast } from 'react-hot-toast';

vi.mock('../../../contexts/ClientContext', () => ({
  useClient: vi.fn(),
}));

vi.mock('react-icons/fi', () => ({
  FiExternalLink: () => <span data-testid="icon-external-link" />,
  FiMessageSquare: () => <span data-testid="icon-message-square" />,
  FiEdit2: () => <span data-testid="icon-edit" />,
  FiTrash2: () => <span data-testid="icon-trash" />,
  FiCalendar: () => <span data-testid="icon-calendar" />,
  FiLock: () => <span data-testid="icon-lock" />,
  FiUnlock: () => <span data-testid="icon-unlock" />,
  FiDatabase: () => <span data-testid="icon-database" />,
}));

vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../../AuthContext', () => ({
  fetchWithAuth: vi.fn(),
}));

import { fetchWithAuth } from '../../../AuthContext';

const mockLeads = [
  {
    id: 1,
    name: 'Leonardo José Da Silva',
    phone: '5521972696605',
    email: 'leonardojose35diacono@gmail.com',
    tags: 'tag1, tag2, tag3, tag4, tag5',
    created_at: '2026-06-17T12:18:00.000Z',
    is_locked: false,
  }
];

const defaultProps = {
  loading: false,
  leads: mockLeads,
  selectedLeads: [],
  handleSelectAll: vi.fn(),
  handleSelectLead: vi.fn(),
  setLeadToEdit: vi.fn(),
  setIsEditModalOpen: vi.fn(),
  setLeadToDelete: vi.fn(),
  setIsDeleteModalOpen: vi.fn(),
  page: 0,
  setPage: vi.fn(),
  total: 1,
  limit: 20,
  setLimit: vi.fn(),
  fetchLeads: vi.fn(),
};

describe('Leads Table - Tags Limit and Visibilities Selector Modal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useClient.mockReturnValue({
      activeClient: { id: 1, name: 'Client Test' },
    });
  });

  it('exibe no máximo 3 tags para contatos e oculta o restante com botão +N', () => {
    render(<Table {...defaultProps} />);

    expect(screen.getByText('tag1')).toBeInTheDocument();
    expect(screen.getByText('tag2')).toBeInTheDocument();
    expect(screen.getByText('tag3')).toBeInTheDocument();

    expect(screen.queryByText('tag4')).not.toBeInTheDocument();
    expect(screen.queryByText('tag5')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+2' })).toBeInTheDocument();
  });

  it('abre popup modal de visibilidade ao clicar no botão +N, valida limite de 3 tags visíveis e envia atualização', async () => {
    fetchWithAuth.mockResolvedValue({ ok: true, json: async () => ({}) });

    render(<Table {...defaultProps} />);

    const plusTwoBtn = screen.getByRole('button', { name: '+2' });
    fireEvent.click(plusTwoBtn);

    // Deve abrir o modal interativo
    expect(screen.getByText(/Gerenciar Etiquetas de:/)).toBeInTheDocument();
    expect(screen.getAllByText('Leonardo José Da Silva')).toHaveLength(2);

    // As tags devem aparecer com seus status
    expect(screen.getAllByText('tag1')).toHaveLength(2);
    expect(screen.getByText('tag4')).toBeInTheDocument();
    
    // As 3 primeiras devem começar marcadas como "Visível"
    const visibleBadges = screen.getAllByText('Visível');
    expect(visibleBadges.length).toBe(3);

    // Tentar marcar uma 4ª tag como visível (tag4) deve gerar erro
    const tag4Row = screen.getByText('tag4').closest('div');
    fireEvent.click(tag4Row);
    expect(toast.error).toHaveBeenCalledWith("Você pode selecionar no máximo 3 etiquetas para exibir na tela inicial.");

    // Desmarcar uma tag visível (tag1 - a do modal é a segunda ocorrência na tela)
    const tag1Row = screen.getAllByText('tag1')[1].closest('div');
    fireEvent.click(tag1Row);

    // Agora deve permitir marcar a tag4 como visível
    fireEvent.click(tag4Row);
    
    // Clica em Salvar Alterações
    const saveBtn = screen.getByRole('button', { name: 'Salvar Alterações' });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(fetchWithAuth).toHaveBeenCalled();
    });
  });

  it('renderiza apenas as tags especificadas em variables.visible_tags', () => {
    const leadsWithPref = [
      {
        ...mockLeads[0],
        variables: {
          visible_tags: ['tag1', 'tag4']
        }
      }
    ];

    render(<Table {...defaultProps} leads={leadsWithPref} />);

    // Devem aparecer apenas tag1 e tag4 na tabela principal
    expect(screen.getByText('tag1')).toBeInTheDocument();
    expect(screen.getByText('tag4')).toBeInTheDocument();

    // Outras não devem aparecer como visíveis
    expect(screen.queryByText('tag2')).not.toBeInTheDocument();
    expect(screen.queryByText('tag3')).not.toBeInTheDocument();
    expect(screen.queryByText('tag5')).not.toBeInTheDocument();

    // Deve mostrar +3 para as tags ocultas (tag2, tag3, tag5)
    expect(screen.getByRole('button', { name: '+3' })).toBeInTheDocument();
  });
});
