import React, { useEffect, useState } from 'react';
import { FiX, FiRefreshCw, FiBookOpen } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../config';
import MediaHeaderUploader from '../../components/BulkSender/common/MediaHeaderUploader';

// Subcomponentes e Helpers Modulares
import { getFirstName } from './components/SendTemplateModal/templateHelpers';
import TemplateVariablesSection from './components/SendTemplateModal/TemplateVariablesSection';
import TemplateButtonsConfigSection from './components/SendTemplateModal/TemplateButtonsConfigSection';
import TemplateFunnelTriggerSection from './components/SendTemplateModal/TemplateFunnelTriggerSection';

export default function SendTemplateModal({ isOpen, onClose, activeClient, selectedConvo, onSendSuccess }) {
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
  }, [isOpen, activeClient]);

  const fetchTemplates = async () => {
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

    const emptyVars = Object.keys(variables).filter(k => !variables[k].trim());
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
        onSendSuccess(sentMsg);

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

        onClose();
      } else {
        const errData = await res.json();
        throw new Error(errData.detail || 'Erro ao enviar template.');
      }
    } catch (err) {
      toast.error(err.message || 'Erro ao enviar.', { id: toastId });
    }
  };

  if (!isOpen) return null;

  const previewText = getPreviewWithVars();
  const templateButtons = getTemplateButtons();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2 text-white">
            <FiBookOpen className="text-blue-500" size={20} />
            <h3 className="text-base font-semibold">Enviar Template WhatsApp</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors cursor-pointer">
            <FiX size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-3">
              <FiRefreshCw className="animate-spin text-blue-500" size={24} />
              <span>Carregando templates...</span>
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              Nenhum template encontrado para esta conta.
            </div>
          ) : (
            <>
              {/* Seletor de template */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Template</label>
                <select
                  value={selectedTemplate?.name || ''}
                  onChange={(e) => {
                    const selected = templates.find(t => t.name === e.target.value);
                    handleSelectTemplate(selected || null);
                  }}
                  className="w-full bg-[#1e293b] border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                >
                  <option value="">Selecione um template...</option>
                  {templates.map(tpl => (
                    <option key={tpl.id || tpl.name} value={tpl.name}>
                      {tpl.name} ({tpl.language})
                    </option>
                  ))}
                </select>
              </div>

              {selectedTemplate && (
                <div className="space-y-4">
                  {/* Mídia do Cabeçalho (HEADER) */}
                  {(() => {
                    const headerComp = selectedTemplate.components?.find(c => (c.type || '').toUpperCase() === 'HEADER');
                    const format = (headerComp?.format || '').toUpperCase();
                    if (!['IMAGE', 'VIDEO', 'DOCUMENT'].includes(format)) return null;
                    return (
                      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                        <MediaHeaderUploader
                          format={format}
                          templateParams={templateParams}
                          handleParamChange={handleParamChange}
                        />
                      </div>
                    );
                  })()}

                  {/* Variáveis */}
                  <TemplateVariablesSection
                    variables={variables}
                    handleVariableChange={handleVariableChange}
                    contactName={contactName}
                    contactFirstName={contactFirstName}
                  />

                  {/* Preview */}
                  <div className="bg-[#0a0f1d] border border-white/5 rounded-xl p-4">
                    <div className="text-[10px] font-semibold text-gray-500 uppercase mb-2 tracking-wider">Pré-visualização</div>
                    <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed font-mono">
                      {previewText}
                    </div>
                  </div>

                  {/* Botões do Template */}
                  <TemplateButtonsConfigSection
                    templateButtons={templateButtons}
                    buttonActions={buttonActions}
                    handleButtonActionChange={handleButtonActionChange}
                    funnels={funnels}
                  />

                  {/* Disparar Funil */}
                  <TemplateFunnelTriggerSection
                    selectedFunnelId={selectedFunnelId}
                    setSelectedFunnelId={setSelectedFunnelId}
                    funnels={funnels}
                    loadingFunnels={loadingFunnels}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/5 bg-[#0a0f1d] flex items-center justify-between shrink-0">
          <div>
            {selectedTemplate && (
              windowOpen ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-[11px] font-medium text-green-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                  Mensagem Gratuita (Janela Aberta)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-[11px] font-medium text-yellow-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>
                  Custo de HSM (Janela Fechada)
                </span>
              )
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-white/10 text-white rounded-xl hover:bg-white/5 transition-colors text-sm font-medium cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleSend}
              disabled={!selectedTemplate}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none text-white rounded-xl transition-all text-sm font-medium shadow-lg shadow-blue-600/10 cursor-pointer"
            >
              Enviar Template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
