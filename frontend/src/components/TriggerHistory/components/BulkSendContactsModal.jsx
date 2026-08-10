import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { fetchWithAuth } from '../../../AuthContext';
import { API_URL } from '../../../config';
import SearchableSelect from '../../BulkSender/common/SearchableSelect';
import TemplatePreview from '../../BulkSender/common/TemplatePreview';
import MediaHeaderUploader from '../../BulkSender/common/MediaHeaderUploader';
import { buildComponentsPayload } from '../../BulkSender/utils/payloadBuilder';

const BulkSendContactsModal = ({ isOpen, onClose, selectedPhones, clientId, triggerId, onSuccess }) => {
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

    const extractTemplateVariables = (templateObj) => {
        if (!templateObj) return [];
        const vars = [];
        
        // 1. Mídia no cabeçalho (IMAGE, VIDEO, DOCUMENT)
        const headerComp = templateObj.components?.find(c => c.type === 'HEADER');
        if (headerComp && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerComp.format)) {
            let mediaTypeLabel = 'Arquivo';
            if (headerComp.format === 'IMAGE') mediaTypeLabel = 'Imagem';
            else if (headerComp.format === 'VIDEO') mediaTypeLabel = 'Vídeo';
            else if (headerComp.format === 'DOCUMENT') mediaTypeLabel = 'Documento';

            vars.push({
                key: 'HEADER_0',
                label: `Link do Cabeçalho (${mediaTypeLabel})`,
                isMedia: true,
                format: headerComp.format
            });
        }
        
        // 2. Variáveis do Corpo
        const bodyComp = templateObj.components?.find(c => c.type === 'BODY');
        if (bodyComp && bodyComp.text) {
            const matches = bodyComp.text.match(/\{\{\d+\}\}/g);
            if (matches) {
                const uniqueMatches = [...new Set(matches)];
                uniqueMatches.forEach(match => {
                    vars.push({
                        key: `BODY_${parseInt(match.replace(/[{}]/g, '')) - 1}`,
                        label: `Variável do Corpo ${match}`
                    });
                });
            }
        }

        // 3. Variáveis do Botão (URL dinâmica)
        const buttonsComp = templateObj.components?.find(c => c.type === 'BUTTONS');
        if (buttonsComp?.buttons) {
            buttonsComp.buttons.forEach((btn, idx) => {
                if (btn.type === 'URL' && btn.url?.includes('{{1}}')) {
                    vars.push({
                        key: `BUTTONS_${idx}`,
                        label: `Variável do Botão ${idx + 1} (${btn.text || ''})`
                    });
                }
            });
        }
        
        return vars;
    };

    const extractTemplateButtons = (templateObj) => {
        if (!templateObj?.components) return [];
        const buttonsComp = templateObj.components.find(c => c.type === 'BUTTONS');
        if (!buttonsComp?.buttons) return [];
        return buttonsComp.buttons
            .filter(b => b.type !== 'URL' && b.type !== 'PHONE')
            .map((b, idx) => ({ text: b.text, index: idx }))
            .filter(b => b.text);
    };

    const variables = extractTemplateVariables(selectedTemplate);
    const templateButtons = extractTemplateButtons(selectedTemplate);

    const handleParamChange = (key, val) => {
        setTemplateParams(prev => ({ ...prev, [key]: val }));
    };

    const handleButtonActionChange = (btnIndex, field, val) => {
        setButtonActions(prev => {
            const current = prev[btnIndex] || {};
            const next = { ...current, [field]: val };
            // Remove a entrada se limpo
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

    if (!isOpen) return null;

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

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-70 backdrop-blur-sm animated-fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col" style={{ userSelect: 'none', cursor: 'default' }}>
                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
                    <div>
                        <h3 className="font-black text-white text-lg tracking-wide uppercase">Disparo em Massa</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                            Disparando para {selectedPhones.length} contatos selecionados
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition p-2 hover:bg-white/5 rounded-2xl"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-950/20">
                    {/* Left Column: Config */}
                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                                Escolha o Template
                            </label>
                            {isLoadingTemplates ? (
                                <div className="text-xs text-slate-500 font-bold uppercase tracking-widest animate-pulse">Carregando templates...</div>
                            ) : (
                                <SearchableSelect
                                    options={selectOptions}
                                    value={selectedTemplateName}
                                    onChange={(val) => {
                                        setSelectedTemplateName(val);
                                        setTemplateParams({});
                                        setButtonActions({});
                                    }}
                                    placeholder="SELECIONE UM TEMPLATE"
                                />
                            )}
                        </div>

                        {/* Agendamento */}
                        {selectedTemplate && (
                            <div className="space-y-4 border-t border-slate-800/60 pt-4">
                                <label className="flex items-center gap-3 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        className="rounded border-slate-850 text-blue-600 focus:ring-blue-500/20 w-4 h-4 bg-black/40 transition-all cursor-pointer"
                                        checked={isScheduleEnabled}
                                        onChange={(e) => {
                                            setIsScheduleEnabled(e.target.checked);
                                            if (!e.target.checked) setScheduledTime('');
                                        }}
                                    />
                                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                                        Agendar este disparo?
                                    </span>
                                </label>

                                {isScheduleEnabled && (
                                    <div className="space-y-2 animated-fade-in">
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                            Data e Hora do Disparo
                                        </label>
                                        <input
                                            type="datetime-local"
                                            className="w-full p-3 bg-black/40 border border-slate-800 rounded-2xl focus:border-blue-500/50 outline-none text-white text-xs font-bold transition-all shadow-inner"
                                            value={scheduledTime}
                                            onChange={(e) => setScheduledTime(e.target.value)}
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {selectedTemplate && templateButtons.length > 0 && (
                            <div className="space-y-4 border-t border-slate-800/60 pt-4">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                                    Ações dos Botões
                                </h4>
                                {templateButtons.map(btn => {
                                    const action = buttonActions[btn.index] || {};
                                    return (
                                        <div key={btn.index} className="p-4 bg-slate-950/30 border border-slate-800/60 rounded-2xl space-y-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-black text-white uppercase tracking-wider">
                                                    Botão: {btn.text}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">
                                                        Tipo de Ação
                                                    </label>
                                                    <SearchableSelect
                                                        options={[
                                                            { label: 'NENHUMA AÇÃO', value: '' },
                                                            { label: 'FUNIL DE INTERAÇÃO', value: 'interaction' },
                                                            { label: 'FUNIL DE BLOQUEIO', value: 'block' }
                                                        ]}
                                                        value={action.type || ''}
                                                        onChange={(val) => handleButtonActionChange(btn.index, 'type', val)}
                                                        placeholder="NENHUMA AÇÃO"
                                                    />
                                                </div>
                                                {action.type && (
                                                    <div>
                                                        <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">
                                                            Funil Iniciado
                                                        </label>
                                                        <SearchableSelect
                                                            options={funnelOptions}
                                                            value={action.funnel_id || ''}
                                                            onChange={(val) => handleButtonActionChange(btn.index, 'funnel_id', val)}
                                                            placeholder="ESCOLHA O FUNIL"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {selectedTemplate && variables.length > 0 && (
                            <div className="space-y-4 border-t border-slate-800/60 pt-4">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                                    Preencha as Variáveis
                                </h4>
                                {variables.map(v => {
                                    if (v.isMedia) {
                                        return (
                                            <MediaHeaderUploader
                                                key={v.key}
                                                format={v.format}
                                                templateParams={templateParams}
                                                handleParamChange={handleParamChange}
                                            />
                                        );
                                    }
                                    return (
                                        <div key={v.key} className="space-y-1">
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                                {v.label}
                                            </label>
                                            <input
                                                type="text"
                                                className="w-full p-3 bg-black/40 border border-slate-800 rounded-2xl focus:border-blue-500/50 outline-none text-white text-xs font-bold transition-all shadow-inner placeholder:text-slate-700"
                                                placeholder={`Digite o valor para ${v.label}`}
                                                value={templateParams[v.key] || ''}
                                                onChange={(e) => handleParamChange(v.key, e.target.value)}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Right Column: Preview */}
                    <div className="flex flex-col items-center justify-center border-t md:border-t-0 md:border-l border-slate-800/60 pt-6 md:pt-0 md:pl-6">
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-4 w-full text-left">
                            Visualização do Template
                        </label>
                        {selectedTemplate ? (
                            <TemplatePreview template={selectedTemplate} params={templateParams} />
                        ) : (
                            <div className="flex flex-col items-center justify-center text-center p-8 bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl w-full h-[300px]">
                                <span className="text-4xl mb-3">📱</span>
                                <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Selecione um template para visualizar a prévia</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-800 bg-slate-950/40 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 bg-slate-800 text-slate-300 rounded-2xl hover:bg-slate-700 hover:text-white transition text-xs font-bold uppercase tracking-widest"
                        disabled={isSending}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSend}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl transition text-xs font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20"
                        disabled={isSending || !selectedTemplate}
                    >
                        {isSending ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Enviando...
                            </>
                        ) : isScheduleEnabled ? (
                            'Agendar Disparo'
                        ) : (
                            'Enviar Disparo'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BulkSendContactsModal;
