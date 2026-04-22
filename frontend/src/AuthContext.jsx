import React, { createContext, useState, useContext, useEffect } from 'react';
import { API_URL, WS_URL } from './config';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Verificar se há token salvo ao carregar
        const token = localStorage.getItem('token');
        if (token) {
            // Validar token buscando dados do usuário
            fetchCurrentUser(token);
        } else {
            setLoading(false);
        }
    }, []);

    // WebSocket Realtime Sync para Perfil
    useEffect(() => {
        if (!user) return;

        let ws;
        const wsBase = WS_URL.endsWith('/ws') ? WS_URL : `${WS_URL}/ws`;
        const wsToken = localStorage.getItem('token');
        const wsFinalUrl = wsToken ? `${wsBase}?token=${wsToken}` : wsBase;
        try {
            ws = new WebSocket(wsFinalUrl);

            ws.onopen = () => console.log("🟢 [AuthContext] WebSocket Conectado!");

            ws.onmessage = (event) => {
                try {
                    const payload = JSON.parse(event.data);
                    console.log("📩 [AuthContext] Mensagem Recebida:", payload.event, payload);

                    if (payload.event === "profile_updated" && String(payload.user_id) === String(user.id)) {
                        console.info("👤 [AuthContext] Perfil atualizado detectado:", payload.data);

                        // Verificar se a conta foi desativada
                        if (payload.data.is_active === false) {
                            console.warn("🚫 [AuthContext] Conta desativada pelo administrador. Deslogando...");
                            alert("Sua conta foi desativada pelo administrador.");
                            logout();
                            return;
                        }

                        setUser(prev => ({ ...prev, ...payload.data }));
                    }
                } catch (e) {
                    console.error("❌ [AuthContext] Error parsing profile WS message:", e);
                }
            };

            ws.onerror = (e) => console.error("🔴 [AuthContext] Auth WS Error", e);
            ws.onclose = (e) => {
                console.log("🔌 [AuthContext] Auth WebSocket fechado. Code:", e.code, "Reason:", e.reason);
                // Opcional: Re-conectar em alguns segundos se não foi fechado propositalmente
            };

        } catch (e) {
            console.error("❌ [AuthContext] Failed to connect Auth WebSocket", e);
        }

        return () => {
            if (ws) ws.close();
        };
    }, [user?.id]);

    const fetchCurrentUser = async (token) => {
        try {
            const response = await fetch(`${API_URL}/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const userData = await response.json();
                setUser(userData);
            } else {
                // Token inválido
                localStorage.removeItem('token');
            }
        } catch (error) {
            console.error('Erro ao validar token:', error);
            localStorage.removeItem('token');
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        let lastError;
        const maxRetries = 3;
        
        for (let i = 0; i < maxRetries; i++) {
            try {
                const response = await fetch(`${API_URL}/auth/token`, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || 'Erro ao fazer login');
                }

                const data = await response.json();
                localStorage.setItem('token', data.access_token);

                // Buscar dados do usuário
                await fetchCurrentUser(data.access_token);
                return data;

            } catch (error) {
                lastError = error;
                // Se for um erro de rede (Failed to fetch) e não for a última tentativa, aguarda e tenta de novo
                const isNetworkError = error instanceof TypeError || error.message === 'Failed to fetch';
                if (isNetworkError && i < maxRetries - 1) {
                    console.warn(`⚠️ [AuthContext] Falha na conexão (Backend subindo?). Tentativa ${i+1}/${maxRetries} em 1.5s...`);
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    continue;
                }
                throw error;
            }
        }
        throw lastError;
    };

    const register = async (email, password, fullName) => {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                password,
                full_name: fullName
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Erro ao registrar');
        }

        const data = await response.json();
        return data;
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    const value = React.useMemo(() => ({
        user,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user
    }), [user, loading]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

// Função helper para fazer requisições autenticadas
export const fetchWithAuth = async (url, options = {}, clientId = null) => {
    const token = localStorage.getItem('token');

    // Check if body is FormData to decide on Content-Type
    const isFormData = options.body instanceof FormData;

    const headers = {
        ...options.headers,
        'Authorization': token ? `Bearer ${token}` : '',
    };

    // Add X-Client-ID header if clientId is provided
    if (clientId) {
        headers['X-Client-ID'] = clientId.toString();
    }

    // Only set Content-Type to JSON if it's NOT FormData and not already set
    if (!isFormData && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
        ...options,
        headers
    });

    // Se receber 401, fazer logout (ProtectedRoute vai exibir tela de login)
    if (response.status === 401) {
        // Ignorar 401 e não deslogar se for a rota de login, ou tentativa de login
        if (url.includes('/auth/token')) {
            // Se for login e deu 401, apenas retornamos a resposta para o componente tratar
            return response;
        }

        let errorMessage = 'Sessão expirada. Faça login novamente.';
        try {
            const errorData = await response.clone().json();
            if (errorData.detail) errorMessage = errorData.detail;
        } catch (e) { /* ignore parse error */ }

        localStorage.removeItem('token');
        if (errorMessage.includes('desativada')) {
            alert(errorMessage);
        }

        // Recarregar a página para forçar re-render do ProtectedRoute (que limpa o state do user)
        window.location.reload();
        throw new Error(errorMessage);
    }

    return response;
};
