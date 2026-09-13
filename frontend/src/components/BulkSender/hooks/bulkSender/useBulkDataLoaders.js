import { useState } from 'react';
import { fetchWithAuth } from '../../../../AuthContext';
import { API_URL } from '../../../../config';

export function useBulkDataLoaders({ activeClient }) {
    const [templates, setTemplates] = useState([]);
    const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
    const [chatwootLabels, setChatwootLabels] = useState([]);
    const [isLoadingChatwootLabels, setIsLoadingChatwootLabels] = useState(false);
    const [funnels, setFunnels] = useState([]);
    const [isLoadingFunnels, setIsLoadingFunnels] = useState(false);
    const [whatsappProfile, setWhatsappProfile] = useState(null);

    const loadTemplates = async () => {
        if (!activeClient) return;
        setIsLoadingTemplates(true);
        try {
            const res = await fetchWithAuth(`${API_URL}/whatsapp/templates?include_paused=false`, {}, activeClient.id);
            if (res.ok) {
                const data = await res.json();
                setTemplates(data || []);
            } else {
                setTemplates([]);
            }
        } catch (error) {
            console.error("Erro ao carregar templates:", error);
            setTemplates([]);
        } finally {
            setIsLoadingTemplates(false);
        }
    };

    const loadChatwootLabels = async () => {
        setChatwootLabels([]);
    };

    const loadFunnels = async () => {
        if (!activeClient) return;
        setIsLoadingFunnels(true);
        try {
            const res = await fetchWithAuth(`${API_URL}/funnels`, {}, activeClient.id);
            if (res.ok) {
                const data = await res.json();
                setFunnels(data || []);
            } else {
                setFunnels([]);
            }
        } catch (error) {
            console.error("Erro ao carregar funis:", error);
            setFunnels([]);
        } finally {
            setIsLoadingFunnels(false);
        }
    };

    const loadWhatsAppProfile = async () => {
        if (!activeClient) return;
        try {
            const res = await fetchWithAuth(`${API_URL}/whatsapp/profile`, {}, activeClient.id);
            if (res.ok) {
                const data = await res.json();
                setWhatsappProfile(data || null);
            }
        } catch (error) {
            console.error("Erro ao carregar perfil do WhatsApp:", error);
        }
    };

    return {
        templates, setTemplates, isLoadingTemplates,
        chatwootLabels, setChatwootLabels, isLoadingChatwootLabels,
        funnels, setFunnels, isLoadingFunnels,
        whatsappProfile, setWhatsappProfile,
        loadTemplates,
        loadChatwootLabels,
        loadFunnels,
        loadWhatsAppProfile
    };
}
