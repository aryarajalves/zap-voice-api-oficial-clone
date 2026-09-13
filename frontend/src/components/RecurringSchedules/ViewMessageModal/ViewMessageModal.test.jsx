import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toast } from 'react-hot-toast';
import ViewMessageModal from './ViewMessageModal';
import {
  convertComponentsToParams,
  extractTemplateButtons,
  extractTemplateVariables,
  getHeaderFormat,
  buildTemplateComponents
} from './utils/templateParamUtils';

vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn()
  }
}));

vi.mock('../TemplateSelectorDropdown', () => ({
  default: ({ selectedTemplateName, onSelect, templates }) => (
    <div data-testid="template-selector">
      <span>Selecionado: {selectedTemplateName}</span>
      <button onClick={() => onSelect('Template2')}>Escolher Template2</button>
    </div>
  )
}));

vi.mock('../../BulkSender/common/TemplatePreview', () => ({
  default: ({ template }) => (
    <div data-testid="template-preview">
      Template Preview: {template?.name}
    </div>
  )
}));

vi.mock('../../BulkSender/steps/ButtonActionsSection', () => ({
  default: () => <div data-testid="button-actions-section">Button Actions Mock</div>
}));

describe('ViewMessageModal e templateParamUtils', () => {
  const mockTemplates = [
    {
      id: 1,
      name: 'Template1',
      components: [
        { type: 'HEADER', format: 'IMAGE' },
        { type: 'BODY', text: 'Olá {{1}}, seu código é {{2}}' },
        {
          type: 'BUTTONS',
          buttons: [
            { type: 'QUICK_REPLY', text: 'Sim' },
            { type: 'URL', url: 'https://exemplo.com' }
          ]
        }
      ]
    },
    {
      id: 2,
      name: 'Template2',
      components: [
        { type: 'BODY', text: 'Mensagem simples sem variáveis' }
      ]
    }
  ];

  const mockSchedule = {
    id: 10,
    template_name: 'Template1',
    template_components: [
      {
        type: 'header',
        parameters: [{ type: 'image', image: { link: 'https://img.com/foto.jpg' } }]
      },
      {
        type: 'body',
        parameters: [
          { type: 'text', text: 'Carlos' },
          { type: 'text', text: '9876' }
        ]
      }
    ],
    button_actions: {}
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('templateParamUtils', () => {
    it('convertComponentsToParams converte header e body corretamente', () => {
      const params = convertComponentsToParams(mockSchedule.template_components);
      expect(params['HEADER_0']).toBe('https://img.com/foto.jpg');
      expect(params['BODY_0']).toBe('Carlos');
      expect(params['BODY_1']).toBe('9876');
    });

    it('extractTemplateButtons ignora botões do tipo URL e PHONE', () => {
      const buttons = extractTemplateButtons(mockTemplates[0]);
      expect(buttons).toEqual(['Sim']);
    });

    it('extractTemplateVariables extrai e formata variáveis do corpo', () => {
      const vars = extractTemplateVariables(mockTemplates[0]);
      expect(vars).toHaveLength(2);
      expect(vars[0]).toEqual({ key: 'BODY_0', label: '{{1}}' });
      expect(vars[1]).toEqual({ key: 'BODY_1', label: '{{2}}' });
    });

    it('getHeaderFormat retorna formato do header', () => {
      expect(getHeaderFormat(mockTemplates[0])).toBe('IMAGE');
      expect(getHeaderFormat(mockTemplates[1])).toBeNull();
    });

    it('buildTemplateComponents monta estrutura esperada', () => {
      const components = buildTemplateComponents(mockTemplates[0], {
        HEADER_0: 'https://cdn.com/banner.png',
        BODY_0: 'Maria',
        BODY_1: '1234'
      });
      expect(components).toHaveLength(2);
      expect(components[0].type).toBe('header');
      expect(components[0].parameters[0].image.link).toBe('https://cdn.com/banner.png');
      expect(components[1].type).toBe('body');
      expect(components[1].parameters[0].text).toBe('Maria');
    });
  });

  describe('ViewMessageModal Componente', () => {
    it('retorna null quando viewingMessageSchedule for nulo', () => {
      const { container } = render(
        <ViewMessageModal viewingMessageSchedule={null} onClose={vi.fn()} onSave={vi.fn()} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('renderiza modo de visualização inicial corretamente', () => {
      render(
        <ViewMessageModal
          viewingMessageSchedule={mockSchedule}
          onClose={vi.fn()}
          onSave={vi.fn()}
          templates={mockTemplates}
        />
      );

      expect(screen.getByText('Conteúdo do Envio')).toBeInTheDocument();
      expect(screen.getByText(/Template WhatsApp:/i)).toBeInTheDocument();
      expect(screen.getByText('Template1')).toBeInTheDocument();
      expect(screen.getByTestId('template-preview')).toBeInTheDocument();
      expect(screen.getByText('Alterar Mensagem')).toBeInTheDocument();
    });

    it('permite alternar para modo de edição e salvar alterações', () => {
      const onSave = vi.fn();
      render(
        <ViewMessageModal
          viewingMessageSchedule={mockSchedule}
          onClose={vi.fn()}
          onSave={onSave}
          templates={mockTemplates}
        />
      );

      const editBtn = screen.getByText('Alterar Mensagem');
      fireEvent.click(editBtn);

      expect(screen.getByText('Editar Conteúdo do Envio')).toBeInTheDocument();
      expect(screen.getByTestId('template-selector')).toBeInTheDocument();
      expect(screen.getByText('Salvar Alterações')).toBeInTheDocument();

      const saveBtn = screen.getByText('Salvar Alterações');
      fireEvent.click(saveBtn);

      expect(onSave).toHaveBeenCalledWith(10, expect.objectContaining({
        template_name: 'Template1'
      }));
    });

    it('aciona onClose ao clicar no botão Fechar', () => {
      const onClose = vi.fn();
      render(
        <ViewMessageModal
          viewingMessageSchedule={mockSchedule}
          onClose={onClose}
          onSave={vi.fn()}
          templates={mockTemplates}
        />
      );

      const closeBtn = screen.getByText('Fechar');
      fireEvent.click(closeBtn);
      expect(onClose).toHaveBeenCalled();
    });
  });
});
