import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useIntegrationsPageModals } from './useIntegrationsPageModals';
import { fetchWithAuth } from '../../../AuthContext';

vi.mock('../../../AuthContext', () => ({
  fetchWithAuth: vi.fn()
}));

vi.mock('../../../config', () => ({
  API_URL: 'http://localhost:8000/api'
}));

vi.mock('react-hot-toast', () => ({
  toast: {
    loading: vi.fn(() => 'toast-id'),
    success: vi.fn(),
    error: vi.fn()
  }
}));

describe('useIntegrationsPageModals hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('abre histórico resetando filtros e acionando fetchHistory', () => {
    const fetchHistory = vi.fn();
    const setHistoryCurrentPage = vi.fn();
    const setWebhookHistoryStatusFilter = vi.fn();
    const setWebhookHistoryMappingFilter = vi.fn();
    const setWebhookHistorySearch = vi.fn();

    const { result } = renderHook(() =>
      useIntegrationsPageModals({
        activeClient: { id: 1 },
        fetchHistory,
        setHistoryCurrentPage,
        setWebhookHistoryStatusFilter,
        setWebhookHistoryMappingFilter,
        setWebhookHistorySearch
      })
    );

    const mockItem = { id: 99, name: 'Integração Teste' };

    act(() => {
      result.current.handleOpenHistory(mockItem);
    });

    expect(setHistoryCurrentPage).toHaveBeenCalledWith(1);
    expect(setWebhookHistoryStatusFilter).toHaveBeenCalledWith('');
    expect(setWebhookHistoryMappingFilter).toHaveBeenCalledWith('');
    expect(setWebhookHistorySearch).toHaveBeenCalledWith('');
    expect(result.current.isHistoryModalOpen).toBe(true);
    expect(result.current.historyIntegration).toEqual(mockItem);
    expect(fetchHistory).toHaveBeenCalledWith(99, '', '');
  });

  it('wrappedResend chama handleResendWebhook e atualiza dispatches se o histórico de disparos estiver aberto', async () => {
    const handleResendWebhook = vi.fn().mockResolvedValue(true);
    const fetchDispatches = vi.fn();

    const { result } = renderHook(() =>
      useIntegrationsPageModals({
        activeClient: { id: 1 },
        handleResendWebhook,
        fetchDispatches,
        dispatchLimit: 20
      })
    );

    act(() => {
      result.current.setHistoryIntegration({ id: 10 });
      result.current.setDispatchIntegration({ id: 10 });
    });

    await act(async () => {
      await result.current.wrappedResend(555);
    });

    expect(handleResendWebhook).toHaveBeenCalledWith(555);
    expect(fetchDispatches).toHaveBeenCalledWith(10, 1, 20, '', '', '', '', '', '', true);
  });

  it('handleRunTest envia teste via API com sucesso', async () => {
    vi.mocked(fetchWithAuth).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'success' })
    });

    const { result } = renderHook(() =>
      useIntegrationsPageModals({
        activeClient: { id: 1 }
      })
    );

    act(() => {
      result.current.setIntegrationToTest({ id: 42 });
      result.current.setIsTestModalOpen(true);
    });

    await act(async () => {
      await result.current.handleRunTest(JSON.stringify({ event: 'test' }));
    });

    expect(fetchWithAuth).toHaveBeenCalledWith(
      'http://localhost:8000/api/webhook-integrations/42/test',
      {
        method: 'POST',
        body: JSON.stringify({ event: 'test' })
      },
      1
    );
    expect(result.current.isTestModalOpen).toBe(false);
  });
});
