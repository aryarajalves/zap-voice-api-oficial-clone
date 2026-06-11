import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useTemplateCreator } from './useTemplateCreator';
import { AuthProvider } from '../../../AuthContext';
import { ClientProvider } from '../../../contexts/ClientContext';
import React from 'react';

// Mocking fetchWithAuth and useClient
vi.mock('../../../AuthContext', () => ({
    fetchWithAuth: vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) })),
    AuthProvider: ({ children }) => <div>{children}</div>
}));

vi.mock('../../../contexts/ClientContext', () => ({
    useClient: () => ({ activeClient: { id: 1, name: 'Test Client' } }),
    ClientProvider: ({ children }) => <div>{children}</div>
}));

describe('useTemplateCreator Hook', () => {
    it('initializes with default values', () => {
        const { result } = renderHook(() => useTemplateCreator());
        
        expect(result.current.formData.name).toBe('');
        expect(result.current.formData.category).toBe('MARKETING');
        expect(result.current.formData.buttons).toHaveLength(0);
        expect(result.current.loading).toBe(false);
    });

    it('adds a button correctly', () => {
        const { result } = renderHook(() => useTemplateCreator());
        
        act(() => {
            result.current.handleAddButton();
        });
        
        expect(result.current.formData.buttons).toHaveLength(1);
        expect(result.current.formData.buttons[0].type).toBe('QUICK_REPLY');
    });

    it('removes a button after confirmation', () => {
        const { result } = renderHook(() => useTemplateCreator());
        
        act(() => {
            result.current.handleAddButton();
        });
        expect(result.current.formData.buttons).toHaveLength(1);
        
        act(() => {
            result.current.removeButton(0);
        });
        
        expect(result.current.isRemoveButtonModalOpen).toBe(true);
        expect(result.current.buttonIndexToRemove).toBe(0);
        
        act(() => {
            result.current.confirmRemoveButton();
        });
        
        expect(result.current.formData.buttons).toHaveLength(0);
        expect(result.current.isRemoveButtonModalOpen).toBe(false);
    });

    it('resets form correctly', () => {
        const { result } = renderHook(() => useTemplateCreator());
        
        act(() => {
            result.current.setFormData({ ...result.current.formData, name: 'dirty_name' });
        });
        
        expect(result.current.formData.name).toBe('dirty_name');
        
        act(() => {
            result.current.resetForm();
        });
        
        expect(result.current.formData.name).toBe('');
    });
});
