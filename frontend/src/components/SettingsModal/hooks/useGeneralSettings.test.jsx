import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useGeneralSettings, INITIAL_FORM_STATE } from './useGeneralSettings';
import { fetchWithAuth } from '../../../AuthContext';

// Mock dependencies
vi.mock('../../../AuthContext', () => ({
    fetchWithAuth: vi.fn()
}));

vi.mock('react-hot-toast', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        loading: vi.fn(),
        dismiss: vi.fn()
    }
}));

describe('useGeneralSettings Hook', () => {
    const mockClient = { id: 1, name: 'Test Client' };
    const refreshClients = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('inicializa com estado inicial correto', () => {
        const { result } = renderHook(() => useGeneralSettings(mockClient, refreshClients));
        
        expect(result.current.formData).toEqual(INITIAL_FORM_STATE);
        expect(result.current.loading).toBe(false);
    });

    it('carrega as configurações com sucesso', async () => {
        const mockSettings = { CLIENT_NAME: 'Custom Name', APP_NAME: 'ZapVoice' };
        fetchWithAuth.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(mockSettings)
        });

        const { result } = renderHook(() => useGeneralSettings(mockClient, refreshClients));

        await act(async () => {
            await result.current.loadSettings();
        });

        expect(fetchWithAuth).toHaveBeenCalled();
        expect(result.current.formData.CLIENT_NAME).toBe('Custom Name');
        expect(result.current.formData.APP_NAME).toBe('ZapVoice');
    });

    it('atualiza o formulário no handleChange', () => {
        const { result } = renderHook(() => useGeneralSettings(mockClient, refreshClients));

        act(() => {
            result.current.handleChange({
                target: { name: 'APP_NAME', value: 'New App Name', type: 'text' }
            });
        });

        expect(result.current.formData.APP_NAME).toBe('New App Name');
    });

    it('manipula checkbox no handleChange', () => {
        const { result } = renderHook(() => useGeneralSettings(mockClient, refreshClients));

        act(() => {
            result.current.handleChange({
                target: { name: 'AI_MEMORY_ENABLED', checked: true, type: 'checkbox' }
            });
        });

        expect(result.current.formData.AI_MEMORY_ENABLED).toBe(true);
    });
});
