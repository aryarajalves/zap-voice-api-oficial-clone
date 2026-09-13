import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import SendTemplateModal from '../../SendTemplateModal';
import { getFirstName, getButtonInfo } from '../SendTemplateModal/templateHelpers';
import TemplateVariablesSection from '../SendTemplateModal/TemplateVariablesSection';
import TemplateButtonsConfigSection from '../SendTemplateModal/TemplateButtonsConfigSection';
import TemplateFunnelTriggerSection from '../SendTemplateModal/TemplateFunnelTriggerSection';
import SendTemplateModalHeader from '../SendTemplateModal/SendTemplateModalHeader';
import TemplateSelectorSection from '../SendTemplateModal/TemplateSelectorSection';
import TemplatePreviewSection from '../SendTemplateModal/TemplatePreviewSection';
import SendTemplateModalFooter from '../SendTemplateModal/SendTemplateModalFooter';

describe('SendTemplateModal Submodules', () => {
  describe('templateHelpers', () => {
    it('extrai primeiro nome corretamente', () => {
      expect(getFirstName('Carlos Eduardo Santos')).toBe('Carlos');
      expect(getFirstName('')).toBe('');
    });

    it('retorna informações corretas para botão QUICK_REPLY', () => {
      const info = getButtonInfo({ type: 'QUICK_REPLY', text: 'Sim' });
      expect(info.label).toBe('Resposta Rápida');
      expect(info.configurable).toBe(true);
    });

    it('retorna informações corretas para botão URL', () => {
      const info = getButtonInfo({ type: 'URL', text: 'Acessar Site', url: 'https://exemplo.com' });
      expect(info.label).toBe('Link: https://exemplo.com');
      expect(info.configurable).toBe(false);
    });
  });

  describe('TemplateVariablesSection', () => {
    it('renderiza inputs de variáveis e atalhos de nome', () => {
      const handleChange = vi.fn();
      const variables = { '1': 'Carlos', '2': '10% OFF' };

      render(
        <TemplateVariablesSection
          variables={variables}
          handleVariableChange={handleChange}
          contactName="Carlos Eduardo"
          contactFirstName="Carlos"
        />
      );

      expect(screen.getByText('Variáveis')).toBeDefined();
      expect(screen.getByText('Variável {{1}}')).toBeDefined();
      expect(screen.getByText('Variável {{2}}')).toBeDefined();
      expect(screen.getAllByText('Carlos').length).toBeGreaterThan(0);
    });
  });

  describe('TemplateButtonsConfigSection', () => {
    it('renderiza os botões e permite configurar ações', () => {
      const handleActionChange = vi.fn();
      const templateButtons = [
        { type: 'QUICK_REPLY', text: 'Confirmar Presença' }
      ];
      const buttonActions = {
        'Confirmar Presença': { type: 'interaction', funnel_id: null }
      };

      render(
        <TemplateButtonsConfigSection
          templateButtons={templateButtons}
          buttonActions={buttonActions}
          handleButtonActionChange={handleActionChange}
          funnels={[{ id: 10, name: 'Funil VIP' }]}
        />
      );

      expect(screen.getByText('Botões do Template')).toBeDefined();
      expect(screen.getByText('Confirmar Presença')).toBeDefined();
      expect(screen.getByText('Interação')).toBeDefined();
    });
  });

  describe('TemplateFunnelTriggerSection', () => {
    it('renderiza o seletor de funil pós envio', () => {
      const setFunnelId = vi.fn();
      const funnels = [
        { id: 1, name: 'Boas-vindas' },
        { id: 2, name: 'Recuperação de Carrinho' }
      ];

      render(
        <TemplateFunnelTriggerSection
          selectedFunnelId="1"
          setSelectedFunnelId={setFunnelId}
          funnels={funnels}
          loadingFunnels={false}
        />
      );

      expect(screen.getByText('Disparar Funil após envio')).toBeDefined();
      expect(screen.getByText('Boas-vindas')).toBeDefined();
      expect(screen.getByText('Recuperação de Carrinho')).toBeDefined();
    });
  });

  describe('SendTemplateModalHeader', () => {
    it('renderiza título e dispara onClose', () => {
      const onCloseMock = vi.fn();
      render(<SendTemplateModalHeader onClose={onCloseMock} />);

      expect(screen.getByText('Enviar Template WhatsApp')).toBeInTheDocument();
      const closeBtn = screen.getByRole('button', { name: /Fechar/i });
      fireEvent.click(closeBtn);
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('TemplateSelectorSection', () => {
    it('renderiza opções de template e dispara onSelectTemplate', () => {
      const onSelectMock = vi.fn();
      const templates = [
        { id: 1, name: 'boas_vindas', language: 'pt_BR' },
        { id: 2, name: 'aviso_boleto', language: 'pt_BR' }
      ];

      render(
        <TemplateSelectorSection
          templates={templates}
          selectedTemplate={null}
          onSelectTemplate={onSelectMock}
        />
      );

      expect(screen.getByText('Selecione um template...')).toBeInTheDocument();
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'boas_vindas' } });
      expect(onSelectMock).toHaveBeenCalledWith(templates[0]);
    });
  });

  describe('TemplatePreviewSection', () => {
    it('renderiza a pré-visualização quando o texto é informado', () => {
      render(<TemplatePreviewSection previewText="Olá Carlos, seu boleto vence amanhã!" />);
      expect(screen.getByText('Pré-visualização')).toBeInTheDocument();
      expect(screen.getByText('Olá Carlos, seu boleto vence amanhã!')).toBeInTheDocument();
    });

    it('não renderiza nada se previewText estiver vazio', () => {
      const { container } = render(<TemplatePreviewSection previewText="" />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('SendTemplateModalFooter', () => {
    it('exibe badge de janela aberta e botões Cancelar e Enviar', () => {
      const onCloseMock = vi.fn();
      const onSendMock = vi.fn();

      render(
        <SendTemplateModalFooter
          selectedTemplate={{ name: 'tpl_1' }}
          windowOpen={true}
          onClose={onCloseMock}
          onSend={onSendMock}
        />
      );

      expect(screen.getByText(/Mensagem Gratuita \(Janela Aberta\)/i)).toBeInTheDocument();
      
      const cancelBtn = screen.getByRole('button', { name: /Cancelar/i });
      fireEvent.click(cancelBtn);
      expect(onCloseMock).toHaveBeenCalledTimes(1);

      const sendBtn = screen.getByRole('button', { name: /Enviar Template/i });
      fireEvent.click(sendBtn);
      expect(onSendMock).toHaveBeenCalledTimes(1);
    });

    it('exibe badge de janela fechada (custo de HSM)', () => {
      render(
        <SendTemplateModalFooter
          selectedTemplate={{ name: 'tpl_1' }}
          windowOpen={false}
          onClose={vi.fn()}
          onSend={vi.fn()}
        />
      );

      expect(screen.getByText(/Custo de HSM \(Janela Fechada\)/i)).toBeInTheDocument();
    });
  });

  describe('SendTemplateModal Principal', () => {
    it('não renderiza nada quando isOpen=false', () => {
      const { container } = render(
        <SendTemplateModal
          isOpen={false}
          onClose={vi.fn()}
          activeClient={{ id: 1 }}
          selectedConvo={{ id: 10 }}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it('renderiza estrutura do modal quando isOpen=true', () => {
      render(
        <SendTemplateModal
          isOpen={true}
          onClose={vi.fn()}
          activeClient={{ id: 1 }}
          selectedConvo={{ id: 10, contact_name: 'Carlos' }}
        />
      );
      expect(screen.getByText('Enviar Template WhatsApp')).toBeInTheDocument();
    });
  });
});
