import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FiEye, FiEyeOff, FiUpload, FiImage, FiTrash2, FiPlus } from 'react-icons/fi';
import { API_URL, WS_URL } from '../config';
import { fetchWithAuth } from '../AuthContext';
import { useClient } from '../contexts/ClientContext';
import { useAuth } from '../AuthContext';
import useScrollLock from '../hooks/useScrollLock';
import { useTheme } from '../contexts/ThemeContext';

export default function SettingsModal({ isOpen, onClose, onSaved }) {
    useScrollLock(isOpen);
    const { activeClient, refreshClients } = useClient();
    const { user } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [loading, setLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const INITIAL_FORM_STATE = {
        CLIENT_NAME: '',
        WA_BUSINESS_ACCOUNT_ID: '',
        WA_PHONE_NUMBER_ID: '',
        WA_ACCESS_TOKEN: '',
        CHATWOOT_API_URL: '',
        CHATWOOT_ACCOUNT_ID: '',
        CHATWOOT_SELECTED_INBOX_ID: '',
        CHATWOOT_API_TOKEN: '',
        META_RETURN_CONFIG: '',
        APP_NAME: '',
        APP_LOGO: '',
        APP_LOGO_SIZE: 'medium',
        SYNC_CONTACTS_TABLE: ''
    };

    const INITIAL_PROFILE_STATE = {
        email: '',
        full_name: '',
        password: ''
    };

    const [formData, setFormData] = useState(INITIAL_FORM_STATE);
    const [profileData, setProfileData] = useState(INITIAL_PROFILE_STATE);
    const [showPassword, setShowPassword] = useState(false);
    const [syncedContacts, setSyncedContacts] = useState([]);
    const [loadingContacts, setLoadingContacts] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadSettings();
            fetchSyncedContacts();
            if (user) {
                setProfileData({
                    email: user.email || '',
                    full_name: user.full_name || '',
                    password: '' // Sempre limpo para segurança
                });
            }
        }
    }, [isOpen, user]);

    // WebSocket Realtime Sync para Configurações
    useEffect(() => {
        if (!isOpen || !activeClient) return;

        let ws;
        try {
            ws = new WebSocket(`${WS_URL}/ws`);

            ws.onmessage = (event) => {
                try {
                    const payload = JSON.parse(event.data);
                    if (payload.event === "settings_updated" && payload.client_id === activeClient.id) {
                        console.log("⚙️ Configurações atualizadas via WebSocket, recarregando...");
                        loadSettings();
                    }
                } catch (e) {
                    console.error("Error parsing settings WS message:", e);
                }
            };

            ws.onerror = (e) => console.error("🔴 Settings WS Error", e);

        } catch (e) {
            console.error("Failed to connect Settings WebSocket", e);
        }

        return () => {
            if (ws) ws.close();
        };
    }, [isOpen, activeClient?.id]);

    const loadSettings = async () => {
        if (!activeClient) return;

        setLoading(true);
        try {
            const res = await fetchWithAuth(`${API_URL}/settings/`, {}, activeClient.id);
            if (res.ok) {
                const data = await res.json();

                // Reset with initial state then merge data to prevent leakage from previous client
                setFormData({
                    ...INITIAL_FORM_STATE,
                    ...data,
                    // Ensure CLIENT_NAME is sync'd
                    CLIENT_NAME: data.CLIENT_NAME || activeClient.name
                });

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

    const fetchSyncedContacts = async () => {
        if (!activeClient) return;
        setLoadingContacts(true);
        try {
            const res = await fetchWithAuth(`${API_URL}/settings/contacts`, {}, activeClient.id);
            if (res.ok) {
                const data = await res.json();
                setSyncedContacts(data);
            }
        } catch (error) {
            console.error("Erro ao buscar contatos sincronizados:", error);
        } finally {
            setLoadingContacts(false);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleProfileChange = (e) => {
        setProfileData({ ...profileData, [e.target.name]: e.target.value });
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validar tipo
        if (!file.type.startsWith('image/')) {
            toast.error("Por favor, selecione um arquivo de imagem.");
            return;
        }

        setIsUploading(true);
        const loadingToast = toast.loading("Fazendo upload da logo...");

        try {
            const formDataUpload = new FormData();
            formDataUpload.append('file', file);

            const res = await fetchWithAuth(`${API_URL}/upload`, {
                method: 'POST',
                body: formDataUpload
            }, activeClient?.id);

            if (res.ok) {
                const data = await res.json();
                setFormData(prev => ({ ...prev, APP_LOGO: data.url }));
                toast.success("Logo enviada com sucesso!");
            } else {
                const err = await res.json();
                throw new Error(err.detail || "Erro no upload");
            }
        } catch (error) {
            console.error(error);
            toast.error(error.message || "Erro ao fazer upload");
        } finally {
            setIsUploading(false);
            toast.dismiss(loadingToast);
        }
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
            // 1. Atualizar Perfil (Todo usuário faz isso)
            const profileRes = await fetchWithAuth(`${API_URL}/auth/me`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(profileData)
            });

            if (!profileRes.ok) {
                const errData = await profileRes.json();
                throw new Error(errData.detail || "Erro ao atualizar perfil");
            }

            // 2. Atualizar Configurações do Cliente (Apenas se não for usuário comum e houver cliente ativo)
            if (activeClient && user?.role !== 'user') {
                const res = await fetchWithAuth(`${API_URL}/settings/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ settings: settingsToSend })
                }, activeClient.id);

                if (!res.ok) {
                    throw new Error("Erro ao salvar configurações do cliente");
                }
            }

            toast.success("Alterações salvas com sucesso!");
            if (onSaved) onSaved();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error(error.message || "Erro ao salvar");
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

                <form onSubmit={handleSubmit} className="p-6 space-y-8" autoComplete="off">


                    {/* General Section */}
                    {user?.role !== 'user' && (user?.role !== 'premium') && (
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
                                        autoComplete="off"
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Exibido no topo da tela inicial.</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Nome da Empresa (White Label)</label>
                                    <input
                                        type="text"
                                        name="APP_NAME"
                                        value={formData.APP_NAME || ''}
                                        onChange={handleChange}
                                        maxLength={35}
                                        placeholder="Ex: Minha Empresa"
                                        className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                    <div className="flex justify-between mt-1">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Substitui o nome "ZapVoice" no sistema.</p>
                                        <span className={`text-[10px] ${(formData.APP_NAME?.length || 0) >= 35 ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                                            {formData.APP_NAME?.length || 0}/35
                                        </span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Logo do App (White Label)</label>

                                    <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-dashed border-gray-300 dark:border-gray-600">
                                        <div className="flex flex-col items-center gap-2">
                                            {formData.APP_LOGO ? (
                                                <div className="relative group w-20 h-20 bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
                                                    <img src={formData.APP_LOGO} alt="App Logo" className="w-full h-full object-cover" />
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData(prev => ({ ...prev, APP_LOGO: '' }))}
                                                        className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                                                        title="Remover logo"
                                                    >
                                                        <FiTrash2 size={20} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center text-gray-400 border border-gray-200 dark:border-gray-700 border-dashed">
                                                    <FiImage size={32} />
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 space-y-3">
                                            <div className="flex flex-col gap-2">
                                                <label className="relative cursor-pointer bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm transition-all flex items-center justify-center gap-2 group">
                                                    <FiUpload className="group-hover:translate-y-[-1px] transition-transform" />
                                                    <span>{formData.APP_LOGO ? 'Alterar Logo' : 'Fazer Upload da Logo'}</span>
                                                    <input
                                                        type="file"
                                                        className="hidden"
                                                        accept="image/*"
                                                        onChange={handleLogoUpload}
                                                        disabled={isUploading}
                                                    />
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        name="APP_LOGO"
                                                        value={formData.APP_LOGO || ''}
                                                        onChange={handleChange}
                                                        placeholder="Ou cole a URL da logo aqui..."
                                                        className="w-full p-2 text-xs border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 outline-none focus:ring-1 focus:ring-purple-500"
                                                    />
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-gray-500 dark:text-gray-400">Recomendado: Imagem quadrada (PNG ou JPEG), máx 2MB.</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tamanho da Logo</label>
                                    <select
                                        name="APP_LOGO_SIZE"
                                        value={formData.APP_LOGO_SIZE || 'medium'}
                                        onChange={handleChange}
                                        className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        <option value="small">Pequena (32px)</option>
                                        <option value="medium">Média (48px)</option>
                                        <option value="large">Grande (64px)</option>
                                        <option value="xlarge">Extra Grande (80px)</option>
                                    </select>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Ajusta o tamanho da logo na barra lateral.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Personal Profile Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700">
                            <span className="text-blue-500">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                </svg>
                            </span>
                            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Meu Perfil</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Meu Nome</label>
                                <input
                                    type="text"
                                    name="full_name"
                                    value={profileData.full_name}
                                    onChange={handleProfileChange}
                                    placeholder="Seu nome real"
                                    className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    autoComplete="name"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Meu Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={profileData.email}
                                    onChange={handleProfileChange}
                                    placeholder="seu@email.com"
                                    className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    autoComplete="email"
                                />
                            </div>
                            <div className="space-y-1 md:col-span-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Nova Senha (deixe em branco para manter)</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        value={profileData.password}
                                        onChange={handleProfileChange}
                                        placeholder="••••••••"
                                        className="w-full p-2.5 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                                        title={showPassword ? "Ocultar senha" : "Mostrar senha"}
                                    >
                                        {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>


                    {/* WhatsApp Section */}
                    {user?.role !== 'user' && (user?.role !== 'premium') && (
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
                                        autoComplete="one-time-code"
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
                                        autoComplete="new-password"
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Token gerado no painel de desenvolvedor da Meta.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Chatwoot Section */}
                    {user?.role !== 'user' && (user?.role !== 'premium') && (
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
                                        autoComplete="new-password"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Meta Webhook Section */}
                    {user?.role !== 'user' && (user?.role !== 'premium') && (
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
                                        {API_URL}/webhooks/meta
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
                                <div className="space-y-1 md:col-span-2">
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
                    )}

                    {/* Chatwoot Events Webhook Section */}
                    {user?.role !== 'user' && (user?.role !== 'premium') && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700">
                                <span className="text-indigo-600">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                                    </svg>
                                </span>
                                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Webhook de Eventos Chatwoot</h3>
                            </div>

                            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-100 dark:border-indigo-800 text-sm">
                                <p className="font-semibold text-indigo-800 dark:text-indigo-300 mb-2">📍 URL do Webhook (cole no Chatwoot):</p>
                                <div className="flex items-center gap-2">
                                    <code className="bg-white dark:bg-gray-900 px-3 py-1.5 rounded border border-indigo-200 dark:border-indigo-700 select-all text-xs flex-1">
                                        {API_URL}/webhooks/chatwoot_events{activeClient?.id ? `?client_id=${activeClient.id}` : ''}
                                    </code>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const webhookUrl = `${API_URL}/webhooks/chatwoot_events${activeClient?.id ? `?client_id=${activeClient.id}` : ''}`;
                                            navigator.clipboard.writeText(webhookUrl);
                                            toast.success('URL copiada!');
                                        }}
                                        className="px-3 py-1.5 bg-indigo-500 text-white rounded hover:bg-blue-600 transition text-xs"
                                    >
                                        Copiar
                                    </button>
                                </div>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-2">Configure este webhook no Chatwoot para receber atualizações de mensagens e contatos.</p>
                            </div>
                        </div>
                    )}


                    {/* Contact Sync Table Section */}
                    {user?.role !== 'user' && (user?.role !== 'premium') && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700">
                                <span className="text-orange-600">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M3 12v3c0 1.1.9 2 2 2h10a2 2 0 002-2v-3a2 2 0 00-2-2H5a2 2 0 00-2 2zm2-1h10a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3a1 1 0 011-1z" />
                                        <path d="M3 6v3c0 1.1.9 2 2 2h10a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2zm2-1h10a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z" />
                                    </svg>
                                </span>
                                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Monitoramento de Contatos (Custom Table)</h3>
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Nome da Tabela no Postgres</label>
                                <input
                                    type="text"
                                    name="SYNC_CONTACTS_TABLE"
                                    value={formData.SYNC_CONTACTS_TABLE || ''}
                                    onChange={handleChange}
                                    placeholder="Ex: contatos_monitorados"
                                    className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Esta tabela será criada/atualizada automaticamente no seu banco de dados com: <b>Nome, Número, Inbox ID e Horário.</b>
                                </p>
                            </div>

                            {/* Lista de Contatos Sincronizados */}
                            <div className="mt-6 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                        Contatos Sincronizados Recently
                                        {loadingContacts && <div className="w-3 h-3 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>}
                                    </h4>
                                    <button
                                        type="button"
                                        onClick={fetchSyncedContacts}
                                        className="text-xs text-orange-600 hover:underline font-medium"
                                    >
                                        Atualizar Lista
                                    </button>
                                </div>

                                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                    <div className="max-h-60 overflow-y-auto">
                                        {syncedContacts.length === 0 ? (
                                            <div className="p-8 text-center text-gray-400 text-sm italic">
                                                Nenhum contato sincronizado nesta tabela ainda.
                                            </div>
                                        ) : (
                                            <table className="w-full text-left text-xs">
                                                <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                                                    <tr>
                                                        <th className="px-4 py-2 font-bold">Nome</th>
                                                        <th className="px-4 py-2 font-bold">Telefone</th>
                                                        <th className="px-4 py-2 font-bold">Última Interação</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                                    {syncedContacts.map((contact, idx) => (
                                                        <tr key={idx} className="hover:bg-white dark:hover:bg-gray-800 transition-colors">
                                                            <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-200">{contact.name || 'Sem Nome'}</td>
                                                            <td className="px-4 py-3 font-mono text-gray-500 dark:text-gray-400">{contact.phone}</td>
                                                            <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                                                                {contact.last_interaction_at ? new Date(contact.last_interaction_at).toLocaleString('pt-BR', {
                                                                    day: '2-digit',
                                                                    month: '2-digit',
                                                                    year: '2-digit',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                }) : '-'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}


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
