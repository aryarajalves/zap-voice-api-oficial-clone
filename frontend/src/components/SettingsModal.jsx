import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { API_URL } from '../config';
import { fetchWithAuth } from '../AuthContext';
import { useClient } from '../contexts/ClientContext';
import useScrollLock from '../hooks/useScrollLock';
import { useTheme } from '../contexts/ThemeContext';

export default function SettingsModal({ isOpen, onClose, onSaved }) {
    useScrollLock(isOpen);
    const { activeClient, refreshClients } = useClient();
    const { theme, toggleTheme } = useTheme();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        WA_BUSINESS_ACCOUNT_ID: '',
        WA_PHONE_NUMBER_ID: '',
        WA_ACCESS_TOKEN: '',
        CHATWOOT_API_URL: '',
        CHATWOOT_API_TOKEN: '',
        CHATWOOT_ACCOUNT_ID: '',
        CHATWOOT_SELECTED_INBOX_ID: '',
        CLIENT_NAME: '',
        META_VERIFY_TOKEN: '',
        META_RETURN_CONFIG: ''
    });

    useEffect(() => {
        if (isOpen) {
            loadSettings();
        }
    }, [isOpen]);

    const loadSettings = async () => {
        if (!activeClient) return;

        setLoading(true);
        try {
            const res = await fetchWithAuth(`${API_URL}/settings/`, {}, activeClient.id);
            if (res.ok) {
                const data = await res.json();

                // Merge data with initial state to ensure all keys exist
                setFormData(prev => ({
                    ...prev,
                    ...data,
                    // Ensure CLIENT_NAME is sync'd
                    CLIENT_NAME: data.CLIENT_NAME || activeClient.name
                }));

            } else {
                toast.error("Erro ao carregar configurações");
            }
        } catch (error) {
            console.error(error);
            toast.error("Erro de conexão");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };



    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        // Filter out masked values to avoid overwriting real tokens
        const settingsToSend = {};
        for (const [key, value] of Object.entries(formData)) {
            // Check if value is masked (contains "*" inside)
            // Regex checks for format like "ABCD*******WXYZ" or just "****"
            const isMasked = (typeof value === 'string') && (value.includes('*'));

            if (!isMasked) {
                settingsToSend[key] = value;
            }
        }

        if (!activeClient) return;

        try {
            const res = await fetchWithAuth(`${API_URL}/settings/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ settings: settingsToSend })
            }, activeClient.id);

            if (res.ok) {
                toast.success("Configurações salvas!");
                if (onSaved) onSaved();
                onClose();
            } else {
                toast.error("Erro ao salvar");
            }
        } catch (error) {
            console.error(error);
            toast.error("Erro ao salvar");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transition-colors duration-200">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50 rounded-t-2xl">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Configurações do Sistema
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-300 dark:hover:text-white p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-8">

                    {/* General Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                            <span className="text-purple-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                                </svg>
                            </span>
                            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Geral</h3>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Nome do Cliente</label>
                                <input
                                    type="text"
                                    name="CLIENT_NAME"
                                    value={formData.CLIENT_NAME || ''}
                                    onChange={handleChange}
                                    placeholder="Ex: Empresa XYZ"
                                    className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400">Exibido no topo da tela inicial.</p>
                            </div>
                        </div>
                    </div>

                    {/* Appearance Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700">
                            <span className="text-yellow-500">
                                {theme === 'dark' ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </span>
                            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Aparência</h3>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                            <div>
                                <p className="font-semibold text-gray-800 dark:text-gray-100">Tema do Sistema</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Alternar entre modo claro e escuro</p>
                            </div>
                            <button
                                type="button"
                                onClick={toggleTheme}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${theme === 'dark' ? 'bg-blue-600' : 'bg-gray-200'}`}
                            >
                                <span className={`${theme === 'dark' ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                            </button>
                        </div>
                    </div>

                    {/* WhatsApp Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                            <span className="text-green-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                                </svg>
                            </span>
                            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">WhatsApp Cloud API (Meta)</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Business Account ID</label>
                                <input
                                    type="text"
                                    name="WA_BUSINESS_ACCOUNT_ID"
                                    value={formData.WA_BUSINESS_ACCOUNT_ID}
                                    onChange={handleChange}
                                    placeholder="Ex: 123456789"
                                    className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number ID</label>
                                <input
                                    type="text"
                                    name="WA_PHONE_NUMBER_ID"
                                    value={formData.WA_PHONE_NUMBER_ID}
                                    onChange={handleChange}
                                    placeholder="Ex: 100000000"
                                    className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                            <div className="space-y-1 md:col-span-2 relative">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Access Token (Permanente)</label>
                                <input
                                    type={formData.WA_ACCESS_TOKEN?.includes('*') ? "text" : "password"}
                                    name="WA_ACCESS_TOKEN"
                                    value={formData.WA_ACCESS_TOKEN}
                                    onChange={handleChange}
                                    placeholder="EAAB..."
                                    className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all font-mono text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Token gerado no painel de desenvolvedor da Meta.</p>
                            </div>
                        </div>
                    </div>

                    {/* Chatwoot Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                            <span className="text-blue-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                                    <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                                </svg>
                            </span>
                            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Integração Chatwoot</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1 md:col-span-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">URL da API</label>
                                <input
                                    type="url"
                                    name="CHATWOOT_API_URL"
                                    value={formData.CHATWOOT_API_URL}
                                    onChange={handleChange}
                                    placeholder="https://app.chatwoot.com/api/v1"
                                    className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Account ID</label>
                                <input
                                    type="number"
                                    name="CHATWOOT_ACCOUNT_ID"
                                    value={formData.CHATWOOT_ACCOUNT_ID}
                                    onChange={handleChange}
                                    placeholder="1"
                                    className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Inbox ID (Filtro)</label>
                                <input
                                    type="text"
                                    name="CHATWOOT_SELECTED_INBOX_ID"
                                    value={formData.CHATWOOT_SELECTED_INBOX_ID}
                                    onChange={handleChange}
                                    placeholder="Opcional (Ex: 3, 5)"
                                    className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                                <p className="text-xs text-gray-400">Deixe vazio para ver todas.</p>
                            </div>
                            <div className="space-y-1 md:col-span-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">API Token (Admin/Bot)</label>
                                <input
                                    type={formData.CHATWOOT_API_TOKEN?.includes('*') ? "text" : "password"}
                                    name="CHATWOOT_API_TOKEN"
                                    value={formData.CHATWOOT_API_TOKEN}
                                    onChange={handleChange}
                                    placeholder="Token do usuário..."
                                    className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Meta Webhook Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700">
                            <span className="text-teal-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M6.672 1.911a1 1 0 10-1.932.518l.259.966a1 1 0 001.932-.518l-.26-.966zM2.429 4.74a1 1 0 10-.517 1.932l.966.259a1 1 0 00.517-1.932l-.966-.26zm8.814-.569a1 1 0 00-1.415-1.414l-.707.707a1 1 0 101.415 1.415l.707-.708zm-7.071 7.072l.707-.707A1 1 0 003.465 9.12l-.708.707a1 1 0 001.415 1.415zm3.2-5.171a1 1 0 00-1.3 1.3l4 10a1 1 0 001.823.075l1.38-2.759 3.018 3.02a1 1 0 001.414-1.415l-3.019-3.02 2.76-1.379a1 1 0 00-.076-1.822l-10-4z" clipRule="evenodd" />
                                </svg>
                            </span>
                            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Integração Webhook Meta</h3>
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800 text-sm">
                            <p className="font-semibold text-blue-800 dark:text-blue-300 mb-2">📍 URL do Webhook (cole na Meta):</p>
                            <div className="flex items-center gap-2">
                                <code className="bg-white dark:bg-gray-900 px-3 py-1.5 rounded border border-blue-200 dark:border-blue-700 select-all text-xs flex-1">
                                    {API_URL.replace('/api', '')}/api/webhooks/meta
                                </code>
                                <button
                                    type="button"
                                    onClick={() => {
                                        navigator.clipboard.writeText(`${API_URL.replace('/api', '')}/api/webhooks/meta`);
                                        toast.success('URL copiada!');
                                    }}
                                    className="px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition text-xs"
                                >
                                    Copiar
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Verify Token (Senha)</label>
                                <input
                                    type="text"
                                    name="META_VERIFY_TOKEN"
                                    value={formData.META_VERIFY_TOKEN || ''}
                                    onChange={handleChange}
                                    placeholder="Crie uma senha única..."
                                    className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400">Use este mesmo token ao configurar o webhook na Meta.</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">URL de Retorno (Opcional)</label>
                                <input
                                    type="url"
                                    name="META_RETURN_CONFIG"
                                    value={formData.META_RETURN_CONFIG || ''}
                                    onChange={handleChange}
                                    placeholder="https://seu-n8n.com/webhook..."
                                    className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400">Encaminhar eventos processados para outro sistema? (Opcional)</p>
                            </div>
                        </div>
                    </div>

                    {/* RabbitMQ Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">RabbitMQ (Fila)</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Host</label>
                                <input type="text" name="RABBITMQ_HOST" value={formData.RABBITMQ_HOST || ''} onChange={handleChange} placeholder="zapvoice-rabbit" className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Port</label>
                                <input type="text" name="RABBITMQ_PORT" value={formData.RABBITMQ_PORT || ''} onChange={handleChange} placeholder="5672" className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">User</label>
                                <input type="text" name="RABBITMQ_USER" value={formData.RABBITMQ_USER || ''} onChange={handleChange} placeholder="guest" className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                                <input type="password" name="RABBITMQ_PASSWORD" value={formData.RABBITMQ_PASSWORD || ''} onChange={handleChange} placeholder="****" className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">VHost</label>
                                <input type="text" name="RABBITMQ_VHOST" value={formData.RABBITMQ_VHOST || ''} onChange={handleChange} placeholder="/" className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                            </div>
                        </div>
                    </div>

                    {/* MinIO/S3 Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">MinIO / S3 Storage</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1 md:col-span-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Endpoint URL</label>
                                <input type="text" name="S3_ENDPOINT_URL" value={formData.S3_ENDPOINT_URL || ''} onChange={handleChange} placeholder="https://s3..." className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Access Key</label>
                                <input type="text" name="S3_ACCESS_KEY" value={formData.S3_ACCESS_KEY || ''} onChange={handleChange} className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Secret Key</label>
                                <input type="password" name="S3_SECRET_KEY" value={formData.S3_SECRET_KEY || ''} onChange={handleChange} className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Bucket Name</label>
                                <input type="text" name="S3_BUCKET_NAME" value={formData.S3_BUCKET_NAME || ''} onChange={handleChange} className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Region</label>
                                <input type="text" name="S3_REGION" value={formData.S3_REGION || ''} onChange={handleChange} className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                            </div>
                            <div className="space-y-1 md:col-span-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Public URL (CDN)</label>
                                <input type="text" name="S3_PUBLIC_URL" value={formData.S3_PUBLIC_URL || ''} onChange={handleChange} placeholder="https://..." className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Salvando...
                                </>
                            ) : (
                                "Salvar Configurações"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
