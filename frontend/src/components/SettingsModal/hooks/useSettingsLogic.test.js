import { renderHook, act } from '@testing-library/react-hooks';
import { useSettingsLogic, INITIAL_FORM_STATE } from './useSettingsLogic';
import { ClientProvider } from '../../../contexts/ClientContext';
import { AuthProvider } from '../../../AuthContext';
import React from 'react';

// Mock dependencies
jest.mock('../../AuthContext', () => ({
    ...jest.requireActual('../../AuthContext'),
    fetchWithAuth: jest.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
    }))
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
        const { result } = renderHook(() => useSettingsLogic(false, jest.fn(), jest.fn()), { wrapper });
        
        expect(result.current.activeTab).toBe('geral');
        expect(result.current.formData).toEqual(INITIAL_FORM_STATE);
        expect(result.current.loading).toBe(false);
    });

    it('should change active tab', () => {
        const { result } = renderHook(() => useSettingsLogic(false, jest.fn(), jest.fn()), { wrapper });
        
        act(() => {
            result.current.setActiveTab('whatsapp');
        });
        
        expect(result.current.activeTab).toBe('whatsapp');
    });

    it('should handle form changes', () => {
        const { result } = renderHook(() => useSettingsLogic(false, jest.fn(), jest.fn()), { wrapper });
        
        act(() => {
            result.current.handleChange({
                target: { name: 'CLIENT_NAME', value: 'Test Client' }
            });
        });
        
        expect(result.current.formData.CLIENT_NAME).toBe('Test Client');
    });
});
