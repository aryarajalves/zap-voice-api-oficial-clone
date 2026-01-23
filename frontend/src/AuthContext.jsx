import React, { createContext, useState, useContext, useEffect } from 'react';
import { API_URL } from './config';

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

        // Fetch API automatically sets Content-Type to application/x-www-form-urlencoded
        // when body is URLSearchParams
        const response = await fetch(`${API_URL}/auth/token`, {
            method: 'POST',
            body: formData,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Erro ao fazer login');
        }

        const data = await response.json();
        localStorage.setItem('token', data.access_token);

        // Buscar dados do usuário
        await fetchCurrentUser(data.access_token);

        return data;
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

    const value = {
        user,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user
    };

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
        localStorage.removeItem('token');
        // Recarregar a página para forçar re-render do ProtectedRoute
        window.location.reload();
        throw new Error('Sessão expirada. Faça login novamente.');
    }

    return response;
};
