import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchWithAuth, useAuth } from '../AuthContext';
import { API_URL } from '../config';
import { toast } from 'react-hot-toast';

const ClientContext = createContext();

export const useClient = () => {
    const context = useContext(ClientContext);
    if (!context) {
        throw new Error('useClient must be used within a ClientProvider');
    }
    return context;
};

export const ClientProvider = ({ children }) => {
    const [clients, setClients] = useState([]);
    const [activeClient, setActiveClient] = useState(null);
    const [loading, setLoading] = useState(true);
    const { isAuthenticated } = useAuth();

    useEffect(() => {
        if (isAuthenticated) {
            fetchClients();
        } else {
            setLoading(false);
        }
    }, [isAuthenticated]);

    const fetchClients = async () => {
        try {
            const res = await fetchWithAuth(`${API_URL}/clients/`);
            if (res.ok) {
                const data = await res.json();
                setClients(data);

                // Set active client from localStorage or default to first
                const storedClientId = localStorage.getItem('activeClientId');
                if (storedClientId) {
                    const stored = data.find(c => c.id === parseInt(storedClientId));
                    if (stored) {
                        setActiveClient(stored);
                    } else {
                        setActiveClient(data[0] || null);
                    }
                } else {
                    setActiveClient(data[0] || null);
                }
            }
        } catch (err) {
            console.error('Error fetching clients:', err);
            toast.error('Erro ao carregar lista de clientes');
        } finally {
            setLoading(false);
        }
    };

    const switchClient = (clientOrId) => {
        let client = null;
        if (typeof clientOrId === 'object' && clientOrId !== null) {
            client = clientOrId;
        } else {
            client = clients.find(c => c.id === clientOrId);
        }

        if (client) {
            setActiveClient(client);
            localStorage.setItem('activeClientId', client.id.toString());
            toast.success(`Alterado para: ${client.name}`);
        }
    };

    const createClient = async (name) => {
        try {
            const res = await fetchWithAuth(`${API_URL}/clients/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.detail || 'Erro ao criar cliente');
            }

            const newClient = await res.json();
            setClients([...clients, newClient]);
            toast.success(`Cliente "${name}" criado com sucesso!`);
            return newClient;
        } catch (err) {
            console.error('Error creating client:', err);
            toast.error(err.message);
            throw err;
        }
    };

    const deleteClient = async (clientId) => {
        try {
            const res = await fetchWithAuth(`${API_URL}/clients/${clientId}`, {
                method: 'DELETE',
            });

            if (!res.ok) {
                throw new Error('Erro ao excluir cliente');
            }

            setClients(clients.filter(c => c.id !== clientId));

            // If deleted client was active, switch to first available
            if (activeClient?.id === clientId) {
                const remaining = clients.filter(c => c.id !== clientId);
                if (remaining.length > 0) {
                    switchClient(remaining[0].id);
                } else {
                    setActiveClient(null);
                }
            }

            toast.success('Cliente removido');
        } catch (err) {
            console.error('Error deleting client:', err);
            toast.error('Erro ao remover cliente');
            throw err;
        }
    };

    return (
        <ClientContext.Provider
            value={{
                clients,
                activeClient,
                loading,
                switchClient,
                createClient,
                deleteClient,
                refreshClients: fetchClients,
            }}
        >
            {children}
        </ClientContext.Provider>
    );
};
