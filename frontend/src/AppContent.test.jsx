import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import AppContent from '../AppContent';
import { useAppLogic } from '../hooks/useAppLogic';
import { AuthProvider } from '../AuthContext';
import { ClientProvider } from '../contexts/ClientContext';
import { ThemeProvider } from '../contexts/ThemeContext';

// Mocking dependencies
vi.mock('../hooks/useAppLogic');
vi.mock('../AuthContext', async () => {
    const actual = await vi.importActual('../AuthContext');
    return {
        ...actual,
        useAuth: () => ({ user: { name: 'Test User', role: 'admin' }, logout: vi.fn() }),
        AuthProvider: ({ children }) => <div>{children}</div>
    };
});
vi.mock('../contexts/ClientContext', async () => {
    const actual = await vi.importActual('../contexts/ClientContext');
    return {
        ...actual,
        useClient: () => ({ activeClient: { id: 1, name: 'Test Client' } }),
        ClientProvider: ({ children }) => <div>{children}</div>
    };
});
vi.mock('../contexts/ThemeContext', () => ({
    ThemeProvider: ({ children }) => <div>{children}</div>,
    useTheme: () => ({ theme: 'dark' })
}));

describe('AppContent Component', () => {
    const mockLogic = {
        user: { name: 'Test User', role: 'admin' },
        activeClient: { id: 1, name: 'Test Client' },
        currentView: 'bulk_sender',
        handleViewChange: vi.fn(),
        logout: vi.fn(),
        clientName: 'Test Client',
        appBranding: { name: 'ZapVoice', logo: null },
        setIsSettingsModalOpen: vi.fn(),
        setIsClientModalOpen: vi.fn(),
        settingsRefreshKey: 0,
        triggerHistoryRefreshKey: 0,
        setTriggerHistoryRefreshKey: vi.fn(),
        setSettingsRefreshKey: vi.fn(),
        setCurrentView: vi.fn(),
        // Modal states
        isClientModalOpen: false,
        isSettingsModalOpen: false,
        isGlobalsModalOpen: false,
        isLabelsModalOpen: false,
        isTriggerModalOpen: false,
        isDeleteModalOpen: false,
        isBulkDeleteModalOpen: false,
        isFunnelGuideOpen: false,
        isScheduleGuideOpen: false,
        isHistoryGuideOpen: false,
        isBlockedGuideOpen: false,
        // Methods
        setIsClientModalOpen: vi.fn(),
        setIsSettingsModalOpen: vi.fn(),
        setIsGlobalsModalOpen: vi.fn(),
        setIsLabelsModalOpen: vi.fn(),
        setIsTriggerModalOpen: vi.fn(),
        setIsDeleteModalOpen: vi.fn(),
        setIsBulkDeleteModalOpen: vi.fn(),
        setIsFunnelGuideOpen: vi.fn(),
        setIsScheduleGuideOpen: vi.fn(),
        setIsHistoryGuideOpen: vi.fn(),
        setIsBlockedGuideOpen: vi.fn(),
        fetchFunnels: vi.fn(),
        fetchSettings: vi.fn(),
        handleCreateFunnel: vi.fn(),
        handleEdit: vi.fn(),
        confirmDelete: vi.fn(),
        handleDelete: vi.fn(),
        toggleFunnelSelection: vi.fn(),
        handleBulkDelete: vi.fn(),
        toggleSelectAll: vi.fn(),
        funnels: [],
        selectedFunnelIds: []
    };

    beforeEach(() => {
        vi.clearAllMocks();
        useAppLogic.mockReturnValue(mockLogic);
    });

    it('renders sidebar and main content when activeClient exists', () => {
        render(
            <AppContent />
        );

        // Sidebar should have user name
        expect(screen.getByText(/Test User/i)).toBeDefined();
        
        // Main header should show current view title
        expect(screen.getByText(/Disparo em Massa/i)).toBeDefined();
    });

    it('renders "Inicie uma Sessão" when no activeClient', () => {
        useAppLogic.mockReturnValue({
            ...mockLogic,
            activeClient: null
        });

        render(<AppContent />);

        expect(screen.getByText(/Inicie uma Sessão/i)).toBeDefined();
        expect(screen.getByText(/Selecione um cliente ativo/i)).toBeDefined();
    });

    it('changes view title when currentView changes', () => {
        useAppLogic.mockReturnValue({
            ...mockLogic,
            currentView: 'funnels'
        });

        render(<AppContent />);

        expect(screen.getByText(/Meus Funis/i)).toBeDefined();
    });
});
