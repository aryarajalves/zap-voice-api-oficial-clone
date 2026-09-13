import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import EmailHistoryTab, {
  useEmailHistory,
  EmailHistoryHeader,
  EmailHistoryFilters,
  EmailHistoryTable,
  DeleteDispatchModal,
  StatusBadge,
  formatDate
} from './EmailHistoryTab';
import * as ClientContext from '../../contexts/ClientContext';

describe('Modularização de EmailHistoryTab', () => {
  beforeEach(() => {
    vi.spyOn(ClientContext, 'useClient').mockReturnValue({
      activeClient: { id: 1, name: 'Cliente Teste' }
    });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 101,
          title: 'Campanha Black Friday',
          subject: 'Ofertas Imperdíveis',
          tag_name: 'VIPs',
          total_contacts: 150,
          total_sent: 148,
          total_failed: 2,
          status: 'completed',
          created_at: '2026-09-12T10:00:00Z'
        }
      ]
    });
  });

  it('deve exportar todos os submódulos e utilitários', () => {
    expect(useEmailHistory).toBeDefined();
    expect(EmailHistoryHeader).toBeDefined();
    expect(EmailHistoryFilters).toBeDefined();
    expect(EmailHistoryTable).toBeDefined();
    expect(DeleteDispatchModal).toBeDefined();
    expect(StatusBadge).toBeDefined();
    expect(formatDate).toBeDefined();
  });

  it('deve renderizar o componente EmailHistoryTab com histórico carregado', async () => {
    render(<EmailHistoryTab />);

    expect(screen.getByText('Histórico de Disparos de E-mail')).toBeInTheDocument();
    expect(screen.getByText('Filtros')).toBeInTheDocument();
    expect(await screen.findByText('Campanha Black Friday')).toBeInTheDocument();
    expect(screen.getByText('📌 Ofertas Imperdíveis')).toBeInTheDocument();
  });

  it('deve formatar data adequadamente com formatDate', () => {
    const formatted = formatDate('2026-09-12T12:00:00Z');
    expect(formatted).not.toBe('-');
  });

  it('deve abrir modal de confirmação de exclusão quando acionado', () => {
    const mockTarget = { id: 101, title: 'Disparo Teste', subject: 'Assunto Teste' };
    const mockDelete = vi.fn();
    const mockSetTarget = vi.fn();

    render(
      <DeleteDispatchModal
        deleteTarget={mockTarget}
        setDeleteTarget={mockSetTarget}
        deleting={false}
        handleDeleteDispatch={mockDelete}
      />
    );

    expect(screen.getByText('Excluir Histórico de Disparo')).toBeInTheDocument();
    expect(screen.getByText(/Disparo Teste/)).toBeInTheDocument();
  });
});
