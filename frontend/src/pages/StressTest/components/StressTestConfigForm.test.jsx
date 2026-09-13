import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StressTestConfigForm, {
  TestTypeSelector,
  WebhookConfigSection,
  ContactsConfigSection,
  FunnelAndTemplateConfigSection,
  ExecutionParamsSection,
  TestActionButtons
} from './StressTestConfigForm';

describe('Modularização de StressTestConfigForm', () => {
  const defaultProps = {
    testType: 'funnel',
    setTestType: vi.fn(),
    funnelId: 'f1',
    setFunnelId: vi.fn(),
    templateName: '',
    setTemplateName: vi.fn(),
    numberOfContacts: 10,
    setNumberOfContacts: vi.fn(),
    delaySeconds: 0,
    setDelaySeconds: vi.fn(),
    concurrencyLimit: 5,
    setConcurrencyLimit: vi.fn(),
    pricingCategory: 'marketing',
    setPricingCategory: vi.fn(),
    interactionFunnelId: '',
    setInteractionFunnelId: vi.fn(),
    blockFunnelId: '',
    setBlockFunnelId: vi.fn(),
    funnels: [{ id: 'f1', name: 'Funil Teste 1', is_pinned: false }],
    loadingFunnels: false,
    isRunning: false,
    isSubmitting: false,
    handleStartTest: vi.fn((e) => e?.preventDefault?.()),
    selectedErrors: [],
    setSelectedErrors: vi.fn(),
    ALL_ERRORS: ['ERROR_TIMEOUT', 'ERROR_RATE_LIMIT'],
    setExplainError: vi.fn(),
    contactsCount: 100,
    setContactsCount: vi.fn(),
    contactsTagCount: 2,
    setContactsTagCount: vi.fn(),
    isContactsRunning: false,
    handleStartContactsTest: vi.fn(),
    webhookIntegrations: [{ id: 'int1', name: 'Hotmart Pro' }],
    loadingWebhookIntegrations: false,
    selectedIntegrationId: 'int1',
    setSelectedIntegrationId: vi.fn(),
    webhookSelectedEvents: ['PURCHASE_APPROVED'],
    toggleWebhookEvent: vi.fn(),
    toggleAllEvents: vi.fn(),
    allEventsSelected: false,
    eventOptions: [{ value: 'PURCHASE_APPROVED', label: 'Compra Aprovada' }],
    platformKey: 'hotmart',
    webhookCount: 10,
    setWebhookCount: vi.fn(),
    webhookConcurrency: 2,
    setWebhookConcurrency: vi.fn(),
    webhookDelayMs: 100,
    setWebhookDelayMs: vi.fn(),
    isWebhookRunning: false,
    webhookSendEach: false,
    setWebhookSendEach: vi.fn(),
    handleStartWebhookTest: vi.fn(),
    handleCancelWebhookTest: vi.fn(),
    setPreviewEvent: vi.fn(),
    setJsonMaximized: vi.fn()
  };

  it('deve exportar todos os subcomponentes isolados', () => {
    expect(TestTypeSelector).toBeDefined();
    expect(WebhookConfigSection).toBeDefined();
    expect(ContactsConfigSection).toBeDefined();
    expect(FunnelAndTemplateConfigSection).toBeDefined();
    expect(ExecutionParamsSection).toBeDefined();
    expect(TestActionButtons).toBeDefined();
  });

  it('deve renderizar o formulário completo de teste de funil', () => {
    render(<StressTestConfigForm {...defaultProps} />);
    
    expect(screen.getByText('Tipo de Teste')).toBeInTheDocument();
    expect(screen.getByText('Funil de Teste')).toBeInTheDocument();
    expect(screen.getByText('Quantidade de Contatos')).toBeInTheDocument();
    expect(screen.getByText('Delay (segundos)')).toBeInTheDocument();
    expect(screen.getByText('Concorrência')).toBeInTheDocument();
    expect(screen.getByText('Iniciar Teste de Escala')).toBeInTheDocument();
  });

  it('deve alternar para a aba de contatos ao renderizar testType="contacts"', () => {
    render(<StressTestConfigForm {...defaultProps} testType="contacts" />);
    
    expect(screen.getByText('Etiquetas Aleatórias por Contato')).toBeInTheDocument();
    expect(screen.getByText(/Importar 100 Contatos Fictícios/i)).toBeInTheDocument();
  });

  it('deve alternar para webhook ao renderizar testType="webhook"', () => {
    render(<StressTestConfigForm {...defaultProps} testType="webhook" />);
    
    expect(screen.getByText('Integração de Webhook')).toBeInTheDocument();
    expect(screen.getByText('Tipos de Evento')).toBeInTheDocument();
    expect(screen.getByText('Iniciar Teste de Webhook')).toBeInTheDocument();
  });
});
