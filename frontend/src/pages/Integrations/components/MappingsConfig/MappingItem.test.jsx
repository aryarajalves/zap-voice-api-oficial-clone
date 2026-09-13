import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MappingItem from './MappingItem';

describe('Modularização de MappingItem', () => {
  const mockMapping = {
    event_type: 'compra_aprovada',
    product_name: 'Curso Escala Black',
    template_id: '101',
    funnel_id: '201',
    delay_minutes: 5,
    is_active: true,
    update_contact_on_trigger: true,
    chatwoot_label: ['Cliente VIP'],
    internal_tags: 'aluno,escala',
    button_actions: { 'Acessar Curso': { action: 'funnel', funnel_id: '201' } },
  };

  const mockTemplates = [
    {
      id: '101',
      name: 'boas_vindas_vip',
      components: [
        { type: 'BODY', text: 'Olá {{1}}, seu acesso está liberado!' },
        {
          type: 'BUTTONS',
          buttons: [{ type: 'QUICK_REPLY', text: 'Acessar Curso' }]
        }
      ]
    }
  ];

  const defaultProps = {
    mapping: mockMapping,
    mIndex: 0,
    isExpanded: false,
    toggleMapping: vi.fn(),
    updateMapping: vi.fn(),
    removeMapping: vi.fn(),
    templates: mockTemplates,
    funnels: [{ id: '201', name: 'Funil Onboarding' }],
    chatwootLabels: ['Cliente VIP', 'Lead Quente'],
    updateVariable: vi.fn(),
    addVariable: vi.fn(),
    removeVariable: vi.fn(),
    templateVars: ['nome'],
    customFieldsMapping: {},
    followupTemplateVars: [],
    addFollowupVariable: vi.fn(),
    removeFollowupVariable: vi.fn(),
    updateFollowupVariable: vi.fn(),
    discoveredProducts: ['Curso Escala Black'],
    existingInternalTags: ['aluno'],
    platform: 'hotmart',
  };

  it('deve renderizar o cabeçalho com evento, produto e template quando colapsado', () => {
    render(<MappingItem {...defaultProps} />);

    expect(screen.getByText(/Gatilho #1: Compra Aprovada \(Curso Escala Black\)/i)).toBeDefined();
    expect(screen.getByText(/Template: boas_vindas_vip/i)).toBeDefined();
  });

  it('deve permitir alternar estado de expansão, ativação e exclusão', () => {
    render(<MappingItem {...defaultProps} />);

    // Clicar para expandir
    fireEvent.click(screen.getByText(/Gatilho #1: Compra Aprovada/i));
    expect(defaultProps.toggleMapping).toHaveBeenCalledWith(0);

    // Toggle de ativo
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(defaultProps.updateMapping).toHaveBeenCalledWith(0, 'is_active', false);
  });

  it('deve renderizar abas e permitir navegar entre Disparo, Contato e Avançado', () => {
    render(<MappingItem {...defaultProps} isExpanded={true} />);

    expect(screen.getByText('Disparo')).toBeDefined();
    expect(screen.getByText('Ação dos Botões')).toBeDefined();
    expect(screen.getByText('Variáveis')).toBeDefined();
    expect(screen.getByText('Contato & Tags')).toBeDefined();
    expect(screen.getByText('Avançado')).toBeDefined();

    // Na aba inicial (Disparo), exibe as regras de disparo
    expect(screen.getByText(/1. Regra do Gatilho \(Origem\)/i)).toBeDefined();
    expect(screen.getByText(/Disparar após 5 minuto\(s\)/i)).toBeDefined();

    // Alterna para Contato & Tags
    fireEvent.click(screen.getByText('Contato & Tags'));
    expect(screen.getByText(/Atualizar contato na aba Contatos/i)).toBeDefined();
    expect(screen.getByText(/Etiquetas na conversa \(Chat Local\)/i)).toBeDefined();

    // Alterna para Avançado
    fireEvent.click(screen.getByText('Avançado'));
    expect(screen.getByText(/ManyChat/i)).toBeDefined();
  });

  it('deve navegar para a aba Ação dos Botões ao clicar no atalho da prévia', () => {
    render(<MappingItem {...defaultProps} isExpanded={true} />);

    const configButtonsBtn = screen.getByText('Configurar Botões →');
    fireEvent.click(configButtonsBtn);

    expect(screen.getByText(/Ações Interativas dos Botões/i)).toBeDefined();
  });
});
