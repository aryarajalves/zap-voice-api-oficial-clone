import { useState, useEffect } from 'react';
import { API_URL } from '../../../config';
import { fetchWithAuth } from '../../../AuthContext';

export function useWhatsAppTabData({ activeClient, formData, handleChange }) {
    const [templates, setTemplates] = useState([]);
    const [availableLabels, setAvailableLabels] = useState([]);
    const [funnels, setFunnels] = useState([]);
    const [appointmentParams, setAppointmentParams] = useState({});
    const [buttonActions, setButtonActions] = useState({});

    // Carregar Templates Oficiais da Meta
    useEffect(() => {
        const fetchTemplates = async () => {
            if (!activeClient) return;
            try {
                const res = await fetchWithAuth(`${API_URL}/whatsapp/templates?include_paused=false`, {}, activeClient.id);
                if (res.ok) {
                    const data = await res.json();
                    setTemplates(data || []);
                }
            } catch (err) {
                console.error("Erro ao buscar templates em useWhatsAppTabData:", err);
            }
        };
        fetchTemplates();
    }, [activeClient]);

    // Carregar Etiquetas Disponíveis
    useEffect(() => {
        const fetchAllLabels = async () => {
            if (!activeClient) return;
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${API_URL}/chat/labels/details`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'X-Client-ID': String(activeClient.id)
                    }
                });
                if (res.ok) {
                    const data = await res.json();
                    setAvailableLabels(data);
                }
            } catch (err) {
                console.error("Erro ao buscar etiquetas em useWhatsAppTabData:", err);
            }
        };
        fetchAllLabels();
    }, [activeClient]);

    // Carregar Funis
    useEffect(() => {
        const fetchFunnels = async () => {
            if (!activeClient) return;
            try {
                const res = await fetchWithAuth(`${API_URL}/funnels`, {}, activeClient.id);
                if (res.ok) {
                    const data = await res.json();
                    setFunnels(data || []);
                }
            } catch (err) {
                console.error("Erro ao buscar funis em useWhatsAppTabData:", err);
            }
        };
        fetchFunnels();
    }, [activeClient]);

    // Sincronizar parâmetros de lembretes
    useEffect(() => {
        if (formData.APPOINTMENTS_REMINDER_PARAMS) {
            try {
                setAppointmentParams(JSON.parse(formData.APPOINTMENTS_REMINDER_PARAMS));
            } catch {
                setAppointmentParams({});
            }
        } else {
            setAppointmentParams({});
        }
    }, [formData.APPOINTMENTS_REMINDER_TEMPLATE, formData.APPOINTMENTS_REMINDER_PARAMS]);

    // Sincronizar ações de botões
    useEffect(() => {
        if (formData.APPOINTMENTS_REMINDER_BUTTONS) {
            try {
                setButtonActions(JSON.parse(formData.APPOINTMENTS_REMINDER_BUTTONS));
            } catch {
                setButtonActions({});
            }
        } else {
            setButtonActions({});
        }
    }, [formData.APPOINTMENTS_REMINDER_TEMPLATE, formData.APPOINTMENTS_REMINDER_BUTTONS]);

    // Auto-preencher variáveis padrão do template selecionado
    useEffect(() => {
        if (!formData.APPOINTMENTS_REMINDER_TEMPLATE || templates.length === 0) return;
        const selectedTemplateObj = templates.find(t => t.name === formData.APPOINTMENTS_REMINDER_TEMPLATE);
        if (!selectedTemplateObj) return;

        const headerComp = selectedTemplateObj.components?.find(c => c.type === 'HEADER');
        const bodyComp = selectedTemplateObj.components?.find(c => c.type === 'BODY');

        const getVariables = (text) => {
            if (!text) return [];
            const matches = [...text.matchAll(/\{\{(\d+)\}\}/g)];
            return matches.map(m => m[1]);
        };

        const headerTextVars = headerComp && headerComp.text ? getVariables(headerComp.text) : [];
        const bodyTextVars = bodyComp && bodyComp.text ? getVariables(bodyComp.text) : [];

        let currentParams = {};
        if (formData.APPOINTMENTS_REMINDER_PARAMS) {
            try {
                currentParams = JSON.parse(formData.APPOINTMENTS_REMINDER_PARAMS);
            } catch {
                currentParams = {};
            }
        }

        let changed = false;
        headerTextVars.forEach(vNum => {
            const key = `HEADER_${vNum}`;
            if (currentParams[key] === undefined) {
                currentParams[key] = '{name}';
                changed = true;
            }
        });

        bodyTextVars.forEach(vNum => {
            const key = `BODY_${vNum}`;
            if (currentParams[key] === undefined) {
                currentParams[key] = '{name}';
                changed = true;
            }
        });

        if (changed) {
            handleChange({ target: { name: 'APPOINTMENTS_REMINDER_PARAMS', value: JSON.stringify(currentParams) } });
        }
    }, [formData.APPOINTMENTS_REMINDER_TEMPLATE, templates, formData.APPOINTMENTS_REMINDER_PARAMS]);

    const handleParamChange = (key, value) => {
        const updated = { ...appointmentParams, [key]: value };
        setAppointmentParams(updated);
        handleChange({ target: { name: 'APPOINTMENTS_REMINDER_PARAMS', value: JSON.stringify(updated) } });
    };

    const handleButtonActionChange = (btnText, newAction) => {
        const updated = { ...buttonActions, [btnText]: newAction };
        setButtonActions(updated);
        handleChange({ target: { name: 'APPOINTMENTS_REMINDER_BUTTONS', value: JSON.stringify(updated) } });
    };

    return {
        templates,
        availableLabels,
        funnels,
        appointmentParams,
        buttonActions,
        handleParamChange,
        handleButtonActionChange
    };
}
