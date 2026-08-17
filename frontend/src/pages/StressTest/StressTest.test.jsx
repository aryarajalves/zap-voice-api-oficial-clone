import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import StressTest from '../StressTest';
import CountdownBadge from './components/CountdownBadge';
import AbortConfirmModal from './components/AbortConfirmModal';
import ExplainErrorModal from './components/ExplainErrorModal';
import IntegrationSearchSelect from './components/IntegrationSearchSelect';

// Mock useStressTest
vi.mock('./hooks/useStressTest', () => ({
  useStressTest: () => ({
    user: { role: 'super_admin' },
    testType: 'funnel',
    setTestType: vi.fn(),
    funnelId: '1',
    setFunnelId: vi.fn(),
    templateName: '',
    setTemplateName: vi.fn(),
    numberOfContacts: 10,
    setNumberOfContacts: vi.fn(),
    delaySeconds: 1,
    setDelaySeconds: vi.fn(),
    concurrencyLimit: 1,
    setConcurrencyLimit: vi.fn(),
    pricingCategory: 'marketing',
    setPricingCategory: vi.fn(),
    interactionFunnelId: '',
    setInteractionFunnelId: vi.fn(),
    blockFunnelId: '',
    setBlockFunnelId: vi.fn(),
    funnels: [{ id: 1, name: 'Funil Boas Vindas' }],
    loadingFunnels: false,
    activeTriggerId: null,
    triggerDetails: null,
    messageStats: null,
    recentMessages: [],
    isRunning: false,
    handleStartTest: vi.fn(),
    handleCancelTest: vi.fn(),
    selectedErrors: [],
    setSelectedErrors: vi.fn(),
    ALL_ERRORS: ['UserOptedOut', 'SpamRateLimitExceeded'],
    contactsCount: 10,
    setContactsCount: vi.fn(),
    contactsTagCount: 2,
    setContactsTagCount: vi.fn(),
    contactsImportResult: null,
    setContactsImportResult: vi.fn(),
    isContactsRunning: false,
    handleStartContactsTest: vi.fn(),
    webhookIntegrations: [{ id: 1, name: 'Hotmart Principal', platform: 'hotmart' }],
    loadingWebhookIntegrations: false,
    selectedIntegrationId: 1,
    setSelectedIntegrationId: vi.fn(),
    webhookSelectedEvents: ['purchase_approved'],
    setWebhookSelectedEvents: vi.fn(),
    webhookCount: 5,
    setWebhookCount: vi.fn(),
    webhookConcurrency: 1,
    setWebhookConcurrency: vi.fn(),
    webhookDelayMs: 0,
    setWebhookDelayMs: vi.fn(),
    webhookTestResults: null,
    setWebhookTestResults: vi.fn(),
    isWebhookRunning: false,
    webhookSendEach: false,
    setWebhookSendEach: vi.fn(),
    handleStartWebhookTest: vi.fn(),
    handleCancelWebhookTest: vi.fn(),
  }),
  PLATFORM_EVENT_OPTIONS: {
    hotmart: [{ value: 'purchase_approved', label: 'Compra Aprovada' }]
  },
  generateWebhookPayload: () => ({ data: { buyer: { name: 'Lead Teste' } } })
}));

describe('StressTest and Submodules Unit Tests', () => {
  it('CountdownBadge calcula e renderiza segundos restantes', () => {
    const futureDate = new Date(Date.now() + 30000).toISOString();
    render(<CountdownBadge temp_paused_until={futureDate} />);
    expect(screen.getByText(/\d+/)).toBeDefined();
  });

  it('AbortConfirmModal renderiza confirmação e dispara onConfirm e onClose', () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    render(
      <AbortConfirmModal
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByText('Abortar Teste de Escala?')).toBeDefined();

    fireEvent.click(screen.getByText('Sim, Abortar'));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Cancelar'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ExplainErrorModal exibe explicação de erro quando selecionado', () => {
    const onClose = vi.fn();
    render(
      <ExplainErrorModal
        explainError="UserOptedOut"
        onClose={onClose}
      />
    );

    expect(screen.getByText('Entendido')).toBeDefined();
    fireEvent.click(screen.getByText('Entendido'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('IntegrationSearchSelect permite filtrar e selecionar integração', () => {
    const onChange = vi.fn();
    render(
      <IntegrationSearchSelect
        integrations={[
          { id: 1, name: 'Hotmart Principal', platform: 'hotmart' },
          { id: 2, name: 'Kiwify Cursos', platform: 'kiwify' }
        ]}
        value={1}
        onChange={onChange}
      />
    );

    expect(screen.getByText('Hotmart Principal')).toBeDefined();

    // Abrir dropdown
    fireEvent.click(screen.getByText('Hotmart Principal'));

    const searchInput = screen.getByPlaceholderText('Filtrar por nome ou plataforma…');
    expect(searchInput).toBeDefined();

    fireEvent.change(searchInput, { target: { value: 'Kiwify' } });
    expect(screen.getByText('Kiwify Cursos')).toBeDefined();

    fireEvent.click(screen.getByText('Kiwify Cursos'));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('StressTest renderiza título e painéis principais', () => {
    render(<StressTest />);

    expect(screen.getByText('Teste de Escala')).toBeDefined();
    expect(screen.getByText('Painel de Monitoramento')).toBeDefined();
    expect(screen.getByText('Iniciar Teste de Escala')).toBeDefined();
  });
});
