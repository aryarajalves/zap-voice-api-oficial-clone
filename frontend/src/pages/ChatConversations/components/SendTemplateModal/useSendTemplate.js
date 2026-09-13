import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../../../config';
import { getFirstName } from './templateHelpers';

export function useSendTemplate({
  isOpen,
  onClose,
  activeClient,
  selectedConvo,
  onSendSuccess
}) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [variables, setVariables] = useState({});
  const [funnels, setFunnels] = useState([]);
  const [selectedFunnelId, setSelectedFunnelId] = useState('');
  const [loadingFunnels, setLoadingFunnels] = useState(false);
  const [buttonActions, setButtonActions] = useState({});
  const [templateParams, setTemplateParams] = useState({});

  const contactName = selectedConvo?.contact_name || '';
  const contactFirstName = getFirstName(contactName);

  // Verifica se a janela de 24h está aberta
  const windowOpen = (() => {
    const lastAt = selectedConvo?.last_contact_message_at;
    if (!lastAt) return false;
    const diff = (Date.now() - new Date(lastAt).getTime()) / 1000;
    return diff <= 24 * 3600;
  })();

  const fetchTemplates = async () => {
    if (!activeClient?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/whatsapp/templates`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-Client-ID': String(activeClient.id)
        }
      });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data || []);
      } else {
        toast.error("Erro ao carregar templates do WhatsApp.");
      }
    } catch (err) {
      toast.error("Falha de conexão com a API.");
    } finally {
      setLoading(false);
    }
  };

  const fetchFunnels = async () => {
    if (!activeClient?.id) return;
    setLoadingFunnels(true);
    try {
      const res = await fetch(`${API_URL}/funnels?limit=200`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-Client-ID': String(activeClient.id)
        }
      });
      if (res.ok) {
        const data = await res.json();
        setFunnels((data || []).filter(f => !f.is_archived));
      }
    } catch (err) {
      // silencioso
    } finally {
      setLoadingFunnels(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeClient) {
      fetchTemplates();
      fetchFunnels();
    }
    if (!isOpen) {
      setSelectedTemplate(null);
      setVariables({});
      setSelectedFunnelId('');
      setButtonActions({});
      setTemplateParams({});
    }
  }, [isOpen, activeClient?.id]);

  const handleSelectTemplate = (tpl) => {
    setSelectedTemplate(tpl);
    setButtonActions({});
    setTemplateParams({});
    if (tpl && tpl.body_text) {
      const matches = tpl.body_text.match(/\{\{\d+\}\}/g) || [];
      const uniqueVars = [...new Set(matches.map(m => parseInt(m.replace(/[{}]/g, ''))))].sort((a, b) => a - b);
      const varsMap = {};
      uniqueVars.forEach((vNum, idx) => {
        if (idx === 0 && contactFirstName) {
          varsMap[vNum] = contactFirstName;
        } else {
          varsMap[vNum] = "";
        }
      });
      setVariables(varsMap);
    } else {
      setVariables({});
    }
  };

  const handleVariableChange = (vNum, value) => {
    setVariables(prev => ({ ...prev, [vNum]: value }));
  };

  const handleButtonActionChange = (btnText, field, value) => {
    setButtonActions(prev => ({
      ...prev,
      [btnText]: {
        ...prev[btnText],
        [field]: value,
        ...(field === 'type' ? { funnel_id: null } : {})
      }
    }));
  };

  const handleParamChange = (paramKey, value) => {
    setTemplateParams(prev => ({ ...prev, [paramKey]: value }));
  };

  // Gera preview com variáveis substituídas
  const getPreviewWithVars = () => {
    if (!selectedTemplate?.body_text) return '';
    let text = selectedTemplate.body_text;
    Object.keys(variables).forEach(vNum => {
      const val = variables[vNum];
      text = text.replace(new RegExp(`\\{\\{${vNum}\\}\\}`, 'g'), val ? `*${val}*` : `{{${vNum}}}`);
    });
    return text;
  };

  // Extrai botões do components do template
  const getTemplateButtons = () => {
    if (!selectedTemplate?.components) return [];
    const btnComp = selectedTemplate.components.find(c => (c.type || '').toUpperCase() === 'BUTTONS');
    return btnComp?.buttons || [];
  };

  const handleSend = async () => {
    if (!selectedTemplate) return;

    const emptyVars = Object.keys(variables).filter(k => !variables[k]?.trim());
    if (emptyVars.length > 0) {
      toast.error(`Preencha todas as variáveis antes de enviar.`);
      return;
    }

    const headerComp = selectedTemplate.components?.find(c => (c.type || '').toUpperCase() === 'HEADER');
    const headerFormat = (headerComp?.format || '').toUpperCase();
    const hasMediaHeader = ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerFormat);

    if (hasMediaHeader && !templateParams['HEADER_0']) {
      toast.error(`Selecione uma mídia para o cabeçalho (${headerFormat}) antes de enviar.`);
      return;
    }

    const components = [];

    if (hasMediaHeader && templateParams['HEADER_0']) {
      const mediaUrl = templateParams['HEADER_0'];
      const paramType = headerFormat.toLowerCase();
      components.push({
        type: "header",
        parameters: [
          {
            type: paramType,
            [paramType]: { link: mediaUrl }
          }
        ]
      });
    }

    const bodyParams = Object.keys(variables)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .map(k => ({ type: "text", text: variables[k] }));

    if (bodyParams.length > 0) {
      components.push({ type: "body", parameters: bodyParams });
    }

    const finalButtonActions = {};
    Object.entries(buttonActions).forEach(([btnText, cfg]) => {
      if (cfg.type && cfg.type !== 'none') {
        finalButtonActions[btnText] = {
          type: cfg.type,
          ...(cfg.funnel_id ? { funnel_id: parseInt(cfg.funnel_id) } : {})
        };
      }
    });

    const toastId = toast.loading('Enviando template...');
    try {
      const res = await fetch(`${API_URL}/chat/conversations/${selectedConvo.id}/template`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-Client-ID': String(activeClient.id)
        },
        body: JSON.stringify({
          template_name: selectedTemplate.name,
          language: selectedTemplate.language || 'pt_BR',
          components: components,
          ...(Object.keys(finalButtonActions).length > 0 ? { button_actions: finalButtonActions } : {})
        })
      });

      if (res.ok) {
        const sentMsg = await res.json();
        if (sentMsg.sent_as_text) {
          toast.success('✉️ Enviado como mensagem gratuita (janela aberta)!', { id: toastId });
        } else {
          toast.success('📨 Template HSM enviado!', { id: toastId });
        }
        onSendSuccess?.(sentMsg);

        if (selectedFunnelId) {
          try {
            const params = new URLSearchParams({
              conversation_id: String(selectedConvo.id),
              contact_name: contactName || '',
              contact_phone: selectedConvo.phone || ''
            });
            await fetch(`${API_URL}/funnels/${selectedFunnelId}/trigger?${params.toString()}`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'X-Client-ID': String(activeClient.id)
              }
            });
            const funnelName = funnels.find(f => String(f.id) === String(selectedFunnelId))?.name || 'funil';
            toast.success(`Funil "${funnelName}" disparado!`);
          } catch (fErr) {
            toast.error('Template enviado, mas falha ao disparar o funil.');
          }
        }

        onClose?.();
      } else {
        const errData = await res.json();
        throw new Error(errData.detail || 'Erro ao enviar template.');
      }
    } catch (err) {
      toast.error(err.message || 'Erro ao enviar.', { id: toastId });
    }
  };

  return {
    templates,
    loading,
    selectedTemplate,
    setSelectedTemplate,
    variables,
    funnels,
    selectedFunnelId,
    setSelectedFunnelId,
    loadingFunnels,
    buttonActions,
    templateParams,
    contactName,
    contactFirstName,
    windowOpen,
    handleSelectTemplate,
    handleVariableChange,
    handleButtonActionChange,
    handleParamChange,
    getPreviewWithVars,
    getTemplateButtons,
    handleSend
  };
}
