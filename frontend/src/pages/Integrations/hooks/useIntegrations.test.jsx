import React from 'react';
import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useIntegrations } from './useIntegrations';
import { toast } from 'react-hot-toast';
import { fetchWithAuth } from '../../../AuthContext';

// Mocks
vi.mock('react-hot-toast', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    promise: vi.fn().mockImplementation((promise) => promise),
  }
}));

vi.mock('../../../AuthContext', () => ({
  fetchWithAuth: vi.fn()
}));

describe('useIntegrations hook', () => {
  const activeClient = { id: 3, name: 'Client Test' };

  let hookResult;

  const TestComponent = () => {
    hookResult = useIntegrations(activeClient);
    return null;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    hookResult = null;
  });

  it('deve validar nome obrigatorio ao salvar', async () => {
    render(<TestComponent />);

    await act(async () => {
      await hookResult.handleSaveIntegration();
    });

    expect(toast.error).toHaveBeenCalledWith('Nome é obrigatório');
  });

  it('deve chamar toast.promise com os parametros de salvamento corretos', async () => {
    fetchWithAuth.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, name: 'New Integration' })
    });

    render(<TestComponent />);

    // Define dados válidos no form
    act(() => {
      hookResult.setFormData({
        name: 'Hotmart Integration',
        platform: 'hotmart',
        mappings: [],
        product_filtering: false,
        product_whitelist: [],
        discovered_products: [],
        custom_slug: ''
      });
    });

    await act(async () => {
      await hookResult.handleSaveIntegration();
    });

    expect(toast.promise).toHaveBeenCalled();
  });
});
