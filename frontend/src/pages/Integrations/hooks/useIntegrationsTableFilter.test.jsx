import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useIntegrationsTableFilter } from './useIntegrationsTableFilter';

describe('useIntegrationsTableFilter hook', () => {
  const mockIntegrations = [
    {
      id: 1,
      name: 'Hotmart 1',
      platform: 'hotmart',
      history_count: 50,
      mappings: [{ internal_tags: 'vip, comprador' }]
    },
    {
      id: 2,
      name: 'Kiwify 1',
      platform: 'kiwify',
      history_count: 10,
      mappings: [{ internal_tags: 'lead' }]
    },
    {
      id: 3,
      name: 'Hotmart 2 Sem Gatilhos',
      platform: 'hotmart',
      history_count: 0,
      mappings: []
    }
  ];

  const mockLeadTags = ['tag_lead_1', 'tag_lead_2', 'vip'];

  it('consolida tags internas sem duplicidades', () => {
    const { result } = renderHook(() =>
      useIntegrationsTableFilter(mockIntegrations, mockLeadTags)
    );

    expect(result.current.existingInternalTags).toContain('vip');
    expect(result.current.existingInternalTags).toContain('comprador');
    expect(result.current.existingInternalTags).toContain('lead');
    expect(result.current.existingInternalTags).toContain('tag_lead_1');
    expect(result.current.existingInternalTags).toContain('tag_lead_2');
    
    // vip não deve aparecer duplicado
    const vipCount = result.current.existingInternalTags.filter(t => t === 'vip').length;
    expect(vipCount).toBe(1);
  });

  it('ordena por quantidade de histórico em ordem decrescente', () => {
    const { result } = renderHook(() =>
      useIntegrationsTableFilter(mockIntegrations, [])
    );

    expect(result.current.sortedIntegrations[0].id).toBe(1); // 50
    expect(result.current.sortedIntegrations[1].id).toBe(2); // 10
    expect(result.current.sortedIntegrations[2].id).toBe(3); // 0
  });

  it('filtra por plataforma', () => {
    const { result } = renderHook(() =>
      useIntegrationsTableFilter(mockIntegrations, [])
    );

    act(() => {
      result.current.setFilterPlatform('kiwify');
    });

    expect(result.current.filteredIntegrations.length).toBe(1);
    expect(result.current.filteredIntegrations[0].platform).toBe('kiwify');
  });

  it('filtra por integrações que possuem gatilhos e histórico', () => {
    const { result } = renderHook(() =>
      useIntegrationsTableFilter(mockIntegrations, [])
    );

    act(() => {
      result.current.setFilterHasTriggers(true);
      result.current.setFilterHasHistory(true);
    });

    expect(result.current.filteredIntegrations.length).toBe(2);
    expect(result.current.filteredIntegrations.every(i => (i.mappings || []).length > 0)).toBe(true);
    expect(result.current.filteredIntegrations.every(i => (i.history_count || 0) > 0)).toBe(true);
  });

  it('calcula corretamente a paginação', () => {
    const { result } = renderHook(() =>
      useIntegrationsTableFilter(mockIntegrations, [])
    );

    act(() => {
      result.current.setListPageSize(2);
      result.current.setListCurrentPage(1);
    });

    expect(result.current.totalPages).toBe(2);
    expect(result.current.paginatedIntegrations.length).toBe(2);

    act(() => {
      result.current.setListCurrentPage(2);
    });

    expect(result.current.paginatedIntegrations.length).toBe(1);
  });
});
