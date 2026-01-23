import React, { useState, useEffect } from 'react';
import { API_URL, WS_URL } from '../config';
import { toast } from 'react-hot-toast';
import { fetchWithAuth } from '../AuthContext';
import { useClient } from '../contexts/ClientContext';
import CancelBulkModal from './CancelBulkModal';
import RecipientSelector from './RecipientSelector';
import useScrollLock from '../hooks/useScrollLock';

const TemplateBulkSender = ({ onSuccess, refreshKey }) => {
    const { activeClient } = useClient();
    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [selectedTemplateObj, setSelectedTemplateObj] = useState(null);
    const [templateParams, setTemplateParams] = useState({});

    // Modal state for viewing lists
    const [viewingListType, setViewingListType] = useState(null); // 'main' or 'exclusion'
    useScrollLock(viewingListType !== null);

    // Validation Helper
    const validateParams = () => {
        if (!selectedTemplateObj) return false;

        // 1. Header Validation
        const headerComp = selectedTemplateObj.components.find(c => c.type.toUpperCase() === 'HEADER');
        if (headerComp) {
            const format = (headerComp.format || '').toUpperCase();
            if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(format)) {
                if (!templateParams['header_url']) {
                    toast.error(`O template exige uma URL para o cabeçalho (${format})`);
                    return false;
                }
            }
            if (format === 'TEXT' && headerComp.text && headerComp.text.includes('{{1}}')) {
                if (!templateParams['header_text_1']) {
                    toast.error('O template exige um texto para a variável do cabeçalho {{1}}');
                    return false;
                }
            }
        }

        // 2. Body Validation
        const bodyComp = selectedTemplateObj.components.find(c => c.type.toUpperCase() === 'BODY');
        if (bodyComp && bodyComp.text) {
            const matches = bodyComp.text.match(/\{\{(\d+)\}\}/g);
            if (matches) {
                const uniqueVars = [...new Set(matches)];
                for (const v of uniqueVars) {
                    const key = `body_${v.replace(/\D/g, '')}`;
                    if (!templateParams[key]) {
                        toast.error(`Preencha o valor da variável ${v} do corpo da mensagem`);
                        return false;
                    }
                }
            }
        }
        return true;
    };

    // Helper to build WhatsApp Component Payload
    const buildComponentsPayload = () => {
        if (!selectedTemplateObj) return [];
        const components = [];

        // 1. Handle Header
        const headerComp = selectedTemplateObj.components.find(c => c.type.toUpperCase() === 'HEADER');
        if (headerComp) {
            const params = [];
            const format = (headerComp.format || '').toUpperCase();

            if (format === 'IMAGE' && templateParams['header_url']) {
                params.push({ type: 'image', image: { link: templateParams['header_url'] } });
            } else if (format === 'VIDEO' && templateParams['header_url']) {
                params.push({ type: 'video', video: { link: templateParams['header_url'] } });
            } else if (format === 'DOCUMENT' && templateParams['header_url']) {
                params.push({ type: 'document', document: { link: templateParams['header_url'] } });
            } else if (format === 'TEXT' && templateParams['header_text_1']) {
                params.push({ type: 'text', text: templateParams['header_text_1'] });
            }

            if (params.length > 0) {
                components.push({
                    type: 'header',
                    parameters: params
                });
            }
        }

        // 2. Handle Body
        const bodyComp = selectedTemplateObj.components.find(c => c.type.toUpperCase() === 'BODY');
        if (bodyComp && bodyComp.text) {
            const matches = bodyComp.text.match(/\{\{(\d+)\}\}/g);
            if (matches) {
                const uniqueVars = [...new Set(matches)].sort();
                const params = uniqueVars.map(v => {
                    const num = v.replace(/\D/g, ''); // Fix: extract number for param mapping
                    return {
                        type: 'text',
                        text: templateParams[`body_${num}`] || ''
                    };
                });

                if (params.length > 0) {
                    components.push({
                        type: 'body',
                        parameters: params
                    });
                }
            }
        }

        return components;
    };

    // Main List State (Managed by RecipientSelector)
    const [mainList, setMainList] = useState([]);

    // Exclusion List State (Managed by RecipientSelector)
    const [exclusionList, setExclusionList] = useState([]);

    // Key to force reset of children
    const [formResetKey, setFormResetKey] = useState(0);

    const [sending, setSending] = useState(false);
    const [progress, setProgress] = useState({ sent: 0, total: 0, failed: 0, processed_contacts: [], pending_contacts: [] });

    // Configurações de Envio
    const [delaySeconds, setDelaySeconds] = useState(5);
    const [concurrency, setConcurrency] = useState(5);
    const [costPerUnit, setCostPerUnit] = useState(0.06);

    // Modal Confirmation State
    const [confirmModal, setConfirmModal] = useState({ open: false, type: null, title: '', message: '' });

    // Cancel Modal State
    const [cancelModalOpen, setCancelModalOpen] = useState(false);
    const [currentTriggerId, setCurrentTriggerId] = useState(null);
    const stopSendingRef = React.useRef(false);
    const [wsConnected, setWsConnected] = useState(false);

    // WebSocket Realtime Updates for Progress
    useEffect(() => {
        let ws;
        if (sending && currentTriggerId) {
            console.log("🔌 Conectando WebSocket de progresso...");
            try {
                ws = new WebSocket(`${WS_URL}/ws`);
                ws.onopen = () => {
                    console.log("🟢 WebSocket Conectado (Bulk Progress)");
                    setWsConnected(true);
                };
                ws.onmessage = (event) => {
                    try {
                        const payload = JSON.parse(event.data);
                        if (payload.event === "bulk_progress" && payload.data.trigger_id === currentTriggerId) {
                            setProgress({
                                sent: payload.data.sent,
                                total: payload.data.total,
                                failed: payload.data.failed,
                                processed_contacts: payload.data.processed_contacts || [],
                                pending_contacts: payload.data.pending_contacts || []
                            });

                            if (payload.data.status === 'completed' || payload.data.status === 'failed' || payload.data.status === 'cancelled') {
                                setSending(false);
                                if (payload.data.status === 'completed') {
                                    toast.success("Envio concluído com sucesso!");
                                }
                                if (onSuccess) onSuccess();
                            }
                        }
                    } catch (e) {
                        console.error("WS Parse Error", e);
                    }
                };
                ws.onerror = (e) => console.error("🔴 WS Error", e);
                ws.onclose = () => setWsConnected(false);
            } catch (e) {
                console.error("WS Connection Failed", e);
            }
        }
        return () => {
            if (ws) ws.close();
        };
    }, [sending, currentTriggerId, onSuccess]);

    // Helper to build WhatsApp Component Payload
    // (Existing buildComponentsPayload was above)

    // Modal Handlers (Only kept if needed, but RecipientSelector handles its own clear)
    // We can remove handleClearRequest and confirmClear if not used elsewhere.
    // They were used for manual inputs which are gone.
    // However, existing JSX below reference confirmModal. 
    // We will clean up confirmModal if it's unused, but for minimal diff we just leave state but remove handlers usage.

    // Helper to clean numbers
    const cleanNumbers = (text) => {
        if (!text) return [];
        return text
            .split(/[\n,;]+/)
            .map(s => s.replace(/\D/g, ''))
            .filter(s => s.length >= 8);
    };

    // Blocked List State
    const [blockedContacts, setBlockedContacts] = useState([]);
    const [checkingBlocked, setCheckingBlocked] = useState(false);

    // Derived: All Raw Contacts (From RecipientSelector)
    const allRawContacts = React.useMemo(() => {
        return mainList.map(c => c.phone);
    }, [mainList]);

    // Check for blocked contacts when raw list changes
    useEffect(() => {
        if (!activeClient || allRawContacts.length === 0) {
            setBlockedContacts([]);
            return;
        }

        const checkBlocked = async () => {
            setCheckingBlocked(true);
            try {
                const res = await fetchWithAuth(`${API_URL}/blocked/check_bulk`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phones: allRawContacts })
                }, activeClient.id);

                if (res.ok) {
                    const data = await res.json();
                    setBlockedContacts(data.blocked_phones || []);
                }
            } catch (err) {
                console.error("Error checking blocked contacts:", err);
            } finally {
                setCheckingBlocked(false);
            }
        };

        const timeoutId = setTimeout(checkBlocked, 500); // Debounce
        return () => clearTimeout(timeoutId);
    }, [allRawContacts, activeClient]);

    // Derived: All Exclusion Contacts (From RecipientSelector)
    const allExclusionContacts = React.useMemo(() => {
        return exclusionList.map(c => c.phone);
    }, [exclusionList]);

    // Derived: Final Contacts (Main - Exclusion - Blocked)
    const finalContacts = React.useMemo(() => {
        const exSet = new Set([...allExclusionContacts, ...blockedContacts]);
        if (exSet.size === 0) return allRawContacts;
        return allRawContacts.filter(c => !exSet.has(c));
    }, [allRawContacts, allExclusionContacts, blockedContacts]);


    useEffect(() => {
        if (!activeClient) return;

        fetchWithAuth(`${API_URL}/whatsapp/templates`, {}, activeClient.id)
            .then(res => {
                if (res.ok) return res.json();
                throw new Error("Falha ao carregar templates");
            })
            .then(data => {
                if (Array.isArray(data)) {
                    setTemplates(data);
                } else {
                    console.error("Templates format error:", data);
                    setTemplates([]);
                }
            })
            .catch(err => {
                console.error("Error loading templates:", err);
                setTemplates([]);
            });
    }, [activeClient, refreshKey]);

    // Check if WhatsApp is configured for current client
    const [isWhatsAppConfigured, setIsWhatsAppConfigured] = useState(false);

    useEffect(() => {
        if (!activeClient) return;

        const checkConfiguration = async () => {
            try {
                const res = await fetchWithAuth(`${API_URL}/settings/`, {}, activeClient.id);
                if (res.ok) {
                    const settings = await res.json();
                    // Check if essential WhatsApp settings are present
                    const hasConfig = settings.WA_ACCESS_TOKEN &&
                        settings.WA_BUSINESS_ACCOUNT_ID &&
                        settings.WA_PHONE_NUMBER_ID;
                    setIsWhatsAppConfigured(!!hasConfig);
                }
            } catch (err) {
                console.error('Erro ao verificar configurações:', err);
                setIsWhatsAppConfigured(false);
            }
        };

        checkConfiguration();
    }, [activeClient, refreshKey]);

    // File handlers removed as RecipientSelector handles them internally

    // Scheduling State
    const [isScheduled, setIsScheduled] = useState(false);
    const [scheduleDateTime, setScheduleDateTime] = useState('');

    const handleSend = async () => {
        if (!selectedTemplate) {
            toast.error('Selecione um template');
            return;
        }

        if (!validateParams()) {
            return;
        }

        if (finalContacts.length === 0) {
            toast.error('Nenhum contato para enviar');
            return;
        }

        setSending(true);

        // Define schedule time (now if not scheduled)
        const sendNow = !isScheduled;
        const scheduleAt = sendNow ? new Date().toISOString() : new Date(scheduleDateTime).toISOString();

        if (isScheduled && !scheduleDateTime) {
            toast.error('Selecione uma data e hora para o agendamento');
            setSending(false);
            return;
        }

        try {
            console.log(`📤 Enviando disparo ("${sendNow ? 'Imediato' : 'Agendado'}") para o servidor...`);

            const payload = {
                template_name: selectedTemplate,
                schedule_at: scheduleAt,
                contacts_list: finalContacts,
                delay_seconds: delaySeconds,
                concurrency_limit: concurrency,
                language: selectedTemplateObj?.language || 'pt_BR',
                cost_per_unit: costPerUnit,
                components: buildComponentsPayload() // Now passed to server!
            };

            const res = await fetchWithAuth(`${API_URL}/bulk-send/schedule`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }, activeClient?.id);

            if (res.ok) {
                const triggerData = await res.json();
                const triggerId = triggerData.id;
                setCurrentTriggerId(triggerId);

                if (sendNow) {
                    toast.success('Disparo iniciado em segundo plano! 🚀');
                    // Progress will be updated via WebSocket
                    setProgress({
                        sent: 0,
                        total: finalContacts.length,
                        failed: 0,
                        processed_contacts: [],
                        pending_contacts: [...finalContacts]
                    });
                } else {
                    toast.success('Disparo agendado com sucesso! 📅');
                    setSending(false);
                    resetForm();
                    if (onSuccess) onSuccess();
                }
            } else {
                const data = await res.json();
                toast.error(data.detail || 'Erro ao processar disparo');
                setSending(false);
            }
        } catch (error) {
            console.error("Submit error:", error);
            toast.error('Erro de conexão ao enviar para o servidor');
            setSending(false);
        }
    };

    const resetForm = () => {
        setMainList([]);
        setExclusionList([]);
        setFormResetKey(prev => prev + 1);
        setIsScheduled(false);
        setScheduleDateTime('');
    };

    const [searchTerm, setSearchTerm] = useState('');

    const getListToView = () => {
        if (viewingListType === 'main') return allRawContacts;
        if (viewingListType === 'exclusion') return allExclusionContacts;
        if (viewingListType === 'final') return finalContacts;
        if (viewingListType === 'blocked') return blockedContacts;
        return [];
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8 transition-colors duration-200">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                📤 Disparo em Massa de Templates
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Template Selection */}
                <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        1. Selecione o Template:
                    </label>

                    {!isWhatsAppConfigured && (
                        <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
                            <span className="text-yellow-600 text-lg">⚠️</span>
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-yellow-800">WhatsApp não configurado</p>
                                <p className="text-xs text-yellow-700">
                                    Configure o WhatsApp Cloud API nas <button onClick={() => document.querySelector('[aria-label="Configurações"]')?.click()} className="underline font-semibold">Configurações</button> antes de enviar templates.
                                </p>
                            </div>
                        </div>
                    )}

                    <select
                        value={selectedTemplate}
                        onChange={(e) => {
                            setSelectedTemplate(e.target.value);
                            const template = templates.find(t => t.name === e.target.value);
                            setSelectedTemplateObj(template);
                            setTemplateParams({}); // Reset params on change

                            // Auto-set cost based on category
                            if (template) {
                                const cat = (template.category || '').toUpperCase();
                                if (cat === 'MARKETING') {
                                    setCostPerUnit(0.35);
                                } else {
                                    setCostPerUnit(0.06);
                                }
                            }
                        }}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                        disabled={sending || !isWhatsAppConfigured}
                    >
                        <option value="">
                            {isWhatsAppConfigured ? 'Escolha um template...' : 'Configure o WhatsApp nas Configurações primeiro'}
                        </option>
                        {templates.map((t) => (
                            <option key={t.id || t.name} value={t.name}>
                                {t.name} - {t.category} ({t.language})
                            </option>
                        ))}
                    </select>

                    {/* Dynamic Template Variables Inputs */}
                    {selectedTemplateObj && (
                        <div className="mt-4 space-y-3 p-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg">
                            <h4 className="font-semibold text-gray-700 dark:text-gray-200 text-sm">Preencher Variáveis do Template</h4>

                            {/* Header Handling */}
                            {selectedTemplateObj.components.find(c => c.type === 'HEADER' && c.format !== 'TEXT') && (() => {
                                const header = selectedTemplateObj.components.find(c => c.type === 'HEADER');
                                if (!header) return null;
                                const format = header.format;
                                return (
                                    <div className="space-y-1">
                                        <label className="block text-xs font-semibold text-gray-600 uppercase">
                                            Cabeçalho ({format}) <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder={format === 'IMAGE' || format === 'VIDEO' || format === 'DOCUMENT' ? 'Cole a URL da mídia (https://...)' : 'Texto do cabeçalho'}
                                            value={templateParams['header_url'] || ''}
                                            onChange={(e) => setTemplateParams(prev => ({ ...prev, 'header_url': e.target.value }))}
                                            className="w-full p-2 border border-blue-200 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                                        />
                                        <p className="text-[10px] text-gray-500">Mídias devem ser links diretos (ex: Imgur, S3, ou enviado no Create).</p>
                                    </div>
                                );
                            })()}

                            {/* Header Text Variables ({{1}}) */}
                            {selectedTemplateObj.components.find(c => c.type === 'HEADER' && c.format === 'TEXT' && c.text.includes('{{1}}')) && (
                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-gray-600 uppercase">
                                        Variável do Cabeçalho {"{{1}}"}
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Valor para {{1}}"
                                        value={templateParams['header_text_1'] || ''}
                                        onChange={(e) => setTemplateParams(prev => ({ ...prev, 'header_text_1': e.target.value }))}
                                        className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                                    />
                                </div>
                            )}

                            {/* Body Variables Handling */}
                            {(() => {
                                const body = selectedTemplateObj.components.find(c => c.type === 'BODY');
                                if (!body || !body.text) return null;

                                // Extract simple variables like {{1}}, {{2}}
                                const matches = body.text.match(/\{\{(\d+)\}\}/g);
                                if (!matches) return null;

                                const uniqueVars = [...new Set(matches)].sort();

                                return uniqueVars.map((v) => {
                                    const num = v.replace(/\D/g, ''); // Extract just the number
                                    return (
                                        <div key={v} className="space-y-1">
                                            <label className="block text-xs font-semibold text-gray-600 uppercase">
                                                Variável Corpo {v}
                                            </label>
                                            <input
                                                type="text"
                                                placeholder={`Valor para ${v}`}
                                                value={templateParams[`body_${num}`] || ''}
                                                onChange={(e) => setTemplateParams(prev => ({ ...prev, [`body_${num}`]: e.target.value }))}
                                                className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                                            />
                                        </div>
                                    )
                                });
                            })()}
                        </div>
                    )}
                </div>

                {/* Left Column: Data Input */}
                <div className="md:col-span-1 space-y-4">
                    <RecipientSelector
                        key={`main-${formResetKey}`}
                        title="2. Destinatários"
                        onSelect={setMainList}
                        showValidation={false}
                    />


                    <div className="flex justify-end gap-2 text-xs">
                        <span className="text-red-500 font-medium">
                            Excluídos: {allExclusionContacts.length + blockedContacts.length}
                            {blockedContacts.length > 0 && (
                                <button
                                    onClick={() => setViewingListType('blocked')}
                                    className="ml-1 px-1 rounded hover:bg-red-50 text-red-600 underline cursor-pointer"
                                >
                                    ({blockedContacts.length} bloqueados)
                                </button>
                            )}
                            {checkingBlocked && (
                                <span className="ml-1 animate-pulse">⏳</span>
                            )}
                        </span>
                    </div>
                </div>
                <div className="flex flex-col items-end">
                    <div className="font-bold text-blue-600 text-lg">
                        Total Envio: {finalContacts.length}
                    </div>
                    {finalContacts.length > 0 && (
                        <button
                            onClick={() => setViewingListType('final')}
                            className="text-[10px] text-blue-500 hover:underline font-bold flex items-center gap-1 mb-1"
                        >
                            👁️ Ver Lista Completa ({finalContacts.length})
                        </button>
                    )}
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                        💰 Custo Estimado: <span className="text-gray-800 dark:text-white font-bold">
                            {(finalContacts.length * costPerUnit).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                    </div>
                </div>
            </div>

            {/* Right Column: Exhaustion and Settings */}
            <div className="md:col-span-1 space-y-4">
                {/* Exclusion with RecipientSelector */}
                <RecipientSelector
                    key={`exclusion-${formResetKey}`}
                    title="3. Lista de EXCLUSÃO"
                    onSelect={setExclusionList}
                    showValidation={false}
                />



                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                            ⏱️ Delay (seg):
                        </label>
                        <input
                            type="number"
                            min="1"
                            value={delaySeconds}
                            onChange={(e) => setDelaySeconds(Number(e.target.value))}
                            disabled={sending}
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-sm outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                            ⚡ Simultâneos:
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="50"
                            value={concurrency}
                            onChange={(e) => setConcurrency(Number(e.target.value))}
                            disabled={sending}
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-sm outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                        💰 Custo/Msg (BRL):
                    </label>
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={costPerUnit}
                        onChange={(e) => setCostPerUnit(Number(e.target.value))}
                        disabled={sending}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-sm outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                </div>
            </div>



            {/* Progress Bar */}
            {
                sending && !isScheduled && (
                    <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100 animated-fade-in">
                        <div className="flex justify-between text-sm font-bold text-gray-700 mb-3">
                            <span className="flex items-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                Disparando... {Math.round(((progress.sent + progress.failed) / progress.total) * 100)}%
                            </span>
                            <div className="flex gap-4 text-xs md:text-sm">
                                <span className="text-green-600 bg-green-100 px-2 py-1 rounded-md">✅ Enviados: <b>{progress.sent}</b></span>
                                <span className="text-red-600 bg-red-100 px-2 py-1 rounded-md">❌ Erros: <b>{progress.failed}</b></span>
                                <span className="text-gray-600 bg-gray-200 px-2 py-1 rounded-md">⏳ Faltam: <b>{progress.total - (progress.sent + progress.failed)}</b></span>
                            </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
                            <div
                                className="bg-gradient-to-r from-blue-500 via-blue-400 to-green-500 h-full transition-all duration-500 ease-out flex items-center justify-end pr-2"
                                style={{ width: `${((progress.sent + progress.failed) / progress.total) * 100}%` }}
                            >
                            </div>
                        </div>

                        {/* Cancel Button */}
                        <button
                            onClick={() => setCancelModalOpen(true)}
                            className="mt-3 w-full py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition"
                        >
                            ❌ Cancelar Disparo
                        </button>
                    </div>
                )
            }

            {/* Send Button */}
            <button
                onClick={handleSend}
                disabled={!selectedTemplate || finalContacts.length === 0 || sending || (isScheduled && !scheduleDateTime)}
                className={`mt-6 w-full py-3 rounded-lg font-semibold text-white transition-all ${!selectedTemplate || finalContacts.length === 0 || sending || (isScheduled && !scheduleDateTime)
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 shadow-lg'
                    }`}
            >
                {sending
                    ? '⏳ Processando...'
                    : isScheduled
                        ? `📅 Agendar Disparo para ${finalContacts.length} contatos`
                        : `🚀 Disparar Agora para ${finalContacts.length} contatos`
                }
            </button>

            {/* Modal for Viewing List */}
            {
                viewingListType && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
                            <div className={`p-4 border-b flex justify-between items-center ${viewingListType === 'exclusion' || viewingListType === 'blocked' ? 'bg-red-50 dark:bg-red-900/30 border-red-100 dark:border-red-800' : 'bg-blue-50 dark:bg-blue-900/30 border-blue-100 dark:border-blue-800'}`}>
                                <h3 className={`font-bold ${viewingListType === 'exclusion' || viewingListType === 'blocked' ? 'text-red-800 dark:text-red-200' : 'text-blue-800 dark:text-blue-200'}`}>
                                    {viewingListType === 'exclusion' ? '🛑 Lista de Exclusão' : viewingListType === 'blocked' ? '🚫 Contatos Bloqueados Detectados' : viewingListType === 'final' ? '✅ Lista Final (Filtrada)' : '📋 Lista Principal (CSV + Manual)'}
                                </h3>
                                <button
                                    onClick={() => { setViewingListType(null); setSearchTerm(''); }}
                                    className="text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-full p-1"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>


                            {/* Search Bar */}
                            <div className="p-2 border-b bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </span>
                                    <input
                                        type="text"
                                        placeholder="Buscar número..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full py-1.5 pl-9 pr-3 rounded-md border border-gray-300 dark:border-gray-600 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div className="p-4 overflow-y-auto flex-1">
                                {(() => {
                                    const list = getListToView().filter(num => num.includes(searchTerm));
                                    if (list.length === 0) {
                                        return (
                                            <p className="text-gray-500 text-center py-4">
                                                {searchTerm ? 'Nenhum resultado encontrado.' : 'Lista vazia.'}
                                            </p>
                                        );
                                    }
                                    return (
                                        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                                            {list.map((num, idx) => (
                                                <li key={idx} className="py-2 px-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-300 font-mono">
                                                    {idx + 1}. {num}
                                                </li>
                                            ))}
                                        </ul>
                                    );
                                })()}
                            </div>
                            <div className="p-3 border-t bg-gray-50 dark:bg-gray-800 dark:border-gray-700 text-right flex justify-between items-center">
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {searchTerm
                                        ? `Resultados: ${getListToView().filter(num => num.includes(searchTerm)).length}`
                                        : `Total: ${getListToView().length} contatos`
                                    }
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            const list = getListToView().filter(c => c.toLowerCase().includes(searchTerm.toLowerCase()));
                                            navigator.clipboard.writeText(list.join('\n'));
                                            toast.success('Lista copiada!');
                                        }}
                                        className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-bold hover:bg-blue-200 transition text-sm flex items-center gap-2"
                                    >
                                        📋 Copiar Lista
                                    </button>
                                    <button
                                        onClick={() => { setViewingListType(null); setSearchTerm(''); }}
                                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm font-semibold"
                                    >
                                        Fechar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Confirmation Modal */}
            {
                confirmModal.open && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animated-fade-in">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100">
                            <div className="p-6 text-center">
                                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                                    <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg leading-6 font-bold text-gray-900 dark:text-white mb-2">{confirmModal.title}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{confirmModal.message}</p>
                                <div className="flex gap-3 justify-center">
                                    <button
                                        onClick={() => setConfirmModal({ ...confirmModal, open: false })}
                                        className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={confirmClear}
                                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium shadow-md transition-colors"
                                    >
                                        Sim, Limpar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Cancel Bulk Modal */}
            <CancelBulkModal
                isOpen={cancelModalOpen}
                onClose={() => setCancelModalOpen(false)}
                trigger={{
                    id: currentTriggerId,
                    progress: progress
                }}
                onConfirmCancel={(data) => {
                    // Handle cancellation result
                    toast.success(data.message);
                    stopSendingRef.current = true; // Signal the loop to stop
                    setSending(false);
                    if (onSuccess) onSuccess();
                }}
            />
        </div >
    );
};

export default TemplateBulkSender;
