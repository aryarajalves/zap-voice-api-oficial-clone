// Tenta pegar do ambiente dinâmico (window._env_) primeiro, depois do build (import.meta.env), depois localhost
let raw_api_url = window._env_?.API_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
let raw_ws_url = window._env_?.WS_URL || import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';
let raw_webhook_url = window._env_?.WEBHOOK_BASE_URL || import.meta.env.VITE_WEBHOOK_BASE_URL || window.location.origin;


// Normaliza API_URL: Garante que termine com /api e remove barras extras
raw_api_url = raw_api_url.replace(/\/+$/, ''); // Remove barras no fim
if (!raw_api_url.endsWith('/api') && !raw_api_url.includes('/api/')) {
    raw_api_url += '/api';
}

// Normaliza WS_URL: Remove /ws e barras no fim (os componentes adicionam /ws depois)
raw_ws_url = raw_ws_url.replace(/\/ws\/*$/, '');
raw_ws_url = raw_ws_url.replace(/\/+$/, '');

export const API_URL = raw_api_url;
export const WS_URL = raw_ws_url;
export const WEBHOOK_BASE_URL = raw_webhook_url.replace(/\/+$/, ''); // Remove trailing slashes


/**
 * Resolve uma URL vinda do backend.
 * Se for relativa (começa com /), concatena com o base do backend.
 */
export const resolveUrl = (url) => {
    if (!url) return url;
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
    
    // Pega a base removendo /api
    const baseUrl = API_URL.replace(/\/api\/*$/, '');
    
    // Garante que a url comece com /
    const normalizedUrl = url.startsWith('/') ? url : `/${url}`;
    
    return `${baseUrl}${normalizedUrl}`;
};

console.log('Environment Config Loaded:', { API_URL, WS_URL, WEBHOOK_BASE_URL, source: window._env_ ? 'runtime (window._env_)' : 'build-time (import.meta.env)' });

