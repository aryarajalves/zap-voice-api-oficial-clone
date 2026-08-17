import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import SearchableTemplateSelect from '../bulk/SearchableTemplateSelect';
import SearchableTagSelect from '../bulk/SearchableTagSelect';
import EmailRecipientsPreview from '../bulk/EmailRecipientsPreview';
import EmailSchedulingSection from '../bulk/EmailSchedulingSection';

describe('EmailBulkTab Subcomponents', () => {
  describe('SearchableTemplateSelect', () => {
    it('renderiza o seletor com templates disponíveis', () => {
      const handleSelect = vi.fn();
      const templates = [
        { id: 1, name: 'Template Black Friday', subject: 'Super Oferta' },
        { id: 2, name: 'Template Boas-Vindas', subject: 'Bem-vindo!' }
      ];

      render(
        <SearchableTemplateSelect
          templates={templates}
          selectedId={1}
          onSelect={handleSelect}
        />
      );

      expect(screen.getByText('Template Black Friday')).toBeDefined();
    });
  });

  describe('SearchableTagSelect', () => {
    it('renderiza o seletor com etiquetas disponíveis', () => {
      const handleSelect = vi.fn();
      const tags = ['VIP', 'Lead Frio', 'Cliente Ativo'];

      render(
        <SearchableTagSelect
          tags={tags}
          selectedTag="VIP"
          onSelect={handleSelect}
        />
      );

      expect(screen.getByText('VIP')).toBeDefined();
    });
  });

  describe('EmailRecipientsPreview', () => {
    it('renderiza a contagem e a lista de destinatários', () => {
      const recipients = [
        { id: 1, email: 'cliente1@teste.com', name: 'Maria', tags: 'VIP' },
        { id: 2, email: 'cliente2@teste.com', name: 'Carlos', tags: 'VIP' }
      ];

      render(
        <EmailRecipientsPreview
          recipients={recipients}
          previewLoading={false}
        />
      );

      expect(screen.getByText('2 contatos')).toBeDefined();
      expect(screen.getByText('cliente1@teste.com')).toBeDefined();
      expect(screen.getByText('cliente2@teste.com')).toBeDefined();
    });
  });

  describe('EmailSchedulingSection', () => {
    it('permite alternar entre Enviar Agora e Agendar Disparo', () => {
      const setSendMode = vi.fn();
      const setScheduledAt = vi.fn();

      render(
        <EmailSchedulingSection
          sendMode="scheduled"
          setSendMode={setSendMode}
          scheduledAt="2026-12-01T10:00"
          setScheduledAt={setScheduledAt}
        />
      );

      expect(screen.getByText('Quando enviar?')).toBeDefined();
      expect(screen.getByText('Agendar Disparo')).toBeDefined();
      expect(screen.getByText('Data e Horário do Disparo')).toBeDefined();
    });
  });
});
