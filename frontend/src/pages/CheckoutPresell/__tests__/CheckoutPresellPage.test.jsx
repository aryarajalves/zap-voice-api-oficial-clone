import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import CheckoutPresellHeader from '../components/CheckoutPresellHeader';
import CheckoutPresellConfigTab from '../components/CheckoutPresellConfigTab';
import CheckoutPresellLeadsTab from '../components/CheckoutPresellLeadsTab';

describe('CheckoutPresell Components', () => {
  describe('CheckoutPresellHeader', () => {
    it('renderiza o título e o link público', () => {
      const config = { slug: 'mentoria-vip' };
      const getPublicUrl = (s) => `http://localhost:5173/c/${s || config.slug}`;

      render(<CheckoutPresellHeader config={config} getPublicUrl={getPublicUrl} />);

      expect(screen.getByText('Checkout Prepopulado')).toBeDefined();
      expect(screen.getByText('http://localhost:5173/c/mentoria-vip')).toBeDefined();
    });
  });

  describe('CheckoutPresellConfigTab', () => {
    it('renderiza os campos de configuração e botão de salvar', () => {
      const config = {
        slug: 'teste-slug',
        destination_url: 'https://exemplo.com/checkout',
        title: 'Título Teste',
        description: 'Desc Teste',
        badge_text: 'Badge Teste',
        tag_name: 'Tag Teste',
        page_tab_title: 'Tab Title Teste',
        button_text: 'Avançar Teste'
      };
      const onSave = vi.fn((e) => e.preventDefault());

      render(
        <CheckoutPresellConfigTab
          config={config}
          setConfig={vi.fn()}
          loadingConfig={false}
          savingConfig={false}
          onSaveConfig={onSave}
          getPublicUrl={() => 'http://localhost/c/teste-slug'}
        />
      );

      expect(screen.getByDisplayValue('teste-slug')).toBeDefined();
      expect(screen.getByDisplayValue('https://exemplo.com/checkout')).toBeDefined();
      expect(screen.getByText('Salvar Configurações')).toBeDefined();
    });
  });

  describe('CheckoutPresellLeadsTab', () => {
    it('renderiza a tabela de leads capturados com botões de ação', () => {
      const leads = [
        {
          id: 'lead-1',
          name: 'João Silva',
          email: 'joao@email.com',
          phone: '5511999999999',
          tag_name: 'Mentoria Presell',
          created_at: '2026-08-16T12:00:00Z',
          has_chat: true,
          conversation_id: 123
        }
      ];

      render(
        <CheckoutPresellLeadsTab
          leads={leads}
          totalLeads={1}
          loadingLeads={false}
          search=""
          setSearch={vi.fn()}
          onSearchSubmit={vi.fn()}
          page={1}
          setPage={vi.fn()}
          limit={20}
          setLimit={vi.fn()}
          copiedLeadId={null}
          onCopyPrepopulatedLink={vi.fn()}
          onNavigateToChat={vi.fn()}
          onOpenDeleteModal={vi.fn()}
          onOpenTemplateModal={vi.fn()}
          loadingTemplateConvo={false}
        />
      );

      expect(screen.getByText('João Silva')).toBeDefined();
      expect(screen.getByText('joao@email.com')).toBeDefined();
      expect(screen.getByText('+5511999999999')).toBeDefined();
      expect(screen.getByText('Mentoria Presell')).toBeDefined();
      expect(screen.getByText('Copiar Link Lead')).toBeDefined();
    });
  });
});
