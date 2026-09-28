import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TriggerTabContent from './components/MappingsConfig/MappingItem/TriggerTabContent';
import MappingItemHeader from './components/MappingsConfig/MappingItem/MappingItemHeader';

vi.mock('../../../../../components/BulkSender/common/TemplatePreview', () => ({
  default: () => <div data-testid="template-preview-mock">Template Preview Mock</div>
}));

vi.mock('./components/BussolaPdfPreviewModal', () => ({
  default: () => null
}));

describe('Bussola Feedback Trigger UI Components', () => {
  it('should render star rating filter when platform is bussola_quiz', () => {
    const mapping = {
      event_type: 'leitura_concluida',
      feedback_filter: '5',
      variables_mapping: []
    };
    const updateMapping = vi.fn();

    render(
      <TriggerTabContent
        mapping={mapping}
        mIndex={0}
        updateMapping={updateMapping}
        templates={[]}
        funnels={[]}
        discoveredProducts={[]}
        platform="bussola_quiz"
        allowedEvents={[{ value: 'leitura_concluida', label: 'Leitura Concluída' }]}
        selectedTpl={null}
        templateButtons={[]}
        integrationId="test-id"
        onGoToButtonsTab={vi.fn()}
      />
    );

    // O label de avaliação por estrelas deve estar visível
    expect(screen.getByText(/Avaliação \/ Estrelas/i)).toBeInTheDocument();
    // Badge de filtro ativo com 5 estrelas
    expect(screen.getAllByText(/5 Estrela/i).length).toBeGreaterThan(0);
  });

  it('should not render star rating filter for non-bussola platforms', () => {
    const mapping = {
      event_type: 'compra_aprovada',
      variables_mapping: []
    };

    render(
      <TriggerTabContent
        mapping={mapping}
        mIndex={0}
        updateMapping={vi.fn()}
        templates={[]}
        funnels={[]}
        discoveredProducts={[]}
        platform="hotmart"
        allowedEvents={[{ value: 'compra_aprovada', label: 'Compra Aprovada' }]}
        selectedTpl={null}
        templateButtons={[]}
        integrationId="test-id"
        onGoToButtonsTab={vi.fn()}
      />
    );

    expect(screen.queryByText(/Avaliação \/ Estrelas/i)).not.toBeInTheDocument();
  });

  it('should display rating range badge in MappingItemHeader for 1-3 stars', () => {
    const mapping = {
      event_type: 'leitura_concluida',
      feedback_filter: '1,2,3',
      is_active: true
    };

    render(
      <MappingItemHeader
        mapping={mapping}
        mIndex={0}
        isExpanded={true}
        toggleMapping={vi.fn()}
        updateMapping={vi.fn()}
        removeMapping={vi.fn()}
        templates={[]}
      />
    );

    expect(screen.getByText(/⭐ 1 a 3 Estrelas \(Baixas\)/i)).toBeInTheDocument();
  });

  it('should display rating range badge in MappingItemHeader for 4 and 5 stars', () => {
    const mapping = {
      event_type: 'leitura_concluida',
      feedback_filter: '4,5',
      is_active: true
    };

    render(
      <MappingItemHeader
        mapping={mapping}
        mIndex={0}
        isExpanded={true}
        toggleMapping={vi.fn()}
        updateMapping={vi.fn()}
        removeMapping={vi.fn()}
        templates={[]}
      />
    );

    expect(screen.getByText(/⭐ 4 e 5 Estrelas \(Altas\)/i)).toBeInTheDocument();
  });

  it('should display skipped badge in MappingItemHeader when feedback_filter is skipped', () => {
    const mapping = {
      event_type: 'leitura_concluida',
      feedback_filter: 'skipped',
      is_active: true
    };

    render(
      <MappingItemHeader
        mapping={mapping}
        mIndex={1}
        isExpanded={false}
        toggleMapping={vi.fn()}
        updateMapping={vi.fn()}
        removeMapping={vi.fn()}
        templates={[]}
      />
    );

    expect(screen.getByText(/⏩ Pulou/i)).toBeInTheDocument();
  });
});
