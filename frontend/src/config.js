// Tenta pegar do ambiente dinâmico (window._env_) primeiro, depois do build (import.meta.env), depois localhost
export const API_URL = window._env_?.API_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000';
export const WS_URL = window._env_?.WS_URL || import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

console.log('Environment Config Loaded:', { API_URL, WS_URL, source: window._env_ ? 'runtime (window._env_)' : 'build-time (import.meta.env)' });
