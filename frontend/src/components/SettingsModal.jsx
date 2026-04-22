import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FiEye, FiEyeOff, FiUpload, FiImage, FiTrash2, FiPlus, FiCopy, FiShield, FiChevronLeft, FiChevronRight, FiDatabase, FiCpu, FiAlertCircle } from 'react-icons/fi';
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
        AI_MEMORY_ENABLED: false,
        AGENT_MEMORY_WEBHOOK_URL: ''
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
    const [isSettingsGuideOpen, setIsSettingsGuideOpen] = useState(false);
    const [whatsappProfile, setWhatsappProfile] = useState(null);
    const [whatsappAbout, setWhatsappAbout] = useState("");
    const [isUpdatingWaLogo, setIsUpdatingWaLogo] = useState(false);
    const [isUpdatingWaAbout, setIsUpdatingWaAbout] = useState(false);
    const [visibleFields, setVisibleFields] = useState({});
    const [activeTab, setActiveTab] = useState('geral');
    const [testingWebhook, setTestingWebhook] = useState(false);

    // --- Pagination States for Contacts ---
    const [contactsPage, setContactsPage] = useState(0);
    const [contactsLimit, setContactsLimit] = useState(20);
    const [contactsTotal, setContactsTotal] = useState(0);

    // --- AI Memory Logs States ---
    const [memoryLogs, setMemoryLogs] = useState([]);
    const [loadingMemoryLogs, setLoadingMemoryLogs] = useState(false);
    const [memoryLogsPage, setMemoryLogsPage] = useState(0);
    const [memoryLogsLimit, setMemoryLogsLimit] = useState(20);
    const [memoryLogsTotal, setMemoryLogsTotal] = useState(0);

    useEffect(() => {
        if (isOpen) {
            loadSettings();
            fetchSyncedContacts();
            fetchMemoryLogs();
            fetchWhatsAppProfile();
            fetchAgents();
            if (user) {
                setProfileData({
                    email: user.email || '',
                    full_name: user.full_name || '',
                    password: '' // Sempre limpo para segurança
                });
            }
        }
    }, [isOpen, user]);

    // Recarregar contatos quando a página ou limite mudar
    useEffect(() => {
        if (isOpen && activeTab === 'advanced') {
            fetchSyncedContacts();
        }
    }, [contactsPage, contactsLimit]);

    // Recarregar logs de memória quando a página ou limite mudar
    useEffect(() => {
        if (isOpen && activeTab === 'advanced') {
            fetchMemoryLogs();
        }
    }, [memoryLogsPage, memoryLogsLimit]);

    // WebSocket Realtime Sync para Configurações
    useEffect(() => {
        if (!isOpen || !activeClient) return;

        let ws;
        try {
            const wsToken = localStorage.getItem('token');
            ws = new WebSocket(wsToken ? `${WS_URL}/ws?token=${wsToken}` : `${WS_URL}/ws`);

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
                
                // Clear any visible fields mask status if needed? 
                // No, revealSetting handles it.
                
                // Note: fetchAgents will be called by the useEffect(isOpen) or manual trigger.
                // We ensure it only runs if we have some value.
                if (data.CHATWOOT_API_TOKEN) {
                    fetchAgents();
                }

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
            const skip = contactsPage * contactsLimit;
            const res = await fetchWithAuth(`${API_URL}/settings/contacts?skip=${skip}&limit=${contactsLimit}`, {}, activeClient.id);
            if (res.ok) {
                const data = await res.json();
                setSyncedContacts(data.items || []);
                setContactsTotal(data.total || 0);
            }
        } catch (error) {
            console.error("Erro ao buscar contatos sincronizados:", error);
        } finally {
            setLoadingContacts(false);
        }
    };

    const fetchMemoryLogs = async () => {
        if (!activeClient) return;
        setLoadingMemoryLogs(true);
        try {
            const skip = memoryLogsPage * memoryLogsLimit;
            const res = await fetchWithAuth(`${API_URL}/settings/memory-logs?skip=${skip}&limit=${memoryLogsLimit}`, {}, activeClient.id);
            if (res.ok) {
                const data = await res.json();
                setMemoryLogs(data.items || []);
                setMemoryLogsTotal(data.total || 0);
            }
        } catch (error) {
            console.error("Erro ao buscar logs de memória:", error);
        } finally {
            setLoadingMemoryLogs(false);
        }
    };

    const fetchWhatsAppProfile = async () => {
        if (!activeClient) return;
        try {
            const res = await fetchWithAuth(`${API_URL}/whatsapp/profile`, {}, activeClient.id);
            if (res.ok) {
                const data = await res.json();
                if (!data.error) {
                    setWhatsappProfile(data);
                    setWhatsappAbout(data.about || "");
                } else {
                    setWhatsappProfile(null);
                }
            }
        } catch (error) {
            console.error("Erro ao buscar perfil do WhatsApp:", error);
        }
    };

    const handleTestWebhook = async () => {
        if (!activeClient || !formData.AGENT_MEMORY_WEBHOOK_URL) return;

        setTestingWebhook(true);
        const loadingToast = toast.loading("Enviando evento de teste...");

        try {
            const res = await fetchWithAuth(
                `${API_URL}/settings/test-memory-webhook`,
                {
                    method: 'POST',
                    body: JSON.stringify({ url: formData.AGENT_MEMORY_WEBHOOK_URL })
                },
                activeClient.id
            );

            const result = await res.json();

            if (result.success) {
                toast.success(`Sucesso! Status: ${result.status}`, { id: loadingToast });
            } else {
                const errorDetail = result.error || `Status: ${result.status}`;
                toast.error(`Falha no teste: ${errorDetail}`, { id: loadingToast, duration: 5000 });
            }
        } catch (error) {
            console.error("Erro ao testar webhook:", error);
            toast.error("Erro de conexão ao testar webhook", { id: loadingToast });
        } finally {
            setTestingWebhook(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({ 
            ...formData, 
            [name]: type === 'checkbox' ? (checked ? true : false) : value 
        });
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

    const handleWhatsAppLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error("Por favor, selecione um arquivo de imagem.");
            return;
        }

        setIsUpdatingWaLogo(true);
        const loadingToast = toast.loading("Atualizando foto do WhatsApp...");

        try {
            const formDataUpload = new FormData();
            formDataUpload.append('file', file);

            const res = await fetchWithAuth(`${API_URL}/whatsapp/profile-picture`, {
                method: 'POST',
                body: formDataUpload
            }, activeClient?.id);

            if (res.ok) {
                toast.success("Foto de perfil do WhatsApp atualizada!");
                fetchWhatsAppProfile();
            } else {
                const err = await res.json();
                throw new Error(err.detail || "Erro ao atualizar foto");
            }
        } catch (error) {
            console.error(error);
            toast.error(error.message || "Erro ao atualizar foto do WhatsApp");
        } finally {
            setIsUpdatingWaLogo(false);
            toast.dismiss(loadingToast);
        }
    };

    const handleUpdateWhatsAppAbout = async () => {
        if (!whatsappAbout.trim()) return;
        setIsUpdatingWaAbout(true);
        try {
            const res = await fetchWithAuth(`${API_URL}/whatsapp/profile`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ about: whatsappAbout })
            }, activeClient?.id);

            if (res.ok) {
                toast.success("Recado do WhatsApp atualizado!");
                fetchWhatsAppProfile();
            } else {
                const err = await res.json();
                throw new Error(err.detail || "Erro ao atualizar");
            }
        } catch (error) {
            toast.error(error.message || "Erro ao atualizar recado");
        } finally {
            setLoading(false);
            setIsUpdatingWaAbout(false);
        }
    };

    const [agents, setAgents] = useState([]);
    const [loadingAgents, setLoadingAgents] = useState(false);
    const [newAgent, setNewAgent] = useState({ name: '', email: '', role: 'agent' });
    const [isAddingAgent, setIsAddingAgent] = useState(false);
    const [agentToDelete, setAgentToDelete] = useState(null);

    const fetchAgents = async () => {
        if (!activeClient) return;
        
        setLoadingAgents(true);
        try {
            const res = await fetchWithAuth(`${API_URL}/chatwoot/agents`, {}, activeClient.id);
            if (res.ok) {
                const data = await res.json();
                setAgents(Array.isArray(data) ? data : []);
            } else {
                const err = await res.json();
                console.error("Erro ao buscar agentes:", err);
                setAgents([]);
            }
        } catch (error) {
            console.error("Erro ao buscar agentes:", error);
            setAgents([]);
        } finally {
            setLoadingAgents(false);
        }
    };

    const handleDeleteAgent = async (agent) => {
        setAgentToDelete(agent);
    };

    const confirmDeleteAgent = async () => {
        if (!agentToDelete) return;
        const agentId = agentToDelete.id;
        
        setAgentToDelete(null);
        const loadingToast = toast.loading("Removendo agente...");
        try {
            const res = await fetchWithAuth(`${API_URL}/chatwoot/agents/${agentId}`, {
                method: 'DELETE'
            }, activeClient?.id);

            if (res.ok) {
                toast.success("Agente removido com sucesso!");
                setAgents(agents.filter(a => a.id !== agentId));
            } else {
                const err = await res.json();
                throw new Error(err.detail || "Erro ao remover agente");
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            toast.dismiss(loadingToast);
        }
    };

    const handleAddAgent = async () => {
        if (!newAgent.name || !newAgent.email) {
            toast.error("Preencha nome e email do agente");
            return;
        }

        setIsAddingAgent(true);
        const loadingToast = toast.loading("Adicionando agente no Chatwoot...");
        try {
            const res = await fetchWithAuth(`${API_URL}/chatwoot/agents`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newAgent)
            }, activeClient?.id);

            if (res.ok) {
                toast.success("Agente adicionado com sucesso!");
                setNewAgent({ name: '', email: '', role: 'agent' });
                fetchAgents();
            } else {
                const err = await res.json();
                throw new Error(err.detail || "Erro ao adicionar agente");
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setIsAddingAgent(false);
            toast.dismiss(loadingToast);
        }
    };

    // --- Reusable Pagination Component ---
    const PaginationControls = ({ page, limit, total, onPageChange, onLimitChange }) => {
        const totalPages = Math.ceil(total / limit) || 1;
        
        return (
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-4">
                    <select 
                        value={limit}
                        onChange={(e) => {
                            onLimitChange(Number(e.target.value));
                            onPageChange(0); // Reset to first page
                        }}
                        className="text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 outline-none text-gray-600 dark:text-gray-400"
                    >
                        <option value={20}>20 por página</option>
                        <option value={50}>50 por página</option>
                        <option value={100}>100 por página</option>
                    </select>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Total: {total}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        disabled={page === 0}
                        onClick={() => onPageChange(page - 1)}
                        className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-gray-700 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                        <FiChevronLeft size={16} />
                    </button>
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-400 min-w-[60px] text-center">
                        {page + 1} / {totalPages}
                    </span>
                    <button
                        type="button"
                        disabled={page + 1 >= totalPages}
                        onClick={() => onPageChange(page + 1)}
                        className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-gray-700 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                        <FiChevronRight size={16} />
                    </button>
                </div>
            </div>
        );
    };

    const handleRevealSetting = async (key) => {
        if (visibleFields[key]) {
            setVisibleFields(prev => ({ ...prev, [key]: false }));
            // Recarregar configurações para esconder o valor real
            loadSettings();
            return;
        }

        try {
            const res = await fetchWithAuth(`${API_URL}/settings/reveal`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key })
            }, activeClient?.id);

            if (res.ok) {
                const data = await res.json();
                setFormData(prev => ({ ...prev, [key]: data.value }));
                setVisibleFields(prev => ({ ...prev, [key]: true }));
                
                // If we revealed the token, refresh agents
                if (key === 'CHATWOOT_API_TOKEN') {
                    // Use the revealed token values to fetch
                    setTimeout(() => fetchAgents(), 500);
                }
            }
        } catch (error) {
            toast.error("Erro ao revelar configuração");
        }
    };

    const copyToClipboard = (text, label) => {
        if (!text || text.includes('***')) {
            toast.error("Revele o token antes de copiar!");
            return;
        }
        navigator.clipboard.writeText(text);
        toast.success(`${label} copiado!`);
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

            // Se o nome do cliente foi alterado, atualiza a lista de clientes
            if (activeClient && settingsToSend.CLIENT_NAME && settingsToSend.CLIENT_NAME !== activeClient.name) {
                refreshClients();
            }

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
        <>
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
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setIsSettingsGuideOpen(true)}
                            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all hover:scale-105"
                            style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8' }}
                            title="Abrir guia das configurações"
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                            Guia
                        </button>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-300 dark:hover:text-white p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    </div>
                </div>
                <div className="flex bg-gray-50 dark:bg-gray-900/30 p-1 border-b border-gray-100 dark:border-gray-700 overflow-x-auto no-scrollbar sticky top-0 z-10">
                    <button
                        type="button"
                        onClick={() => setActiveTab('geral')}
                        className={`flex items-center gap-2 px-6 py-2.5 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${
                            activeTab === 'geral' 
                            ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm' 
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                        }`}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                        Básico
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('chatwoot')}
                        className={`flex items-center gap-2 px-6 py-2.5 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${
                            activeTab === 'chatwoot' 
                            ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm' 
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                        }`}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                        Chatwoot
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('whatsapp')}
                        className={`flex items-center gap-2 px-6 py-2.5 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${
                            activeTab === 'whatsapp' 
                            ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm' 
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                        }`}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                        WhatsApp
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('advanced')}
                        className={`flex items-center gap-2 px-6 py-2.5 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${
                            activeTab === 'advanced' 
                            ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm' 
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                        }`}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        Avançado
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-0 flex flex-col h-full max-h-[calc(90vh-140px)]" autoComplete="off">
                    <div className="p-6 space-y-8 overflow-y-auto flex-1 custom-scrollbar">
                        
                        {activeTab === 'geral' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                {/* General Section */}
                                {user?.role !== 'user' && (user?.role !== 'premium') && (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700">
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
                            </div>
                        )}

                        {activeTab === 'chatwoot' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                {/* Chatwoot Section */}
                                {['super_admin', 'admin', 'administrator', 'owner'].includes(user?.role) && (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700">
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
                                                <div className="relative">
                                                    <input
                                                        type={visibleFields['CHATWOOT_API_TOKEN'] ? "text" : "password"}
                                                        name="CHATWOOT_API_TOKEN"
                                                        value={formData.CHATWOOT_API_TOKEN}
                                                        onChange={handleChange}
                                                        placeholder="Token do usuário..."
                                                        className="w-full p-2.5 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                        autoComplete="new-password"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRevealSetting('CHATWOOT_API_TOKEN')}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500 transition-colors"
                                                    >
                                                        {visibleFields['CHATWOOT_API_TOKEN'] ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="md:col-span-2 flex justify-end">
                                                <button
                                                    onClick={fetchAgents}
                                                    disabled={loadingAgents}
                                                    type="button"
                                                    className="text-xs text-blue-500 hover:text-blue-600 font-medium flex items-center gap-1 transition-all"
                                                >
                                                    {loadingAgents ? "Atualizando..." : "🔄 Atualizar Lista de Agentes"}
                                                </button>
                                            </div>
                                        </div>
                                        {/* Validation: Check if Chatwoot is configured */}
                                        {activeTab === 'chatwoot' && ['super_admin', 'admin', 'administrator', 'owner'].includes(user?.role) && (
                                            <div className={`p-4 rounded-xl border flex items-start gap-3 mt-4 transition-all ${
                                                (formData.CHATWOOT_API_URL && formData.CHATWOOT_API_TOKEN && !formData.CHATWOOT_API_TOKEN.includes('***')) 
                                                ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300' 
                                                : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                                            }`}>
                                                <div className={`p-1 rounded-full mt-0.5 ${
                                                    (formData.CHATWOOT_API_URL && formData.CHATWOOT_API_TOKEN && !formData.CHATWOOT_API_TOKEN.includes('***'))
                                                    ? 'bg-green-100 dark:bg-green-800'
                                                    : 'bg-amber-100 dark:bg-amber-800'
                                                }`}>
                                                    { (formData.CHATWOOT_API_URL && formData.CHATWOOT_API_TOKEN && !formData.CHATWOOT_API_TOKEN.includes('***')) ? (
                                                        <FiShield className="h-4 w-4" />
                                                    ) : (
                                                        <FiEye className="h-4 w-4" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-bold">
                                                        {(formData.CHATWOOT_API_URL && formData.CHATWOOT_API_TOKEN && !formData.CHATWOOT_API_TOKEN.includes('***')) 
                                                        ? 'Conexão Pronta!' 
                                                        : 'Chatwoot não revelado ou incompleto'}
                                                    </p>
                                                    <p className="opacity-80 text-xs">
                                                        {(formData.CHATWOOT_API_URL && formData.CHATWOOT_API_TOKEN && !formData.CHATWOOT_API_TOKEN.includes('***'))
                                                        ? 'Você pode gerenciar os agentes abaixo.'
                                                        : 'Revele o Token da API e preencha a URL para gerenciar agentes.'}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* New Agent Section - Show if we have data (even if masked) */}
                                {activeTab === 'chatwoot' && ['super_admin', 'admin', 'administrator', 'owner'].includes(user?.role) && (formData.CHATWOOT_API_URL && formData.CHATWOOT_API_TOKEN) && (
                                    <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="p-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                                                    <FiPlus className="h-5 w-5" />
                                                </span>
                                                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Gerenciar Atendentes</h3>
                                            </div>
                                        </div>
                                        <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed italic border-l-2 border-blue-200 dark:border-blue-800 pl-3">
                                            Crie novos usuários no seu Chatwoot diretamente por aqui. Eles poderão responder mensagens no painel do Chatwoot.
                                        </p>
                                        
                                        <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700 space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Nome do Agente</label>
                                                    <input
                                                        type="text"
                                                        value={newAgent.name}
                                                        onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                                                        placeholder="Nome completo"
                                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white dark:bg-gray-700 text-sm"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Tipo de Usuário</label>
                                                    <select
                                                        value={newAgent.role}
                                                        onChange={(e) => setNewAgent({ ...newAgent, role: e.target.value })}
                                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white dark:bg-gray-700 text-sm"
                                                    >
                                                        <option value="agent">Agente (Atendente)</option>
                                                        <option value="administrator">Administrador</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-1 md:col-span-2">
                                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Email do Agente</label>
                                                    <input
                                                        type="email"
                                                        value={newAgent.email}
                                                        onChange={(e) => setNewAgent({ ...newAgent, email: e.target.value })}
                                                        placeholder="atendente@empresa.com"
                                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white dark:bg-gray-700 text-sm"
                                                    />
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleAddAgent}
                                                disabled={isAddingAgent}
                                                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                {isAddingAgent ? 'Adicionando...' : 'Adicionar Agente'}
                                            </button>

                                            {/* List of Existing Agents */}
                                            <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                                                <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Agentes Atuais</h4>
                                                {loadingAgents ? (
                                                    <div className="flex justify-center p-4">
                                                        <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                                        {agents.length > 0 ? (
                                                            agents.map(agent => (
                                                                <div key={agent.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:shadow-sm transition-all group">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs">
                                                                            {agent.name?.charAt(0).toUpperCase()}
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{agent.name}</p>
                                                                            <p className="text-[10px] text-gray-400">{agent.email} • <span className="capitalize">{agent.role === 'administrator' ? 'Admin' : 'Agente'}</span></p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        {agent.role !== 'administrator' ? (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleDeleteAgent(agent)}
                                                                                className="p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                                                                                title="Remover Agente"
                                                                            >
                                                                                <FiTrash2 size={16} />
                                                                            </button>
                                                                        ) : (
                                                                            <span className="p-2 text-gray-300 dark:text-gray-600 cursor-not-allowed" title="Administradores não podem ser removidos por aqui">
                                                                                <FiShield size={16} />
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <p className="text-center text-gray-400 text-xs py-4 italic">Nenhum agente encontrado.</p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Chatwoot Events Webhook Section */}
                                {['super_admin', 'admin', 'administrator', 'owner'].includes(user?.role) && (
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
                                                    <FiCopy />
                                                </button>
                                            </div>
                                            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-2">Configure este webhook no Chatwoot para receber atualizações de mensagens e contatos.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'whatsapp' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                {/* WhatsApp Section */}
                                {['super_admin', 'admin', 'administrator', 'owner'].includes(user?.role) && (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700">
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
                                                <div className="relative group">
                                                    <input 
                                                        type={visibleFields.WA_ACCESS_TOKEN ? "text" : "password"}
                                                        name="WA_ACCESS_TOKEN"
                                                        value={formData.WA_ACCESS_TOKEN}
                                                        onChange={handleChange}
                                                        placeholder="EAAB..."
                                                        className="w-full p-2.5 pr-20 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all font-mono text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                        autoComplete="new-password"
                                                    />
                                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRevealSetting('WA_ACCESS_TOKEN')}
                                                            className="p-1.5 text-gray-400 hover:text-green-500 transition-colors"
                                                            title={visibleFields.WA_ACCESS_TOKEN ? "Esconder" : "Visualizar"}
                                                        >
                                                            {visibleFields.WA_ACCESS_TOKEN ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => copyToClipboard(formData.WA_ACCESS_TOKEN, "Token")}
                                                            className="p-1.5 text-gray-400 hover:text-green-500 transition-colors"
                                                            title="Copiar"
                                                        >
                                                            <FiCopy size={18} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Token gerado no painel de desenvolvedor da Meta.</p>
                                            </div>

                                            <div className="space-y-2 md:col-span-2 mt-2">
                                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Foto de Perfil do WhatsApp</label>
                                                
                                                <div className="flex items-center gap-4 p-4 bg-green-50/50 dark:bg-green-900/10 rounded-xl border border-green-100 dark:border-green-900/30">
                                                    <div className="relative group w-20 h-20 bg-white dark:bg-gray-800 rounded-full overflow-hidden border-2 border-green-500 shadow-lg">
                                                        {whatsappProfile?.profile_picture_url ? (
                                                            <img 
                                                                src={whatsappProfile.profile_picture_url} 
                                                                alt="WhatsApp Profile" 
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                                <FiImage size={32} />
                                                            </div>
                                                        )}
                                                        {isUpdatingWaLogo && (
                                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="flex-1">
                                                        <div className="mb-2">
                                                            <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500 mb-1 block">Recado / Frase do WhatsApp</label>
                                                            <div className="flex gap-2">
                                                                <input 
                                                                    type="text" 
                                                                    value={whatsappAbout}
                                                                    onChange={(e) => setWhatsappAbout(e.target.value)}
                                                                    className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-green-500 outline-none transition-all"
                                                                    placeholder="Ex: Hey there! I am using WhatsApp."
                                                                />
                                                                <button 
                                                                    type="button"
                                                                    onClick={handleUpdateWhatsAppAbout}
                                                                    disabled={isUpdatingWaAbout}
                                                                    className="px-3 py-1.5 bg-gray-800 dark:bg-white text-white dark:text-gray-800 text-xs font-bold rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
                                                                >
                                                                    {isUpdatingWaAbout ? '...' : 'Salvar'}
                                                                </button>
                                                            </div>
                                                        </div>

                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                                                            Esta imagem e frase são exibidas para seus clientes no WhatsApp.
                                                        </p>

                                                        {whatsappProfile?.display_phone_number && (
                                                            <div className="flex items-center gap-2 mb-3 bg-white/50 dark:bg-black/20 w-fit px-2 py-1 rounded-md border border-gray-100 dark:border-gray-800">
                                                                <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                                                                    {whatsappProfile.display_phone_number.startsWith('+') ? whatsappProfile.display_phone_number : `+${whatsappProfile.display_phone_number}`}
                                                                </span>
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => copyToClipboard(whatsappProfile.display_phone_number, "Número")}
                                                                    className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                                                                    title="Copiar Número"
                                                                >
                                                                    <FiCopy size={14} />
                                                                </button>
                                                            </div>
                                                        )}
                                                        
                                                        <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-all shadow-sm active:scale-95">
                                                            <FiUpload size={14} />
                                                            Alterar Foto no WhatsApp
                                                            <input 
                                                                type="file" 
                                                                className="hidden" 
                                                                accept="image/png, image/jpeg" 
                                                                onChange={handleWhatsAppLogoUpload}
                                                                disabled={isUpdatingWaLogo}
                                                            />
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Meta Webhook Section */}
                                {['super_admin', 'admin', 'administrator', 'owner'].includes(user?.role) && (
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
                                                    <FiCopy />
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
                            </div>
                        )}

                        {activeTab === 'advanced' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                {/* Contact Sync Table Section */}
                                {['super_admin', 'admin', 'administrator', 'owner'].includes(user?.role) && (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700">
                                            <span className="text-orange-600">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path d="M3 12v3c0 1.1.9 2 2 2h10a2 2 0 002-2v-3a2 2 0 00-2-2H5a2 2 0 00-2 2zm2-1h10a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3a1 1 0 011-1z" />
                                                    <path d="M3 6v3c0 1.1.9 2 2 2h10a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2zm2-1h10a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z" />
                                                </svg>
                                            </span>
                                            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Monitoramento de Contatos</h3>
                                        </div>

                                         <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-100 dark:border-orange-800 text-sm">
                                            <p className="text-orange-800 dark:text-orange-300">
                                                Os contatos que interagem com o sistema são sincronizados automaticamente na tabela <b>contatos_monitorados</b> do seu banco de dados.
                                            </p>
                                        </div>

                                        {/* Lista de Contatos Sincronizados */}
                                        <div className="mt-6 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                                    Contatos Sincronizados
                                                    {loadingContacts && <div className="w-3 h-3 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>}
                                                </h4>
                                                <button
                                                    type="button"
                                                    onClick={() => { setContactsPage(0); fetchSyncedContacts(); }}
                                                    className="text-xs text-orange-600 hover:underline font-medium"
                                                >
                                                    Atualizar
                                                </button>
                                            </div>

                                            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                                                <div className="overflow-x-auto">
                                                    {syncedContacts.length === 0 && !loadingContacts ? (
                                                        <div className="p-8 text-center text-gray-400 text-sm italic">
                                                            Nenhum contato sincronizado nesta tabela ainda.
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <table className="w-full text-left text-xs">
                                                                <thead className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                                                                    <tr>
                                                                        <th className="px-4 py-3 font-bold uppercase tracking-wider">Nome</th>
                                                                        <th className="px-4 py-3 font-bold uppercase tracking-wider">Telefone</th>
                                                                        <th className="px-4 py-3 font-bold uppercase tracking-wider">Última Interação</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                                                    {loadingContacts ? (
                                                                        Array(3).fill(0).map((_, i) => (
                                                                            <tr key={i} className="animate-pulse">
                                                                                <td colSpan="3" className="px-4 py-4"><div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-full"></div></td>
                                                                            </tr>
                                                                        ))
                                                                    ) : (
                                                                        syncedContacts.map((contact, idx) => (
                                                                            <tr key={idx} className="hover:bg-white dark:hover:bg-gray-800/50 transition-colors">
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
                                                                        ))
                                                                    )}
                                                                </tbody>
                                                            </table>
                                                            <PaginationControls 
                                                                page={contactsPage} 
                                                                limit={contactsLimit} 
                                                                total={contactsTotal} 
                                                                onPageChange={setContactsPage} 
                                                                onLimitChange={setContactsLimit} 
                                                            />
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                            {/* Webhook Config */}
                                            <div className="space-y-4 pt-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="p-1.5 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 rounded-lg">
                                                        <FiCopy className="h-5 w-5" />
                                                    </span>
                                                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">Webhook de Memória do Agente</h3>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">URL do Webhook (POST)</label>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="url"
                                                            name="AGENT_MEMORY_WEBHOOK_URL"
                                                            value={formData.AGENT_MEMORY_WEBHOOK_URL || ''}
                                                            onChange={handleChange}
                                                            placeholder="https://seu-n8n.com/webhook/memoria"
                                                            className="flex-1 p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                        />
                                                        <button
                                                            type="button"
                                                            disabled={testingWebhook || !formData.AGENT_MEMORY_WEBHOOK_URL}
                                                            onClick={handleTestWebhook}
                                                            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold rounded-lg transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
                                                        >
                                                            {testingWebhook ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : "Testar"}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* LISTA DE LOGS DE MEMÓRIA */}
                                            <div className="mt-8 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                                        Logs de Sincronização de Memória
                                                        {loadingMemoryLogs && <div className="w-3 h-3 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>}
                                                    </h4>
                                                    <button
                                                        type="button"
                                                        onClick={() => { setMemoryLogsPage(0); fetchMemoryLogs(); }}
                                                        className="text-xs text-cyan-600 hover:underline font-medium"
                                                    >
                                                        Atualizar
                                                    </button>
                                                </div>

                                                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                                                    <div className="overflow-x-auto">
                                                        {memoryLogs.length === 0 && !loadingMemoryLogs ? (
                                                            <div className="p-8 text-center text-gray-400 text-sm italic">
                                                                Nenhum log de memória disponível.
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <table className="w-full text-left text-[10px] md:text-xs">
                                                                    <thead className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                                                                        <tr>
                                                                            <th className="px-3 py-2 font-bold uppercase tracking-wider">Data</th>
                                                                            <th className="px-3 py-2 font-bold uppercase tracking-wider">Contato</th>
                                                                            <th className="px-3 py-2 font-bold uppercase tracking-wider">Conteúdo</th>
                                                                            <th className="px-3 py-2 font-bold uppercase tracking-wider">Status</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                                                        {loadingMemoryLogs ? (
                                                                            Array(3).fill(0).map((_, i) => (
                                                                                <tr key={i} className="animate-pulse">
                                                                                    <td colSpan="4" className="px-3 py-4"><div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-full"></div></td>
                                                                                </tr>
                                                                            ))
                                                                        ) : (
                                                                            memoryLogs.map((log) => (
                                                                                <tr key={log.id} className="hover:bg-white dark:hover:bg-gray-800/50 transition-colors">
                                                                                    <td className="px-3 py-2 text-gray-400 font-mono whitespace-nowrap">
                                                                                        {new Date(log.timestamp).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}
                                                                                    </td>
                                                                                    <td className="px-3 py-2 font-medium text-gray-700 dark:text-gray-300">
                                                                                        {log.phone}
                                                                                    </td>
                                                                                    <td className="px-3 py-2 text-gray-500 dark:text-gray-400 max-w-[200px] truncate" title={log.content}>
                                                                                        {log.content || (log.template_name ? `[Template: ${log.template_name}]` : '-')}
                                                                                    </td>
                                                                                    <td className="px-3 py-2">
                                                                                        {log.status === 'sent' || log.status === 'success' ? (
                                                                                            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-bold uppercase text-[9px]">Enviado</span>
                                                                                        ) : log.status === 'failed' ? (
                                                                                            <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-bold uppercase text-[9px] flex items-center gap-1" title={log.error}>
                                                                                                <FiAlertCircle /> Erro
                                                                                            </span>
                                                                                        ) : (
                                                                                            <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 font-bold uppercase text-[9px]">{log.status}</span>
                                                                                        )}
                                                                                    </td>
                                                                                </tr>
                                                                            ))
                                                                        )}
                                                                    </tbody>
                                                                </table>
                                                                <PaginationControls 
                                                                    page={memoryLogsPage} 
                                                                    limit={memoryLogsLimit} 
                                                                    total={memoryLogsTotal} 
                                                                    onPageChange={setMemoryLogsPage} 
                                                                    onLimitChange={setMemoryLogsLimit} 
                                                                />
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                    <div className="p-6 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/10">
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

        {/* Settings Guide Modal */}
        {isSettingsGuideOpen && (
            <div
                className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
                onClick={() => setIsSettingsGuideOpen(false)}
            >
                <div
                    className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl"
                    style={{ background: 'linear-gradient(160deg, #0f1729 0%, #111827 100%)', border: '1px solid rgba(99,102,241,0.3)' }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 rounded-t-2xl" style={{ background: 'rgba(15,23,41,0.95)', borderBottom: '1px solid rgba(99,102,241,0.2)', backdropFilter: 'blur(10px)' }}>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl" style={{ background: 'rgba(99,102,241,0.15)' }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">Guia — Configurações do Sistema</h2>
                                <p className="text-xs" style={{ color: '#6b7280' }}>Entenda cada campo e seção das configurações</p>
                            </div>
                        </div>
                        <button onClick={() => setIsSettingsGuideOpen(false)} className="p-2 rounded-full transition-colors" style={{ color: '#6b7280' }} onMouseEnter={e => e.currentTarget.style.color='#fff'} onMouseLeave={e => e.currentTarget.style.color='#6b7280'}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                    </div>

                    {/* Cards */}
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">

                        {/* Card 1 — Geral */}
                        <div className="rounded-xl p-4 col-span-1 md:col-span-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #818cf8' }}>
                            <div className="flex items-center gap-2 mb-2">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
                                <span className="text-sm font-bold" style={{ color: '#818cf8' }}>Geral — Nome do Cliente</span>
                            </div>
                            <p className="text-sm leading-relaxed" style={{ color: '#9ca3af' }}>
                                O <strong style={{ color: '#e5e7eb' }}>Nome do Cliente</strong> é o identificador principal da conta ativa. Ele aparece no cabeçalho do sistema e é usado para diferenciar múltiplos clientes quando você usa a seleção de clientes no painel. Preencha com o nome da empresa ou projeto.
                            </p>
                        </div>

                        {/* Card 2 — WhatsApp */}
                        <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #34d399' }}>
                            <div className="flex items-center gap-2 mb-2">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.8a16 16 0 0 0 6.29 6.29l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                                <span className="text-sm font-bold" style={{ color: '#34d399' }}>Configurações WhatsApp (Meta)</span>
                            </div>
                            <p className="text-sm leading-relaxed" style={{ color: '#9ca3af' }}>
                                Esses campos conectam o sistema à API oficial do WhatsApp Business:<br/>
                                • <strong style={{ color: '#e5e7eb' }}>WA_BUSINESS_ACCOUNT_ID</strong>: ID da sua conta Meta Business<br/>
                                • <strong style={{ color: '#e5e7eb' }}>WA_PHONE_NUMBER_ID</strong>: ID do número cadastrado na Meta<br/>
                                • <strong style={{ color: '#e5e7eb' }}>WA_ACCESS_TOKEN</strong>: Token de acesso permanente gerado no painel Meta for Developers
                            </p>
                        </div>

                        {/* Card 3 — Chatwoot */}
                        <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #60a5fa' }}>
                            <div className="flex items-center gap-2 mb-2">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                                <span className="text-sm font-bold" style={{ color: '#60a5fa' }}>Configurações Chatwoot</span>
                            </div>
                            <p className="text-sm leading-relaxed" style={{ color: '#9ca3af' }}>
                                Integra o sistema ao seu Chatwoot para sincronizar contatos e receber eventos:<br/>
                                • <strong style={{ color: '#e5e7eb' }}>CHATWOOT_API_URL</strong>: URL do seu servidor Chatwoot<br/>
                                • <strong style={{ color: '#e5e7eb' }}>CHATWOOT_ACCOUNT_ID</strong>: ID da conta no Chatwoot<br/>
                                • <strong style={{ color: '#e5e7eb' }}>CHATWOOT_SELECTED_INBOX_ID</strong>: Inbox padrão para envios<br/>
                                • <strong style={{ color: '#e5e7eb' }}>CHATWOOT_API_TOKEN</strong>: Token de autenticação da API
                            </p>
                        </div>

                        {/* Card 4 — Meta Return Config */}
                        <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #f59e0b' }}>
                            <div className="flex items-center gap-2 mb-2">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/></svg>
                                <span className="text-sm font-bold" style={{ color: '#f59e0b' }}>Meta Return Config</span>
                            </div>
                            <p className="text-sm leading-relaxed" style={{ color: '#9ca3af' }}>
                                Define o comportamento padrão ao receber respostas do webhook da Meta. Configura como o sistema deve processar eventos de entrega, leitura e resposta de mensagens enviadas via API oficial do WhatsApp Business. Deixe em branco para usar o comportamento padrão.
                            </p>
                        </div>

                        {/* Card 5 — White Label */}
                        <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #a78bfa' }}>
                            <div className="flex items-center gap-2 mb-2">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
                                <span className="text-sm font-bold" style={{ color: '#a78bfa' }}>White Label (Marca Personalizada)</span>
                            </div>
                            <p className="text-sm leading-relaxed" style={{ color: '#9ca3af' }}>
                                Personalize a identidade visual do sistema:<br/>
                                • <strong style={{ color: '#e5e7eb' }}>APP_NAME</strong>: Nome exibido no título da aba e cabeçalho<br/>
                                • <strong style={{ color: '#e5e7eb' }}>APP_LOGO</strong>: URL ou upload da logo que aparece no topo do painel<br/>
                                • <strong style={{ color: '#e5e7eb' }}>APP_LOGO_SIZE</strong>: Tamanho da logo (pequeno, médio, grande)
                            </p>
                        </div>

                        {/* Card 6 — AI Memory Webhook */}
                        <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #22d3ee' }}>
                            <div className="flex items-center gap-2 mb-2">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"/><path d="M12 8v4l3 3"/></svg>
                                <span className="text-sm font-bold" style={{ color: '#22d3ee' }}>Webhook de Memória de IA</span>
                            </div>
                            <p className="text-sm leading-relaxed" style={{ color: '#9ca3af' }}>
                                A cada mensagem enviada pelo sistema, o conteúdo e o número do destinatário são enviados para esta URL via POST. Use para alimentar a memória de um Agente de IA no <strong style={{ color: '#e5e7eb' }}>n8n</strong>, <strong style={{ color: '#e5e7eb' }}>Flowise</strong> ou qualquer automação. Deixe vazio para desativar.
                            </p>
                        </div>

                        {/* Card 7 — Perfil do Usuário */}
                        <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #fb923c' }}>
                            <div className="flex items-center gap-2 mb-2">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                <span className="text-sm font-bold" style={{ color: '#fb923c' }}>Perfil do Usuário</span>
                            </div>
                            <p className="text-sm leading-relaxed" style={{ color: '#9ca3af' }}>
                                Altere seus dados de acesso ao sistema:<br/>
                                • <strong style={{ color: '#e5e7eb' }}>Nome completo</strong>: Exibido no painel e nos logs<br/>
                                • <strong style={{ color: '#e5e7eb' }}>E-mail</strong>: Usado para login<br/>
                                • <strong style={{ color: '#e5e7eb' }}>Nova senha</strong>: Deixe em branco para manter a senha atual. Preencha apenas se quiser alterar.
                            </p>
                        </div>

                        {/* Card 8 — Tema */}
                        <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #818cf8' }}>
                            <div className="flex items-center gap-2 mb-2">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>
                                <span className="text-sm font-bold" style={{ color: '#818cf8' }}>Tema do Sistema</span>
                            </div>
                            <p className="text-sm leading-relaxed" style={{ color: '#9ca3af' }}>
                                Alterne entre o <strong style={{ color: '#e5e7eb' }}>modo claro</strong> e o <strong style={{ color: '#e5e7eb' }}>modo escuro</strong> usando o botão de tema no canto inferior da tela. A preferência é salva automaticamente no navegador e aplicada em todas as sessões futuras neste dispositivo.
                            </p>
                        </div>

                    </div>

                    {/* Footer */}
                    <div className="px-6 pb-6 pt-2 flex justify-end">
                        <button
                            onClick={() => setIsSettingsGuideOpen(false)}
                            className="px-5 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105"
                            style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8' }}
                        >
                            Entendi, fechar guia
                        </button>
                    </div>
                </div>
            </div>
        )}
        
        {/* Custom Modal de Confirmação para Deletar Agente */}
        {agentToDelete && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className="p-6 text-center">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-600 dark:text-red-400 mx-auto mb-4">
                            <FiTrash2 size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Remover Agente?</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Tem certeza que deseja remover <span className="font-bold text-gray-700 dark:text-gray-200">{agentToDelete.name}</span>? Esta ação não pode ser desfeita.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 border-t border-gray-100 dark:border-gray-700">
                        <button
                            onClick={() => setAgentToDelete(null)}
                            className="py-4 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-r border-gray-100 dark:border-gray-700"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={confirmDeleteAgent}
                            className="py-4 text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                        >
                            Sim, Remover
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
}


