import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useWebhookLeads } from './useWebhookLeads';
import { fetchWithAuth } from '../../../AuthContext';

// Mock dependencies
vi.mock('../../../AuthContext', () => ({
  fetchWithAuth: vi.fn()
}));

vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

describe('useWebhookLeads Hook', () => {
  const mockClient = { id: 1, name: 'Test Client' };
  const mockLeadsEmpty = { items: [], total: 0 };
  const mockFiltersEmpty = { tags: [], event_types: [], product_names: [] };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock padrão que funciona para qualquer chamada - evita crash no mount
    fetchWithAuth.mockImplementation(async (url) => {
      if (url.includes('/leads/filters')) {
        return { ok: true, json: async () => mockFiltersEmpty };
      }
      return { ok: true, json: async () => mockLeadsEmpty };
    });
  });

  it('inicializa com os estados corretos', () => {
    const { result } = renderHook(() => useWebhookLeads(mockClient));
    
    expect(result.current.leads).toEqual([]);
    expect(result.current.loading).toBe(true);
    expect(result.current.page).toBe(0);
    expect(result.current.datePreset).toBe('');
    expect(result.current.customDateFrom).toBe('');
    expect(result.current.customDateTo).toBe('');
  });

  it('busca leads com sucesso ao montar', async () => {
    const mockLeads = { items: [{ id: 1, name: 'Lead 1' }], total: 1 };
    const mockFilters = { tags: ['Tag 1'] };
    
    fetchWithAuth.mockImplementation(async (url) => {
      if (url.includes('/leads/filters')) {
        return { ok: true, json: async () => mockFilters };
      }
      return { ok: true, json: async () => mockLeads };
    });

    const { result } = renderHook(() => useWebhookLeads(mockClient));

    await vi.waitFor(() => {
        expect(result.current.loading).toBe(false);
    }, { timeout: 3000 });

    expect(result.current.leads).toHaveLength(1);
    expect(result.current.total).toBe(1);
  });

  it('inclui date_from e date_to na URL ao selecionar preset last7', async () => {
    const mockLeads = { items: [], total: 0 };
    const mockFilters = { tags: [] };

    fetchWithAuth.mockImplementation(async (url) => {
      if (url.includes('/leads/filters')) {
        return { ok: true, json: async () => mockFilters };
      }
      return { ok: true, json: async () => mockLeads };
    });

    const { result } = renderHook(() => useWebhookLeads(mockClient));

    // Aguarda montagem inicial
    await vi.waitFor(() => expect(result.current.loading).toBe(false), { timeout: 3000 });

    vi.clearAllMocks();
    fetchWithAuth.mockImplementation(async (url) => {
      if (url.includes('/leads/filters')) {
        return { ok: true, json: async () => mockFilters };
      }
      return { ok: true, json: async () => mockLeads };
    });

    act(() => {
      result.current.setDatePreset('last7');
    });

    await vi.waitFor(() => expect(result.current.loading).toBe(false), { timeout: 3000 });

    // Verifica que a URL chamada contém date_from e date_to
    const calls = fetchWithAuth.mock.calls.filter(c => !c[0].includes('/filters'));
    expect(calls.length).toBeGreaterThan(0);
    const calledUrl = calls[0][0];
    expect(calledUrl).toMatch(/date_from=\d{4}-\d{2}-\d{2}/);
    expect(calledUrl).toMatch(/date_to=\d{4}-\d{2}-\d{2}/);
  });

  it('reseta page ao mudar o filtro de data', async () => {
    const mockLeads = { items: [], total: 0 };
    const mockFilters = { tags: [] };

    fetchWithAuth.mockImplementation(async (url) => {
      if (url.includes('/leads/filters')) {
        return { ok: true, json: async () => mockFilters };
      }
      return { ok: true, json: async () => mockLeads };
    });

    const { result } = renderHook(() => useWebhookLeads(mockClient));
    await vi.waitFor(() => expect(result.current.loading).toBe(false), { timeout: 3000 });

    act(() => {
      result.current.setPage(2);
    });

    expect(result.current.page).toBe(2);

    act(() => {
      result.current.setDatePreset('last30');
    });

    // Ao mudar o preset, a página deve resetar para 0
    expect(result.current.page).toBe(0);
    expect(result.current.datePreset).toBe('last30');
  });

  it('limpa todos os filtros de data ao chamar handleClearDateFilters', async () => {
    const mockLeads = { items: [], total: 0 };
    const mockFilters = { tags: [] };

    fetchWithAuth.mockImplementation(async (url) => {
      if (url.includes('/leads/filters')) {
        return { ok: true, json: async () => mockFilters };
      }
      return { ok: true, json: async () => mockLeads };
    });

    const { result } = renderHook(() => useWebhookLeads(mockClient));
    await vi.waitFor(() => expect(result.current.loading).toBe(false), { timeout: 3000 });

    act(() => {
      result.current.setDatePreset('custom');
      result.current.setCustomDateFrom('2025-01-01');
      result.current.setCustomDateTo('2025-01-31');
    });

    expect(result.current.datePreset).toBe('custom');

    act(() => {
      result.current.handleClearDateFilters();
    });

    expect(result.current.datePreset).toBe('');
    expect(result.current.customDateFrom).toBe('');
    expect(result.current.customDateTo).toBe('');
    expect(result.current.page).toBe(0);
  });

  it('reseta page ao mudar a busca (debounce) ou outros filtros', async () => {
    const mockLeads = { items: [], total: 0 };
    const mockFilters = { tags: [] };

    fetchWithAuth.mockImplementation(async (url) => {
      if (url.includes('/leads/filters')) {
        return { ok: true, json: async () => mockFilters };
      }
      return { ok: true, json: async () => mockLeads };
    });

    const { result } = renderHook(() => useWebhookLeads(mockClient));
    await vi.waitFor(() => expect(result.current.loading).toBe(false), { timeout: 3000 });

    // Caso 1: Testar com busca
    act(() => {
      result.current.setPage(3);
    });
    expect(result.current.page).toBe(3);

    act(() => {
      result.current.setSearch('novo_termo');
    });

    // Como a busca tem debounce, aguardamos o timer de 600ms rodar
    await vi.waitFor(() => {
      expect(result.current.page).toBe(0);
    }, { timeout: 1000 });

    // Caso 2: Testar com outro filtro (ex: eventType)
    act(() => {
      result.current.setPage(2);
    });
    expect(result.current.page).toBe(2);

    act(() => {
      result.current.setEventType('purchase');
    });

    // O reset de outros filtros é imediato pelo useEffect
    expect(result.current.page).toBe(0);
  });
});
