import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import CapturePageHeader from '../components/CapturePageHeader';
import CapturePageLeadsTab from '../components/CapturePageLeadsTab';
import DeleteCaptureLeadModal from '../components/DeleteCaptureLeadModal';

describe('CapturePageAdmin Subcomponents', () => {
  describe('CapturePageHeader', () => {
    it('renderiza o link público e o título', () => {
      render(<CapturePageHeader publicUrl="http://localhost:5173/masterclass" />);
      expect(screen.getByText('Página de Captura Personalizada')).toBeDefined();
      expect(screen.getByText('http://localhost:5173/masterclass')).toBeDefined();
    });
  });

  describe('CapturePageLeadsTab', () => {
    it('renderiza a lista de leads capturados', () => {
      const leads = [
        { id: 1, email: 'contato@teste.com', created_at: '2026-08-16T15:00:00Z' }
      ];

      render(
        <CapturePageLeadsTab
          leads={leads}
          loadingLeads={false}
          search=""
          setSearch={vi.fn()}
          onSearchChange={vi.fn()}
          onOpenDeleteModal={vi.fn()}
        />
      );

      expect(screen.getByText('contato@teste.com')).toBeDefined();
    });

    it('exibe mensagem quando não há leads', () => {
      render(
        <CapturePageLeadsTab
          leads={[]}
          loadingLeads={false}
          search=""
          setSearch={vi.fn()}
          onSearchChange={vi.fn()}
          onOpenDeleteModal={vi.fn()}
        />
      );

      expect(screen.getByText('Nenhum lead capturado até o momento.')).toBeDefined();
    });
  });

  describe('DeleteCaptureLeadModal', () => {
    it('renderiza o modal de deleção com o email do lead', () => {
      const lead = { id: 1, email: 'contato@teste.com' };

      render(
        <DeleteCaptureLeadModal
          leadToDelete={lead}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
        />
      );

      expect(screen.getByText('Excluir Lead')).toBeDefined();
      expect(screen.getByText('contato@teste.com')).toBeDefined();
      expect(screen.getByText('Sim, Excluir')).toBeDefined();
    });
  });
});
