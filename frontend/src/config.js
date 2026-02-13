// Tenta pegar do ambiente dinâmico (window._env_) primeiro, depois do build (import.meta.env), depois localhost
let raw_api_url = window._env_?.API_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
let raw_ws_url = window._env_?.WS_URL || import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';

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

console.log('Environment Config Loaded:', { API_URL, WS_URL, source: window._env_ ? 'runtime (window._env_)' : 'build-time (import.meta.env)' });
