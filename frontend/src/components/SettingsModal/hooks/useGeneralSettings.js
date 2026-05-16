import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../../config';
import { fetchWithAuth } from '../../../AuthContext';

export const INITIAL_FORM_STATE = {
    CLIENT_NAME: '',
    WA_BUSINESS_ACCOUNT_ID: '',
    WA_PHONE_NUMBER_ID: '',
    WA_ACCESS_TOKEN: '',
    WA_PIN: '',
    CHATWOOT_API_URL: '',
    CHATWOOT_ACCOUNT_ID: '',
    CHATWOOT_SELECTED_INBOX_ID: '',
    CHATWOOT_API_TOKEN: '',
    META_RETURN_CONFIG: '',
    APP_NAME: '',
    APP_LOGO: '',
    APP_LOGO_SIZE: 'medium',
    AI_MEMORY_ENABLED: false,
    AGENT_MEMORY_WEBHOOK_URL: '',
    MANYCHAT_API_KEY: ''
};

export function useGeneralSettings(activeClient, refreshClients) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState(INITIAL_FORM_STATE);
    const [isUploading, setIsUploading] = useState(false);
    const [testingWebhook, setTestingWebhook] = useState(false);

    const loadSettings = async (fetchAgents) => {
        if (!activeClient) return;
        setLoading(true);
        try {
            const res = await fetchWithAuth(`${API_URL}/settings/`, {}, activeClient.id);
            if (res.ok) {
                const data = await res.json();
                setFormData({
                    ...INITIAL_FORM_STATE,
                    ...data,
                    CLIENT_NAME: data.CLIENT_NAME || activeClient.name
                });
                if (data.CHATWOOT_API_TOKEN && fetchAgents) fetchAgents();
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
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ 
            ...prev, 
            [name]: type === 'checkbox' ? checked : value 
        }));
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            toast.error("Por favor, selecione um arquivo de imagem.");
            return;
        }
        setIsUploading(true);
        const loadingToast = toast.loading("Fazendo upload da logo...");
        try {
            const fData = new FormData();
            fData.append('file', file);
            const res = await fetchWithAuth(`${API_URL}/upload`, {
                method: 'POST',
                body: fData
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
            toast.error(error.message || "Erro ao fazer upload");
        } finally {
            setIsUploading(false);
            toast.dismiss(loadingToast);
        }
    };

    const handleTestWebhook = async () => {
        if (!activeClient || !formData.AGENT_MEMORY_WEBHOOK_URL) return;
        setTestingWebhook(true);
        const loadingToast = toast.loading("Enviando evento de teste...");
        try {
            const res = await fetchWithAuth(`${API_URL}/settings/test-memory-webhook`, {
                method: 'POST',
                body: JSON.stringify({ url: formData.AGENT_MEMORY_WEBHOOK_URL })
            }, activeClient.id);
            const result = await res.json();
            if (result.success) {
                toast.success(`Sucesso! Status: ${result.status}`, { id: loadingToast });
            } else {
                let errorMsg = `Falha no teste: ${result.status}`;
                if (result.response_body) {
                    errorMsg += `\nResposta: ${result.response_body.substring(0, 150)}`;
                } else if (result.error) {
                    errorMsg += `\nErro: ${result.error}`;
                }
                toast.error(errorMsg, { id: loadingToast, duration: 8000 });
            }
        } catch (error) {
            toast.error("Erro de conexão", { id: loadingToast });
        } finally {
            setTestingWebhook(false);
        }
    };

    return {
        loading, setLoading,
        formData, setFormData,
        isUploading,
        testingWebhook,
        loadSettings,
        handleChange,
        handleLogoUpload,
        handleTestWebhook
    };
}
