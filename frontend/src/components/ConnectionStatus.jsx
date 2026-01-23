import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import { fetchWithAuth } from '../AuthContext';
import { useClient } from '../contexts/ClientContext';
import { FiCheckCircle, FiXCircle, FiLoader, FiServer, FiMessageSquare, FiDatabase, FiCloud } from 'react-icons/fi';

const ConnectionStatus = ({ refreshKey }) => {
    const { activeClient } = useClient();
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const checkHealth = async () => {
        if (!activeClient) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetchWithAuth(`${API_URL}/api/health/`, {}, activeClient.id);
            if (res.ok) {
                const data = await res.json();
                setStatus(data);
            } else {
                setError(`HTTP ${res.status}`);
            }
        } catch (err) {
            console.error("Health check failed:", err);
            if (err.message === 'Failed to fetch' || err.message === 'Network Error') {
                setError("Backend offline");
            } else {
                setError(err.message || "Erro");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setStatus(null); // Limpa o status anterior ao trocar de cliente
        checkHealth();
    }, [activeClient, refreshKey]);

    if (!activeClient) return null;

    const StatusIcon = ({ state }) => {
        if (state === 'online') return <FiCheckCircle className="text-green-500" />;
        if (state === 'offline') return <FiXCircle className="text-red-500" />;
        if (state && state.startsWith('error')) return <FiXCircle className="text-yellow-500" title={state} />;
        return <FiLoader className="animate-spin text-gray-400" />;
    };

    const ServiceItem = ({ icon: Icon, label, state }) => (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm transition-all hover:shadow-md">
            <Icon className="text-gray-400 dark:text-gray-500" size={14} />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{label}:</span>
            <StatusIcon state={state} />
        </div>
    );

    return (
        <div className="flex flex-wrap gap-2 items-center">
            {loading && <FiLoader className="animate-spin text-blue-500 mr-2" size={16} />}
            {error && <span className="text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded border border-red-500/20 mr-2">{error}</span>}
            <ServiceItem icon={FiMessageSquare} label="WhatsApp" state={status?.whatsapp || (error ? 'offline' : null)} />
            <ServiceItem icon={FiServer} label="Chatwoot" state={status?.chatwoot || (error ? 'offline' : null)} />
            <ServiceItem icon={FiDatabase} label="RabbitMQ" state={status?.rabbitmq || (error ? 'offline' : null)} />
            <ServiceItem icon={FiCloud} label="MinIO/S3" state={status?.storage || (error ? 'offline' : null)} />

            <button
                onClick={checkHealth}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                title="Atualizar Status"
            >
                <svg className={`h-4 w-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
            </button>
        </div>
    );
};

export default ConnectionStatus;
