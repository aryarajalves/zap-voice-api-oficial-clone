import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { parseUtcDate, formatDateBrasilia } from './utils/leadTableUtils';
import TagsCell from './components/TagsCell';
import RestingCountdown from './components/RestingCountdown';
import LeadInfoCell from './components/LeadInfoCell';
import LeadRowActions from './components/LeadRowActions';
import ResetTemplateModal from './components/ResetTemplateModal';

describe('LeadTableRow modular components and utils', () => {
  describe('leadTableUtils', () => {
    it('parseUtcDate interpreta ISO com ou sem Z', () => {
      expect(parseUtcDate(null)).toBeNull();
      expect(parseUtcDate('')).toBeNull();
      const d1 = parseUtcDate('2026-08-15T12:00:00Z');
      expect(d1).toBeInstanceOf(Date);
      const d2 = parseUtcDate('2026-08-15T12:00:00');
      expect(d2).toBeInstanceOf(Date);
    });

    it('formatDateBrasilia formata data ou retorna ---', () => {
      expect(formatDateBrasilia(null)).toBe('---');
      expect(formatDateBrasilia('invalid-date')).toBe('---');
      const formatted = formatDateBrasilia('2026-08-15T15:30:00Z');
      expect(formatted).toContain('2026');
    });
  });

  describe('TagsCell', () => {
    it('renderiza "Sem etiquetas" quando lead não possui tags', () => {
      render(<TagsCell lead={{ tags: null }} onOpenTagsModal={vi.fn()} />);
      expect(screen.getByText('Sem etiquetas')).toBeInTheDocument();
    });

    it('renderiza tags limpas e botão +N para tags ocultas', () => {
      const onOpenTagsModal = vi.fn();
      const lead = {
        tags: '["vip", "cliente", "lead", "whatsapp", "ativo"]',
        variables: {}
      };
      render(<TagsCell lead={lead} onOpenTagsModal={onOpenTagsModal} />);

      expect(screen.getByText('vip')).toBeInTheDocument();
      expect(screen.getByText('cliente')).toBeInTheDocument();
      expect(screen.getByText('lead')).toBeInTheDocument();

      const moreBtn = screen.getByTitle('Ver todas as etiquetas');
      expect(moreBtn).toHaveTextContent('+2');

      fireEvent.click(moreBtn);
      expect(onOpenTagsModal).toHaveBeenCalledWith(lead);
    });
  });

  describe('RestingCountdown', () => {
    it('retorna nulo se não houver expiresAt ou já estiver expirado', () => {
      const { container } = render(<RestingCountdown expiresAt={null} />);
      expect(container.firstChild).toBeNull();

      const { container: expiredContainer } = render(
        <RestingCountdown expiresAt="2020-01-01T00:00:00Z" />
      );
      expect(expiredContainer.firstChild).toBeNull();
    });

    it('exibe contagem regressiva se data estiver no futuro', () => {
      const futureDate = new Date(Date.now() + 3600 * 1000 * 2).toISOString();
      render(<RestingCountdown expiresAt={futureDate} />);
      expect(screen.getByText(/Repouso:/i)).toBeInTheDocument();
    });
  });

  describe('LeadInfoCell', () => {
    it('renderiza avatar, nome, badges e telefone', () => {
      const onOpenResetModal = vi.fn();
      const lead = {
        name: 'Maria Silva',
        phone: '5585999998888',
        platform: 'chatwoot_import',
        last_template_name: 'boas_vindas',
        last_template_dispatched_at: '2026-08-15T12:00:00Z'
      };

      render(<LeadInfoCell lead={lead} onOpenResetModal={onOpenResetModal} />);

      expect(screen.getByText('M')).toBeInTheDocument();
      expect(screen.getByText('Maria Silva')).toBeInTheDocument();
      expect(screen.getByText('Chatwoot')).toBeInTheDocument();
      expect(screen.getByText('5585999998888')).toBeInTheDocument();
      expect(screen.getByText(/boas_vindas/i)).toBeInTheDocument();

      const trashBtn = screen.getByTitle(/Remover trava de 24h/i);
      fireEvent.click(trashBtn);
      expect(onOpenResetModal).toHaveBeenCalled();
    });
  });

  describe('LeadRowActions', () => {
    it('dispara onEdit ao clicar no botão de editar', () => {
      const onEdit = vi.fn();
      const lead = { id: 1, is_locked: false };

      render(
        <LeadRowActions
          lead={lead}
          togglingLock={null}
          onOpenVariables={vi.fn()}
          onEdit={onEdit}
          onOpenBlockModal={vi.fn()}
          onUnblockSingle={vi.fn()}
          onToggleLock={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      const editBtn = screen.getByTitle('Editar Lead');
      fireEvent.click(editBtn);
      expect(onEdit).toHaveBeenCalledWith(lead);
    });

    it('dispara onToggleLock ao clicar no botão de proteção', () => {
      const onToggleLock = vi.fn();
      const lead = { id: 1, is_locked: false };

      render(
        <LeadRowActions
          lead={lead}
          togglingLock={null}
          onOpenVariables={vi.fn()}
          onEdit={vi.fn()}
          onOpenBlockModal={vi.fn()}
          onUnblockSingle={vi.fn()}
          onToggleLock={onToggleLock}
          onDelete={vi.fn()}
        />
      );

      const lockBtn = screen.getByTitle(/Proteger contato/i);
      fireEvent.click(lockBtn);
      expect(onToggleLock).toHaveBeenCalledWith(lead);
    });
  });

  describe('ResetTemplateModal', () => {
    it('não renderiza se isOpen for falso', () => {
      const { container } = render(
        <ResetTemplateModal
          isOpen={false}
          isResetting={false}
          lead={{ name: 'Teste' }}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it('renderiza modal e aciona confirm e close', () => {
      const onClose = vi.fn();
      const onConfirm = vi.fn();

      render(
        <ResetTemplateModal
          isOpen={true}
          isResetting={false}
          lead={{ name: 'Contato Teste', last_template_name: 'template_1' }}
          onClose={onClose}
          onConfirm={onConfirm}
        />
      );

      expect(screen.getByText(/Remover Trava de 24h de Template\?/i)).toBeInTheDocument();
      expect(screen.getByText('template_1')).toBeInTheDocument();

      const cancelBtn = screen.getByRole('button', { name: /Cancelar/i });
      fireEvent.click(cancelBtn);
      expect(onClose).toHaveBeenCalled();

      const confirmBtn = screen.getByRole('button', { name: /Confirmar Remoção/i });
      fireEvent.click(confirmBtn);
      expect(onConfirm).toHaveBeenCalled();
    });
  });
});
