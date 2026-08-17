import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { getFirstName, getButtonInfo } from '../SendTemplateModal/templateHelpers';
import TemplateVariablesSection from '../SendTemplateModal/TemplateVariablesSection';
import TemplateButtonsConfigSection from '../SendTemplateModal/TemplateButtonsConfigSection';
import TemplateFunnelTriggerSection from '../SendTemplateModal/TemplateFunnelTriggerSection';

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
});
