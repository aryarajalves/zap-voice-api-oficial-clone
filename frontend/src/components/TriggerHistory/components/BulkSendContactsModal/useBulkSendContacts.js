import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { fetchWithAuth } from '../../../../AuthContext';
import { API_URL } from '../../../../config';
import { buildComponentsPayload } from '../../../BulkSender/utils/payloadBuilder';
import { extractTemplateVariables, extractTemplateButtons } from './templateVariableHelpers';

export function useBulkSendContacts({ isOpen, onClose, selectedPhones, clientId, triggerId, onSuccess }) {
  const [templates, setTemplates] = useState([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [selectedTemplateName, setSelectedTemplateName] = useState('');
  const [templateParams, setTemplateParams] = useState({});
  const [isSending, setIsSending] = useState(false);

  // Funnels & Scheduling State
  const [funnels, setFunnels] = useState([]);
  const [isLoadingFunnels, setIsLoadingFunnels] = useState(false);
  const [buttonActions, setButtonActions] = useState({});
  const [isScheduleEnabled, setIsScheduleEnabled] = useState(false);
  const [scheduledTime, setScheduledTime] = useState('');

  useEffect(() => {
    if (isOpen && clientId) {
      loadTemplates();
      loadFunnels();
    }
  }, [isOpen, clientId]);

  const loadTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/whatsapp/templates?include_paused=false`, {}, clientId);
      if (res.ok) {
        const data = await res.json();
        setTemplates(data || []);
      } else {
        setTemplates([]);
        toast.error('Não foi possível carregar os templates.');
      }
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
      setTemplates([]);
      toast.error('Erro de conexão ao carregar templates.');
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const loadFunnels = async () => {
    setIsLoadingFunnels(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/funnels`, {}, clientId);
      if (res.ok) {
        const data = await res.json();
        setFunnels(data || []);
      } else {
        setFunnels([]);
      }
    } catch (error) {
      console.error('Erro ao carregar funis:', error);
      setFunnels([]);
    } finally {
      setIsLoadingFunnels(false);
    }
  };

  const selectedTemplate = templates.find(t => t.name === selectedTemplateName);
  const variables = extractTemplateVariables(selectedTemplate);
  const templateButtons = extractTemplateButtons(selectedTemplate);

  const handleParamChange = (key, val) => {
    setTemplateParams(prev => ({ ...prev, [key]: val }));
  };

  const handleButtonActionChange = (btnIndex, field, val) => {
    setButtonActions(prev => {
      const current = prev[btnIndex] || {};
      const next = { ...current, [field]: val };
      if (!next.funnel_id && !next.type) {
        const updated = { ...prev };
        delete updated[btnIndex];
        return updated;
      }
      return { ...prev, [btnIndex]: next };
    });
  };

  const handleSend = async () => {
    if (!selectedTemplate) {
      return toast.error('Selecione um template.');
    }

    // Validar variáveis obrigatórias
    const missingVars = [];
    variables.forEach(v => {
      if (templateParams[v.key] === undefined || templateParams[v.key] === null || String(templateParams[v.key]).trim() === '') {
        missingVars.push(v.label);
      }
    });

    if (missingVars.length > 0) {
      return toast.error(`Preencha todas as variáveis: ${missingVars.join(', ')}`);
    }

    if (isScheduleEnabled && !scheduledTime) {
      return toast.error('Defina a data e hora do agendamento.');
    }

    setIsSending(true);
    try {
      const payload = {
        contacts_list: selectedPhones.map(phone => ({
          phone: phone,
          name: phone,
          components: buildComponentsPayload(selectedTemplate, templateParams)
        })),
        exclusion_list: [],
        delay_seconds: 1,
        concurrency_limit: 10,
        schedule_at: (isScheduleEnabled && scheduledTime) ? new Date(scheduledTime).toISOString() : new Date().toISOString(),
        chatwoot_label: [],
        template_name: selectedTemplateName,
        language: selectedTemplate.language || 'pt_BR',
        components: buildComponentsPayload(selectedTemplate, templateParams),
        private_message: null,
        private_message_delay: 15,
        private_message_concurrency: 1,
        button_actions: Object.keys(buttonActions).length > 0 ? buttonActions : null,
        remove_failures_from_trigger_id: triggerId || null
      };

      const res = await fetchWithAuth(`${API_URL}/bulk-send/schedule`, {
        method: 'POST',
        body: JSON.stringify(payload)
      }, clientId);

      if (res.ok) {
        toast.success(scheduledTime ? 'Disparo em massa agendado com sucesso!' : 'Disparo em massa iniciado com sucesso!');
        if (onSuccess) onSuccess();
        onClose();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.detail || 'Erro ao agendar o disparo em massa.');
      }
    } catch (error) {
      console.error('Erro ao enviar:', error);
      toast.error('Erro de conexão ao enviar o disparo.');
    } finally {
      setIsSending(false);
    }
  };

  const selectOptions = templates.map(t => ({
    label: t.name,
    value: t.name
  }));

  const funnelOptions = [
    { label: 'NENHUM FUNIL', value: '' },
    ...funnels.map(f => ({
      label: f.name,
      value: f.id.toString()
    }))
  ];

  return {
    templates,
    isLoadingTemplates,
    selectedTemplateName,
    setSelectedTemplateName,
    templateParams,
    setTemplateParams,
    isSending,
    funnels,
    isLoadingFunnels,
    buttonActions,
    setButtonActions,
    isScheduleEnabled,
    setIsScheduleEnabled,
    scheduledTime,
    setScheduledTime,
    selectedTemplate,
    variables,
    templateButtons,
    selectOptions,
    funnelOptions,
    handleParamChange,
    handleButtonActionChange,
    handleSend
  };
}
