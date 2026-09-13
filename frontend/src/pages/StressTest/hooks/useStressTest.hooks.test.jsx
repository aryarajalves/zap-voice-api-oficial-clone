import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ALL_ERRORS, loadInitialSelectedErrors } from '../constants/stressErrors';
import { useStressMonitoring } from './useStressMonitoring';
import { useStressContactsTest } from './useStressContactsTest';
import { useStressTest } from './useStressTest';

// Mock contexts
vi.mock('../../../AuthContext', () => ({
  useAuth: () => ({ user: { name: 'Tester', role: 'admin' } }),
  fetchWithAuth: vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({})
  })
}));

vi.mock('../../../contexts/ClientContext', () => ({
  useClient: () => ({ activeClient: { id: 99, name: 'Client 99' } })
}));

describe('StressTest Refactored Modules', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('loads default errors from loadInitialSelectedErrors', () => {
    const errors = loadInitialSelectedErrors();
    expect(errors).toHaveLength(ALL_ERRORS.length);
    expect(errors[0]).toContain('#132015');
  });

  it('normalizes legacy error codes from localStorage', () => {
    localStorage.setItem('stress_test_selected_errors', JSON.stringify(['(#2) Some error']));
    const errors = loadInitialSelectedErrors();
    expect(errors[0]).toContain('(#2) Serviço temporariamente indisponível');
  });

  it('useStressMonitoring initializes with null values and allows reset', () => {
    const { result } = renderHook(() => useStressMonitoring({ id: 99 }));
    expect(result.current.activeTriggerId).toBeNull();
    expect(result.current.isRunning).toBe(false);

    act(() => {
      result.current.resetMonitoring(1234);
    });

    expect(result.current.activeTriggerId).toBe(1234);
    expect(localStorage.getItem('stress_test_active_trigger_id')).toBe('1234');
  });

  it('useStressContactsTest updates counts and persists to localStorage', () => {
    const { result } = renderHook(() => useStressContactsTest({ id: 99 }));
    expect(result.current.contactsCount).toBe(500);

    act(() => {
      result.current.setContactsCount(1500);
      result.current.setContactsTagCount(5);
    });

    expect(result.current.contactsCount).toBe(1500);
    expect(result.current.contactsTagCount).toBe(5);
  });

  it('useStressTest orchestrates all hooks and returns full interface', () => {
    const { result } = renderHook(() => useStressTest());
    expect(result.current.user).toBeDefined();
    expect(result.current.activeClient).toBeDefined();
    expect(result.current.testType).toBe('funnel');
    expect(result.current.contactsCount).toBe(500);
    expect(result.current.webhookCount).toBe(10);
    expect(typeof result.current.handleStartTest).toBe('function');
    expect(typeof result.current.handleStartContactsTest).toBe('function');
    expect(typeof result.current.handleStartWebhookTest).toBe('function');
  });
});
