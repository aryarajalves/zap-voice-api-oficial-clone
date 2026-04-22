import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Pre-define environment globals to prevent config.js from crashing
global.window._env_ = {
    API_URL: 'http://localhost:8000/api',
    WS_URL: 'ws://localhost:8000/ws'
};

// Common DOM API Mocks for JSDOM failures
global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}));

global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}));

global.URL.createObjectURL = vi.fn();
global.URL.revokeObjectURL = vi.fn();

// Global mock for config.js
vi.mock('./config', () => ({
    API_URL: 'http://localhost:8000/api',
    WS_URL: 'ws://localhost:8000/ws'
}));

// Global mock for AuthContext
vi.mock('./AuthContext', () => ({
    fetchWithAuth: vi.fn(() => Promise.resolve({ 
        ok: true, 
        status: 200,
        json: () => Promise.resolve({ items: [], tags: [] }) 
    }))
}));

// Global mock for ClientContext
vi.mock('./contexts/ClientContext', () => ({
    useClient: vi.fn(() => ({
        activeClient: { id: 1, wa_business_account_id: '123' }
    }))
}));

// Mock xlsx library
vi.mock('xlsx', () => ({
    read: vi.fn(),
    utils: {
        sheet_to_json: vi.fn(() => []),
        json_to_sheet: vi.fn(() => ({})),
        book_new: vi.fn(() => ({})),
        book_append_sheet: vi.fn(),
    },
    writeFile: vi.fn(),
}));
