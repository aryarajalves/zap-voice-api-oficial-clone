import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../../config';
import { fetchWithAuth } from '../../../AuthContext';

export function useWhatsAppSettings(activeClient) {
    const [whatsappProfile, setWhatsappProfile] = useState(null);
    const [whatsappAbout, setWhatsappAbout] = useState("");
    const [whatsappName, setWhatsappName] = useState("");
    const [isUpdatingWaLogo, setIsUpdatingWaLogo] = useState(false);
    const [isUpdatingWaAbout, setIsUpdatingWaAbout] = useState(false);
    const [isUpdatingWaName, setIsUpdatingWaName] = useState(false);
    const [isRegisteringWa, setIsRegisteringWa] = useState(false);

    const fetchWhatsAppProfile = async () => {
        if (!activeClient) return;
        try {
            const res = await fetchWithAuth(`${API_URL}/whatsapp/profile`, {}, activeClient.id);
            if (res.ok) {
                const data = await res.json();
                if (!data.error) {
                    setWhatsappProfile(data);
                    setWhatsappAbout(data.about || "");
                    setWhatsappName(data.verified_name || "");
                } else {
                    setWhatsappProfile(null);
                }
            }
        } catch (error) {
            console.error("Erro ao buscar perfil do WhatsApp:", error);
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
            const fData = new FormData();
            fData.append('file', file);
            const res = await fetchWithAuth(`${API_URL}/whatsapp/profile-picture`, {
                method: 'POST',
                body: fData
            }, activeClient?.id);
            if (res.ok) {
                toast.success("Foto de perfil do WhatsApp atualizada!");
                fetchWhatsAppProfile();
            } else {
                const err = await res.json();
                throw new Error(err.detail || "Erro ao atualizar foto");
            }
        } catch (error) {
            toast.error(error.message || "Erro ao atualizar foto do WhatsApp");
        } finally {
            setIsUpdatingWaLogo(false);
            toast.dismiss(loadingToast);
        }
    };

    const handleUpdateWhatsAppAbout = async () => {
        if (!whatsappAbout) return;
        setIsUpdatingWaAbout(true);
        try {
            const res = await fetchWithAuth(`${API_URL}/whatsapp/profile`, {
                method: 'POST',
                body: JSON.stringify({ about: whatsappAbout })
            }, activeClient?.id);
            if (res.ok) {
                toast.success("Recado atualizado!");
                fetchWhatsAppProfile();
            } else {
                toast.error("Erro ao atualizar recado");
            }
        } catch (error) {
            toast.error("Erro na conexão");
        } finally {
            setIsUpdatingWaAbout(false);
        }
    };

    const handleUpdateWhatsAppName = async () => {
        if (!whatsappName) return;
        setIsUpdatingWaName(true);
        try {
            const response = await fetchWithAuth(`${API_URL}/whatsapp/profile-name`, {
                method: 'POST',
                body: JSON.stringify({ display_name: whatsappName })
            }, activeClient?.id);
            if (response.ok) {
                toast.success("Solicitação enviada para a Meta!");
                fetchWhatsAppProfile();
            } else {
                const res = await response.json();
                toast.error(res.detail || "Erro ao atualizar nome");
            }
        } catch (error) {
            toast.error("Erro na conexão");
        } finally {
            setIsUpdatingWaName(false);
        }
    };

    const handleRegisterWhatsAppNumber = async () => {
        setIsRegisteringWa(true);
        try {
            const response = await fetchWithAuth(`${API_URL}/whatsapp/register-number`, {
                method: 'POST'
            }, activeClient?.id);
            const res = await response.json();
            if (response.ok && res.success !== false) {
                toast.success("Número registrado e certificado ativado!");
                fetchWhatsAppProfile();
            } else {
                toast.error(res.error || res.detail || "Erro ao ativar certificado");
            }
        } catch (error) {
            toast.error("Erro na conexão");
        } finally {
            setIsRegisteringWa(false);
        }
    };

    return {
        whatsappProfile, whatsappAbout, setWhatsappAbout, whatsappName, setWhatsappName,
        isUpdatingWaLogo, isUpdatingWaAbout, isUpdatingWaName, isRegisteringWa,
        fetchWhatsAppProfile, handleWhatsAppLogoUpload, handleUpdateWhatsAppAbout,
        handleUpdateWhatsAppName, handleRegisterWhatsAppNumber
    };
}
