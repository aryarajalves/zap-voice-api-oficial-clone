import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Table from './Table';
import { toast } from 'react-hot-toast';

// Mock dependencies
vi.mock('../../../contexts/ClientContext', () => ({
  useClient: () => ({
    activeClient: { id: 1, name: 'Client Test' }
  })
}));

vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

describe('Table Component - Lock and Delete Behavior', () => {
  const mockLeads = [
    {
      id: 1,
      name: 'Lead Bloqueado',
      phone: '5511999999991',
      email: 'locked@example.com',
      is_locked: true,
      created_at: '2026-05-27T17:44:00Z'
    },
    {
      id: 2,
      name: 'Lead Normal',
      phone: '5511999999992',
      email: 'normal@example.com',
      is_locked: false,
      created_at: '2026-05-27T17:44:00Z'
    }
  ];

  const mockProps = {
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
    total: 2,
    limit: 20,
    setLimit: vi.fn(),
    fetchLeads: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exibe erro toast e não abre modal de delete ao clicar no botão de exclusão de lead bloqueado', () => {
    render(<Table {...mockProps} />);

    // Buscar os botões de exclusão. Existem dois na tabela.
    // O primeiro botão é do Lead Bloqueado.
    const deleteButtons = screen.getAllByTitle(/Excluir Contato e Histórico|Contato bloqueado — desbloqueie para excluir/);
    expect(deleteButtons).toHaveLength(2);

    // Clicar no botão do lead bloqueado (primeiro item)
    fireEvent.click(deleteButtons[0]);

    // Verificar que disparou toast.error e não chamou as funções de abrir modal
    expect(toast.error).toHaveBeenCalledWith('Não é possível deletar um contato bloqueado.');
    expect(mockProps.setLeadToDelete).not.toHaveBeenCalled();
    expect(mockProps.setIsDeleteModalOpen).not.toHaveBeenCalled();
  });

  it('abre o modal de exclusão ao clicar no botão de exclusão de lead normal', () => {
    render(<Table {...mockProps} />);

    const deleteButtons = screen.getAllByTitle(/Excluir Contato e Histórico/);
    // Como o primeiro é bloqueado, o título correspondente de excluir ativo é apenas o do segundo
    expect(deleteButtons).toHaveLength(1);

    // Clicar no botão do lead normal
    fireEvent.click(deleteButtons[0]);

    // Verificar que NÃO disparou toast.error e chamou as funções de abrir modal
    expect(toast.error).not.toHaveBeenCalled();
    expect(mockProps.setLeadToDelete).toHaveBeenCalledWith(mockLeads[1]);
    expect(mockProps.setIsDeleteModalOpen).toHaveBeenCalledWith(true);
  });

  it('desabilita o checkbox de seleção para contatos bloqueados e o mantém habilitado para normais', () => {
    render(<Table {...mockProps} />);

    // Buscar os checkboxes. Na tabela temos 1 do header + 2 das linhas.
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(3);

    const headerCheckbox = checkboxes[0];
    const lockedCheckbox = checkboxes[1];
    const normalCheckbox = checkboxes[2];

    expect(lockedCheckbox).toBeDisabled();
    expect(normalCheckbox).not.toBeDisabled();
  });
});
