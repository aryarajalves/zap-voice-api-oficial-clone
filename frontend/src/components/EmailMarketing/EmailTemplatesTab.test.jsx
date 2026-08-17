import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import EmailTemplatesTab from './EmailTemplatesTab';
import EmailTemplateCard from './components/EmailTemplateCard';
import EmailDeleteConfirmModal from './components/EmailDeleteConfirmModal';
import { formatTextToHtml } from './hooks/useEmailTemplates';

// Mock ClientContext
vi.mock('../../contexts/ClientContext', () => ({
  useClient: () => ({ activeClient: { id: 1, name: 'Cliente Teste' } })
}));

describe('EmailTemplatesTab and Submodules Unit Tests', () => {
  it('formatTextToHtml converte quebras de linha e listas para tags HTML', () => {
    const textWithList = 'Olá\n* Item 1\n* Item 2\nFim';
    const html = formatTextToHtml(textWithList);
    expect(html).toContain('<ul');
    expect(html).toContain('Item 1</li>');
    expect(html).toContain('Item 2</li>');
    expect(html).toContain('<br />');

    const fullHtml = '<table role="presentation"><tr><td>Teste</td></tr></table>';
    expect(formatTextToHtml(fullHtml)).toBe(fullHtml);
  });

  it('EmailTemplateCard renderiza dados do template e dispara onEdit e onDelete', () => {
    const template = {
      id: 10,
      name: 'Boas-vindas VIP',
      subject: 'Seu acesso chegou!',
      body_html: '<p>Olá mundo!</p>'
    };

    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <EmailTemplateCard
        template={template}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );

    expect(screen.getByText('Boas-vindas VIP')).toBeDefined();
    expect(screen.getByText(/Seu acesso chegou!/)).toBeDefined();
    expect(screen.getByText('Olá mundo!')).toBeDefined();

    fireEvent.click(screen.getByText('Editar'));
    expect(onEdit).toHaveBeenCalledWith(template);

    fireEvent.click(screen.getByText('Excluir'));
    expect(onDelete).toHaveBeenCalledWith(template);
  });

  it('EmailDeleteConfirmModal renderiza confirmação e dispara onConfirm', () => {
    const template = { id: 10, name: 'Template Antigo' };
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    render(
      <EmailDeleteConfirmModal
        isOpen={true}
        onClose={onClose}
        template={template}
        onConfirm={onConfirm}
        loading={false}
      />
    );

    expect(screen.getByText('Excluir Template de E-mail')).toBeDefined();
    expect(screen.getByText(/Template Antigo/)).toBeDefined();

    fireEvent.click(screen.getByText('Confirmar Exclusão'));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Cancelar'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('EmailTemplatesTab renderiza o cabeçalho e botão Novo Template', () => {
    render(<EmailTemplatesTab />);

    expect(screen.getByText('Templates de E-mail')).toBeDefined();
    expect(screen.getByText('Novo Template')).toBeDefined();
  });
});
