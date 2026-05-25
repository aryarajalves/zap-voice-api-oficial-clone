import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useAppLogic } from './useAppLogic';
import { fetchWithAuth } from '../AuthContext';

vi.mock('../AuthContext', () => ({
    useAuth: () => ({ user: { name: 'Test User', role: 'admin' }, logout: vi.fn() }),
    fetchWithAuth: vi.fn()
}));

vi.mock('../contexts/ClientContext', () => ({
    useClient: () => ({ activeClient: { id: 1, name: 'Test Client' } })
}));

vi.mock('react-hot-toast', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        loading: vi.fn(),
        dismiss: vi.fn()
    }
}));

describe('useAppLogic Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        document.title = 'ZapVoice';
    });

    it('should set document.title and save branding to localStorage when settings are fetched', async () => {
        // Mock fetchWithAuth for settings and funnels
        fetchWithAuth.mockImplementation((url) => {
            if (url.includes('/settings/')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        CLIENT_NAME: 'Test Client',
                        APP_NAME: 'MyWhitelabelCompany',
                        APP_LOGO: null,
                        APP_LOGO_SIZE: 'medium'
                    })
                });
            }
            if (url.includes('/funnels')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve([])
                });
            }
            return Promise.resolve({ ok: false });
        });

        const { result } = renderHook(() => useAppLogic());

        // Wait for the settings to load and title to update
        await waitFor(() => {
            expect(document.title).toBe('MyWhitelabelCompany');
        });

        // Verify it stored it in localStorage
        const storedBranding = JSON.parse(localStorage.getItem('appBranding'));
        expect(storedBranding).toBeDefined();
        expect(storedBranding.name).toBe('MyWhitelabelCompany');
    });

    it('should initialize appBranding state from localStorage on startup', () => {
        const cachedBranding = { name: 'CachedCompany', logo: null, logoSize: 'small' };
        localStorage.setItem('appBranding', JSON.stringify(cachedBranding));

        // Mock fetchWithAuth to not resolve yet (keeps it in loading state)
        fetchWithAuth.mockReturnValue(new Promise(() => {}));

        const { result } = renderHook(() => useAppLogic());

        expect(result.current.appBranding.name).toBe('CachedCompany');
        expect(result.current.appBranding.logoSize).toBe('small');
    });
});
