import React from 'react';
import { render, screen, fireEvent, renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FollowUpSection from './FollowUpSection';
import { useFollowUpOptions } from './hooks/useFollowUpOptions';

describe('FollowUpSection e Subcomponentes', () => {
  const mockTemplates = [
    {
      id: 1,
      name: 'Template Boas-Vindas',
      components: [
        { type: 'HEADER', format: 'IMAGE' },
        { type: 'BODY' }
      ]
    },
    {
      id: 2,
      name: 'Template Follow-up Cobranca',
      components: [
        { type: 'BODY' },
        {
          type: 'BUTTONS',
          buttons: [{ type: 'URL', url: 'https://exemplo.com/{{1}}' }]
        }
      ]
    }
  ];

  const defaultProps = {
    mapping: {
      followup_active: false,
      followup_template_id: null,
      followup_delay_value: 15,
      followup_delay_unit: 'minutes',
      followup_business_hours_active: false,
      followup_business_hours_days: [0, 1, 2, 3, 4],
      followup_business_hours_start: '08:00',
      followup_business_hours_end: '18:00',
      followup_variables_mapping: []
    },
    mIndex: 0,
    updateMapping: vi.fn(),
    templates: mockTemplates,
    followupTemplateVars: [],
    addFollowupVariable: vi.fn(),
    removeFollowupVariable: vi.fn(),
    updateFollowupVariable: vi.fn(),
    customFieldsMapping: { cliente_nome: 'nome', pedido_id: 'id' }
  };

  it('deve renderizar o toggle de Follow-up desativado por padrão', () => {
    render(<FollowUpSection {...defaultProps} />);
    expect(screen.getByText(/Disparar Mensagem de Follow-up/i)).toBeInTheDocument();
    expect(screen.queryByText(/Template de Follow-up/i)).not.toBeInTheDocument();
  });

  it('deve chamar updateMapping ao clicar no checkbox de ativação', () => {
    const updateMapping = vi.fn();
    render(<FollowUpSection {...defaultProps} updateMapping={updateMapping} />);

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(updateMapping).toHaveBeenCalledWith(0, 'followup_active', true);
  });

  it('quando ativo, deve renderizar configurações básicas de template e delay', () => {
    const activeProps = {
      ...defaultProps,
      mapping: {
        ...defaultProps.mapping,
        followup_active: true,
        followup_template_id: 1
      }
    };
    render(<FollowUpSection {...activeProps} />);

    expect(screen.getByText(/Template de Follow-up/i)).toBeInTheDocument();
    expect(screen.getByText(/Tempo de Espera/i)).toBeInTheDocument();
    expect(screen.getByText(/Restringir ao Horário Comercial/i)).toBeInTheDocument();
  });

  it('quando horário comercial ativado, exibe dias da semana e horários', () => {
    const updateMapping = vi.fn();
    const bhProps = {
      ...defaultProps,
      updateMapping,
      mapping: {
        ...defaultProps.mapping,
        followup_active: true,
        followup_business_hours_active: true,
        followup_business_hours_days: [0, 1, 2]
      }
    };
    render(<FollowUpSection {...bhProps} />);

    expect(screen.getByText(/Definição do Horário Comercial do Follow-up/i)).toBeInTheDocument();
    expect(screen.getByText('Seg')).toBeInTheDocument();
    expect(screen.getByText('Sex')).toBeInTheDocument();

    const sexBtn = screen.getByText('Sex');
    fireEvent.click(sexBtn);
    expect(updateMapping).toHaveBeenCalledWith(0, 'followup_business_hours_days', [0, 1, 2, 4]);
  });

  it('renderiza variáveis detectadas do template e permite mapeamento', () => {
    const updateMapping = vi.fn();
    const varsProps = {
      ...defaultProps,
      updateMapping,
      mapping: {
        ...defaultProps.mapping,
        followup_active: true,
        followup_template_id: 1,
        followup_variables_mapping: []
      },
      followupTemplateVars: [
        { key: '1', label: 'Primeiro Nome', type: 'body' }
      ]
    };
    render(<FollowUpSection {...varsProps} />);

    expect(screen.getByText(/Variáveis do Template de Follow-up Detectadas/i)).toBeInTheDocument();
    expect(screen.getByText('Primeiro Nome')).toBeInTheDocument();
  });

  it('deve chamar addFollowupVariable ao clicar em adicionar variável manual', () => {
    const addFollowupVariable = vi.fn();
    const manualProps = {
      ...defaultProps,
      addFollowupVariable,
      mapping: {
        ...defaultProps.mapping,
        followup_active: true,
        followup_template_id: 1
      },
      followupTemplateVars: []
    };
    render(<FollowUpSection {...manualProps} />);

    const addBtn = screen.getByText(/Configurar Mídias \/ Variáveis Manuais/i);
    fireEvent.click(addBtn);
    expect(addFollowupVariable).toHaveBeenCalledWith(0);
  });

  it('deve remover variável manual ao clicar na lixeira', () => {
    const removeFollowupVariable = vi.fn();
    const manualProps = {
      ...defaultProps,
      removeFollowupVariable,
      mapping: {
        ...defaultProps.mapping,
        followup_active: true,
        followup_template_id: 1,
        followup_variables_mapping: [
          { key: 'header_url', type: 'header', value: 'custom', custom_value: 'https://img.png' }
        ]
      },
      followupTemplateVars: []
    };
    render(<FollowUpSection {...manualProps} />);

    expect(screen.getByText(/Variáveis Adicionais \/ Cabeçalho/i)).toBeInTheDocument();
    const deleteBtn = screen.getByRole('button', { name: '' });
    fireEvent.click(deleteBtn);
    expect(removeFollowupVariable).toHaveBeenCalledWith(0, 0);
  });

  describe('useFollowUpOptions hook', () => {
    it('retorna flags corretas quando template possui mídias ou botões dinâmicos', () => {
      const { result } = renderHook(() =>
        useFollowUpOptions({
          mapping: { followup_active: true, followup_template_id: 2 },
          templates: mockTemplates,
          followupTemplateVars: [],
          customFieldsMapping: { meu_campo: 'valor' }
        })
      );

      expect(result.current.isActive).toBe(true);
      expect(result.current.selectedTemplate?.name).toBe('Template Follow-up Cobranca');
      expect(result.current.needsConfig).toBe(true);
      expect(result.current.dynamicBodyOptions.some(o => o.value === 'meu_campo')).toBe(true);
    });
  });
});
