import { renderHook, act } from '@testing-library/react';
import { useSettingsLogic } from './useSettingsLogic';
import { INITIAL_FORM_STATE } from './useGeneralSettings';
import { ClientProvider } from '../../../contexts/ClientContext';
import { AuthProvider } from '../../../AuthContext';
import React from 'react';

import { describe, it, expect, vi } from 'vitest';

// Mock dependencies
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
});
