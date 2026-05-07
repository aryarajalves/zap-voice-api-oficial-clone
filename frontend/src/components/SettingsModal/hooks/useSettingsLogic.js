import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { API_URL, WS_URL } from '../../../config';
import { fetchWithAuth } from '../../../AuthContext';
import { useClient } from '../../../contexts/ClientContext';
import { useAuth } from '../../../AuthContext';

// Sub-hooks
import { useGeneralSettings } from './useGeneralSettings';
import { useWhatsAppSettings } from './useWhatsAppSettings';
import { useChatwootSettings } from './useChatwootSettings';
import { useDataManagement } from './useDataManagement';
import { useProfileSettings } from './useProfileSettings';

export const useSettingsLogic = (isOpen, onClose, onSaved) => {
    const { activeClient, refreshClients } = useClient();
    const { user } = useAuth();
    
    // Sub-hooks
    const general = useGeneralSettings(activeClient, refreshClients);
    const whatsapp = useWhatsAppSettings(activeClient);
    const chatwoot = useChatwootSettings(activeClient, general.formData);
    const dataMgmt = useDataManagement(activeClient);
    const profile = useProfileSettings();

    // UI States
    const [activeTab, setActiveTab] = useState('geral');
    const [visibleFields, setVisibleFields] = useState({});
    const [isSettingsGuideOpen, setIsSettingsGuideOpen] = useState(false);
    const [showContactsTable, setShowContactsTable] = useState(false);
    const [showMemoryLogsTable, setShowMemoryLogsTable] = useState(false);

    // Orchestration - Load Data
    useEffect(() => {
        if (isOpen) {
            general.loadSettings(chatwoot.fetchAgents);
            dataMgmt.fetchSyncedContacts();
            dataMgmt.fetchMemoryLogs();
            whatsapp.fetchWhatsAppProfile();
            chatwoot.fetchAgents();
            if (user) {
                profile.setProfileData({
                    email: user.email || '',
                    full_name: user.full_name || '',
                    password: ''
                });
            }
        }
    }, [isOpen]);

    // Handle pagination & Tab changes
    useEffect(() => {
        if (isOpen && activeTab === 'advanced') dataMgmt.fetchSyncedContacts();
    }, [dataMgmt.contactsPage, dataMgmt.contactsLimit]);

    useEffect(() => {
        if (isOpen && activeTab === 'advanced') dataMgmt.fetchMemoryLogs();
        if (isOpen && activeTab === 'chatwoot') chatwoot.fetchLabels();
    }, [dataMgmt.memoryLogsPage, dataMgmt.memoryLogsLimit, activeTab]);

    // WebSocket Realtime Sync
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
                        general.loadSettings(chatwoot.fetchAgents);
                    }
                } catch (e) {}
            };
        } catch (e) {}
        return () => ws?.close();
    }, [isOpen, activeClient?.id]);

    const handleRevealSetting = async (key) => {
        if (visibleFields[key]) {
            setVisibleFields(prev => ({ ...prev, [key]: false }));
            general.loadSettings(chatwoot.fetchAgents);
            return;
        }

        // Se o valor atual não estiver mascarado (não contiver '*'),
        // apenas alternamos a visibilidade sem buscar do banco.
        const currentValue = general.formData[key];
        if (typeof currentValue === 'string' && !currentValue.includes('*')) {
            setVisibleFields(prev => ({ ...prev, [key]: true }));
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
                general.setFormData(prev => ({ ...prev, [key]: data.value }));
                setVisibleFields(prev => ({ ...prev, [key]: true }));
                if (key === 'CHATWOOT_API_TOKEN') setTimeout(() => chatwoot.fetchAgents(), 500);
            }
        } catch (error) {
            toast.error("Erro ao revelar configuração");
        }
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        general.setLoading(true);
        const settingsToSend = {};
        for (const [key, value] of Object.entries(general.formData)) {
            const isMasked = (typeof value === 'string') && (value.includes('*'));
            if (!isMasked) settingsToSend[key] = value;
        }

        console.log("[SettingsModal] Submitting settings:", { keys: Object.keys(settingsToSend), profileKeys: Object.keys(profile.profileData) });
        if (!activeClient) {
            console.error("[SettingsModal] Active client missing during submit");
            general.setLoading(false);
            return;
        }
        try {
            const pRes = await fetchWithAuth(`${API_URL}/auth/me`, {
                method: 'PUT',
                body: JSON.stringify(profile.profileData)
            });
            if (!pRes.ok) {
                const errData = await pRes.json();
                throw new Error(errData.detail || "Erro ao atualizar perfil");
            }
            if (activeClient && user?.role !== 'user') {
                const res = await fetchWithAuth(`${API_URL}/settings/`, {
                    method: 'POST',
                    body: JSON.stringify({ settings: settingsToSend })
                }, activeClient.id);
                if (!res.ok) throw new Error("Erro ao salvar configurações do cliente");
            }
            toast.success("Alterações salvas com sucesso!");
            if (activeClient && settingsToSend.CLIENT_NAME && settingsToSend.CLIENT_NAME !== activeClient.name) refreshClients();
            if (onSaved) onSaved();
            onClose();
        } catch (error) {
            console.error("[SettingsModal] Submit failed:", error);
            toast.error(error.message || "Erro ao salvar");
        } finally {
            console.log("[SettingsModal] Submit finished, resetting loading state");
            general.setLoading(false);
        }
    };

    return {
        activeClient, 
        user, 
        loading: general.loading, 
        formData: general.formData, 
        setFormData: general.setFormData, 
        profileData: profile.profileData, 
        activeTab, 
        setActiveTab, 
        visibleFields,
        ...whatsapp,
        ...chatwoot,
        ...dataMgmt,
        ...profile,
        testingWebhook: general.testingWebhook, 
        isSettingsGuideOpen, 
        setIsSettingsGuideOpen, 
        showContactsTable, 
        setShowContactsTable,
        showMemoryLogsTable, 
        setShowMemoryLogsTable,
        handleChange: general.handleChange, 
        handleProfileChange: profile.handleProfileChange, 
        handleLogoUpload: general.handleLogoUpload, 
        handleRevealSetting, 
        handleTestWebhook: general.handleTestWebhook, 
        handleSubmit
    };
};
