import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import TriggerHistory from './TriggerHistory';

vi.mock('../config', () => ({ API_URL: 'http://localhost:8000', WS_URL: 'ws://localhost:8000' }));
vi.mock('react-hot-toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../AuthContext', () => ({ useAuth: () => ({ user: { role: 'super_admin' } }), fetchWithAuth: vi.fn() }));
vi.mock('../contexts/ClientContext', () => ({ useClient: () => ({ activeClient: { id: 1 } }) }));
vi.mock('./ConfirmModal', () => ({ default: () => null }));
vi.mock('../hooks/useScrollLock', () => ({ default: vi.fn() }));

const mockTriggers = [
  { id: 1, is_bulk: true, status: 'completed', created_at: '2026-03-20T10:00:00Z', scheduled_time: '2026-03-20T10:00:00Z' }
];

describe('DebugTrigger', () => {
  it('exibe o rótulo Enviado para status completed', async () => {
    const { fetchWithAuth } = await import('../AuthContext');
    vi.mocked(fetchWithAuth).mockResolvedValue({
      ok: true,
      json: async () => ({ items: mockTriggers, total: 1 }),
    });

    render(<TriggerHistory />);

    await waitFor(() => {
      const element = screen.getByText(/^Enviado$/i);
      expect(element).toBeInTheDocument();
    });
  });
});
