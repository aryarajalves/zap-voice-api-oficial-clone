import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import LeadTableRow from './LeadTableRow';

vi.mock('../../../contexts/ClientContext', () => ({
  useClient: () => ({ activeClient: { id: 1, name: 'Test' } })
}));

vi.mock('../../../AuthContext', () => ({
  fetchWithAuth: vi.fn()
}));

vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
  default: {
    success: vi.fn(),
    error: vi.fn(),
  }
}));

describe('LeadTableRow Component - Block/Unblock Action', () => {
  const baseLead = {
    id: 101,
    name: 'Aryaraj',
    phone: '558596123586',
    email: null,
    tags: '["aryaraj"]',
    is_really_blocked: false,
    resting_expires_at: null,
    is_locked: false,
    created_at: '2026-08-15T08:08:00Z',
    updated_at: '2026-08-15T08:08:00Z'
  };

  it('quando o contato não está bloqueado, exibe botão para bloquear e abre modal ao clicar', () => {
    const onOpenBlockModal = vi.fn();
    const onUnblockSingle = vi.fn();

    render(
      <table>
        <tbody>
          <LeadTableRow
            lead={baseLead}
            selectedLeads={[]}
            showCustomColumns={false}
            customColumnsKeys={[]}
            togglingLock={null}
            onSelectLead={vi.fn()}
            onEdit={vi.fn()}
            onDelete={vi.fn()}
            onToggleLock={vi.fn()}
            onOpenVariables={vi.fn()}
            onOpenTagsModal={vi.fn()}
            onOpenBlockModal={onOpenBlockModal}
            onUnblockSingle={onUnblockSingle}
            updateLeadInPlace={vi.fn()}
          />
        </tbody>
      </table>
    );

    const blockBtn = screen.getByTitle('Bloquear ou Colocar em Repouso');
    expect(blockBtn).toBeInTheDocument();

    fireEvent.click(blockBtn);
    expect(onOpenBlockModal).toHaveBeenCalledWith(baseLead);
    expect(onUnblockSingle).not.toHaveBeenCalled();
  });

  it('quando o contato já está bloqueado, o botão vira botão de desbloquear e chama onUnblockSingle', () => {
    const blockedLead = { ...baseLead, is_really_blocked: true };
    const onOpenBlockModal = vi.fn();
    const onUnblockSingle = vi.fn();

    render(
      <table>
        <tbody>
          <LeadTableRow
            lead={blockedLead}
            selectedLeads={[]}
            showCustomColumns={false}
            customColumnsKeys={[]}
            togglingLock={null}
            onSelectLead={vi.fn()}
            onEdit={vi.fn()}
            onDelete={vi.fn()}
            onToggleLock={vi.fn()}
            onOpenVariables={vi.fn()}
            onOpenTagsModal={vi.fn()}
            onOpenBlockModal={onOpenBlockModal}
            onUnblockSingle={onUnblockSingle}
            updateLeadInPlace={vi.fn()}
          />
        </tbody>
      </table>
    );

    const unblockBtn = screen.getByTitle('Contato Bloqueado — clique para desbloquear');
    expect(unblockBtn).toBeInTheDocument();

    fireEvent.click(unblockBtn);
    expect(onUnblockSingle).toHaveBeenCalledWith(blockedLead);
    expect(onOpenBlockModal).not.toHaveBeenCalled();
  });

  it('quando o contato está em repouso, o botão permite remover do repouso e chama onUnblockSingle', () => {
    const restingLead = { ...baseLead, resting_expires_at: '2026-08-16T12:00:00Z' };
    const onOpenBlockModal = vi.fn();
    const onUnblockSingle = vi.fn();

    render(
      <table>
        <tbody>
          <LeadTableRow
            lead={restingLead}
            selectedLeads={[]}
            showCustomColumns={false}
            customColumnsKeys={[]}
            togglingLock={null}
            onSelectLead={vi.fn()}
            onEdit={vi.fn()}
            onDelete={vi.fn()}
            onToggleLock={vi.fn()}
            onOpenVariables={vi.fn()}
            onOpenTagsModal={vi.fn()}
            onOpenBlockModal={onOpenBlockModal}
            onUnblockSingle={onUnblockSingle}
            updateLeadInPlace={vi.fn()}
          />
        </tbody>
      </table>
    );

    const unblockBtn = screen.getByTitle('Contato em Repouso — clique para remover do repouso');
    expect(unblockBtn).toBeInTheDocument();

    fireEvent.click(unblockBtn);
    expect(onUnblockSingle).toHaveBeenCalledWith(restingLead);
    expect(onOpenBlockModal).not.toHaveBeenCalled();
  });
});
