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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inicializa com os estados corretos', () => {
    const { result } = renderHook(() => useWebhookLeads(mockClient));
    
    expect(result.current.leads).toEqual([]);
    expect(result.current.loading).toBe(true);
    expect(result.current.page).toBe(0);
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

    // Aguarda o estado de loading ficar false
    await vi.waitFor(() => {
        expect(result.current.loading).toBe(false);
    }, { timeout: 3000 });

    expect(result.current.leads).toHaveLength(1);
    expect(result.current.total).toBe(1);
  });
});
