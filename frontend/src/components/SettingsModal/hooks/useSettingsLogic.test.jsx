import { renderHook, act } from '@testing-library/react';
import { useSettingsLogic } from './useSettingsLogic';
import { INITIAL_FORM_STATE } from './useGeneralSettings';
import { ClientProvider } from '../../../contexts/ClientContext';
import { AuthProvider } from '../../../AuthContext';
import React from 'react';

import { describe, it, expect, vi } from 'vitest';

vi.mock('react-hot-toast', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    }
}));

vi.mock('../../../AuthContext', () => ({
    fetchWithAuth: vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
    })),
    useAuth: () => ({ user: { name: 'Test User', role: 'admin' }, logout: vi.fn() }),
    AuthProvider: ({ children }) => <div>{children}</div>
}));

vi.mock('../../../contexts/ClientContext', () => ({
    useClient: () => ({ activeClient: { id: 1, name: 'Test Client' } }),
    ClientProvider: ({ children }) => <div>{children}</div>
}));

const wrapper = ({ children }) => (
    <AuthProvider>
        <ClientProvider>
            {children}
        </ClientProvider>
    </AuthProvider>
);

describe('useSettingsLogic', () => {
    it('should initialize with default values', () => {
        const { result } = renderHook(() => useSettingsLogic(false, vi.fn(), vi.fn()), { wrapper });
        
        expect(result.current.activeTab).toBe('geral');
        expect(result.current.formData).toEqual(INITIAL_FORM_STATE);
        expect(result.current.loading).toBe(false);
    });

    it('should change active tab', () => {
        const { result } = renderHook(() => useSettingsLogic(false, vi.fn(), vi.fn()), { wrapper });
        
        act(() => {
            result.current.setActiveTab('whatsapp');
        });
        
        expect(result.current.activeTab).toBe('whatsapp');
    });

    it('should handle form changes', () => {
        const { result } = renderHook(() => useSettingsLogic(false, vi.fn(), vi.fn()), { wrapper });
        
        act(() => {
            result.current.handleChange({
                target: { name: 'CLIENT_NAME', value: 'Test Client' }
            });
        });
        
        expect(result.current.formData.CLIENT_NAME).toBe('Test Client');
    });

    it('should block save if password has less than 12 characters', async () => {
        const { result } = renderHook(() => useSettingsLogic(false, vi.fn(), vi.fn()), { wrapper });
        
        act(() => {
            result.current.handleProfileChange({
                target: { name: 'password', value: 'curta' }
            });
        });

        await act(async () => {
            await result.current.handleSubmit({ preventDefault: vi.fn() });
        });

        const { toast } = await import('react-hot-toast');
        expect(toast.error).toHaveBeenCalledWith('A nova senha deve ter no mínimo 12 caracteres.');
    });

    it('should omit empty password when saving profile', async () => {
        const { fetchWithAuth } = await import('../../../AuthContext');
        const onClose = vi.fn();
        const { result } = renderHook(() => useSettingsLogic(false, onClose, vi.fn()), { wrapper });
        
        act(() => {
            result.current.handleProfileChange({
                target: { name: 'full_name', value: 'Novo Nome' }
            });
            result.current.handleProfileChange({
                target: { name: 'password', value: '' }
            });
        });

        await act(async () => {
            await result.current.handleSubmit({ preventDefault: vi.fn() });
        });

        const callArgs = fetchWithAuth.mock.calls.find(call => call[0].includes('/auth/me'));
        expect(callArgs).toBeDefined();
        const sentBody = JSON.parse(callArgs[1].body);
        expect(sentBody.password).toBeUndefined();
        expect(sentBody.full_name).toBe('Novo Nome');
    });
});
