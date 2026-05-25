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

  it('deve validar tempo de espera do follow-up ao salvar', async () => {
    render(<TestComponent />);

    // Define dados inválidos no form (follow-up ativo com tempo 0)
    act(() => {
      hookResult.setFormData({
        name: 'Hotmart Integration',
        platform: 'hotmart',
        mappings: [
          {
            event_type: 'compra_aprovada',
            followup_active: true,
            followup_delay_value: 0
          }
        ],
        product_filtering: false,
        product_whitelist: [],
        discovered_products: [],
        custom_slug: ''
      });
    });

    await act(async () => {
      await hookResult.handleSaveIntegration();
    });

    expect(toast.error).toHaveBeenCalledWith('O tempo de espera do Follow-up deve ser no mínimo 1.');
  });

  it('deve permitir salvar se o tempo de espera do follow-up for válido (>= 1)', async () => {
    fetchWithAuth.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, name: 'New Integration' })
    });

    render(<TestComponent />);

    act(() => {
      hookResult.setFormData({
        name: 'Hotmart Integration',
        platform: 'hotmart',
        mappings: [
          {
            event_type: 'compra_aprovada',
            followup_active: true,
            followup_delay_value: 5,
            followup_template_name: 'test_template'
          }
        ],
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

  it('deve validar template do follow-up obrigatório ao salvar', async () => {
    render(<TestComponent />);

    // Define dados inválidos: follow-up ativo mas template_name vazio
    act(() => {
      hookResult.setFormData({
        name: 'Hotmart Integration',
        platform: 'hotmart',
        mappings: [
          {
            event_type: 'compra_aprovada',
            followup_active: true,
            followup_delay_value: 5,
            followup_template_name: ''
          }
        ],
        product_filtering: false,
        product_whitelist: [],
        discovered_products: [],
        custom_slug: ''
      });
    });

    await act(async () => {
      await hookResult.handleSaveIntegration();
    });

    expect(toast.error).toHaveBeenCalledWith('Você deve selecionar um Template para o Follow-up.');
  });

  it('deve permitir salvar se o template do follow-up for válido', async () => {
    fetchWithAuth.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, name: 'New Integration' })
    });

    render(<TestComponent />);

    act(() => {
      hookResult.setFormData({
        name: 'Hotmart Integration',
        platform: 'hotmart',
        mappings: [
          {
            event_type: 'compra_aprovada',
            followup_active: true,
            followup_delay_value: 5,
            followup_template_name: 'template_followup_valido'
          }
        ],
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

