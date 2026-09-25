import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { toast } from 'react-hot-toast';
import { EVENT_TYPES, PLATFORM_EVENT_TYPES, HEADER_VAR_OPTIONS, BODY_VAR_OPTIONS } from './constants';
import { PLATFORM_OPTIONS } from './components/IntegrationFormModal/constants';
import { EVENT_HINTS } from './components/MappingsConfig/MappingItem/eventHints';
import IntegrationsTable from './components/IntegrationsTable';

vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

describe('Bussola Quiz Integration Constants & Table Copy Action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) }
    });
  });

  it('should include Landing Page - Bussola Quiz in PLATFORM_OPTIONS', () => {
    const platform = PLATFORM_OPTIONS.find(p => p.value === 'bussola_quiz');
    expect(platform).toBeDefined();
    expect(platform?.label).toBe('Landing Page - Bussola Quiz');
  });

  it('should include leitura_concluida in EVENT_TYPES', () => {
    const leituraEvent = EVENT_TYPES.find(e => e.value === 'leitura_concluida');
    expect(leituraEvent).toBeDefined();
    expect(leituraEvent?.label).toContain('Leitura Concluída');
    expect(leituraEvent?.label).toContain('Quiz Bússola');
  });

  it('should define allowed event types for bussola_quiz platform', () => {
    expect(PLATFORM_EVENT_TYPES.bussola_quiz).toBeDefined();
    expect(PLATFORM_EVENT_TYPES.bussola_quiz).toContain('leitura_concluida');
    expect(PLATFORM_EVENT_TYPES.bussola_quiz).toContain('checkout_pre_populado');
    expect(PLATFORM_EVENT_TYPES.bussola_quiz).toContain('compra_aprovada');
    expect(PLATFORM_EVENT_TYPES.bussola_quiz).toContain('carrinho_abandonado');
    expect(PLATFORM_EVENT_TYPES.bussola_quiz).toContain('outros');
  });

  it('should include quiz variables in HEADER_VAR_OPTIONS and BODY_VAR_OPTIONS', () => {
    const headerKeys = HEADER_VAR_OPTIONS.map(v => v.value);
    expect(headerKeys).toContain('bussola_pdf_auto');
    expect(headerKeys).toContain('bussola_cover_auto');

    const varKeys = BODY_VAR_OPTIONS.map(v => v.value);
    expect(varKeys).toContain('mensagem');
    expect(varKeys).toContain('bussola_pdf_url');
    expect(varKeys).toContain('leitura_id');
    expect(varKeys).toContain('nascimento_data');
    expect(varKeys).toContain('nascimento_hora');
    expect(varKeys).toContain('nascimento_completo');
    expect(varKeys).toContain('cidade');
    expect(varKeys).toContain('cidade_nome');
    expect(varKeys).toContain('cidade_uf');
    expect(varKeys).toContain('quiz_area');
    expect(varKeys).toContain('quiz_espelho');
    expect(varKeys).toContain('carta_titulo');
    expect(varKeys).toContain('carta_destaque');
  });

  it('should define EVENT_HINTS for leitura_concluida', () => {
    expect(EVENT_HINTS.leitura_concluida).toBeDefined();
    expect(EVENT_HINTS.leitura_concluida).toContain('Quiz da Bússola');
  });

  it('should filter out PENDING, PAUSED and REJECTED templates leaving only APPROVED', () => {
    const rawTemplates = [
      { id: '1', name: 'mensagem_bussola_porta_aberta', status: 'PENDING' },
      { id: '2', name: 'compra_aprovada', status: 'APPROVED' },
      { id: '3', name: 'pix_gerado', status: 'PAUSED' },
      { id: '4', name: 'cartao_recusado', status: 'REJECTED' }
    ];
    const approvedOnly = rawTemplates.filter(
      (t) => !t.status || String(t.status).toUpperCase() === 'APPROVED'
    );
    expect(approvedOnly).toHaveLength(1);
    expect(approvedOnly[0].name).toBe('compra_aprovada');
  });

  it('should copy Webhook URL and trigger toast.success when clicking anywhere on the URL button', async () => {
    const item = {
      id: 25,
      name: 'Bússola Quiz',
      platform: 'bussola_quiz',
      custom_slug: 'bussola-quiz-vip',
      mappings: [{}],
      history_count: 1
    };

    render(
      <IntegrationsTable
        loading={false}
        filteredIntegrations={[item]}
        paginatedIntegrations={[item]}
        listPageSize={10}
        setListPageSize={vi.fn()}
        listCurrentPage={1}
        setListCurrentPage={vi.fn()}
        safePage={1}
        totalPages={1}
        filterPlatform=""
        totalIntegrationsCount={1}
        onOpenHistory={vi.fn()}
        onOpenDispatchHistory={vi.fn()}
        onOpenTestModal={vi.fn()}
        onOpenEditModal={vi.fn()}
        onOpenDeleteModal={vi.fn()}
      />
    );

    const copyBtn = screen.getByTitle('Clique para copiar a URL do Webhook');
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('/api/webhooks/bussola-quiz-vip')
      );
      expect(toast.success).toHaveBeenCalledWith('URL copiada!');
      expect(screen.getByText('Copiado!')).toBeInTheDocument();
    });
  });
});
