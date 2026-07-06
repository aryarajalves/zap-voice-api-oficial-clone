import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { useClient } from '../../../contexts/ClientContext';
import { fetchWithAuth, useAuth } from '../../../AuthContext';
import { API_URL } from '../../../config';
import * as XLSX from 'xlsx';
import { buildComponentsPayload } from '../utils/payloadBuilder';

export const useBulkSender = (onViewChange, onSuccess) => {
    const { activeClient } = useClient();

    // --- Core State ---
    const [step, setStep] = useState(1);
    const [isGuideOpen, setIsGuideOpen] = useState(false);
    const [isWorking, setIsWorking] = useState(false);
    const [workingMessage, setWorkingMessage] = useState("");

    // Templates & Labels Data
    const [templates, setTemplates] = useState([]);
    const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
    const [chatwootLabels, setChatwootLabels] = useState([]);
    const [isLoadingChatwootLabels, setIsLoadingChatwootLabels] = useState(false);
    const [funnels, setFunnels] = useState([]);
    const [isLoadingFunnels, setIsLoadingFunnels] = useState(false);

    // Step 1: Configuration
    const [selectedTemplate, setSelectedTemplate] = useState("");
    const [templateSearch, setTemplateSearch] = useState("");
    const [isTemplateDropdownOpen, setIsTemplateDropdownOpen] = useState(false);
    const [templateParams, setTemplateParams] = useState({});

    // Automation (Private Notes)
    const [sendPrivateMessage, setSendPrivateMessage] = useState(false);
    const [privateMessageText, setPrivateMessageText] = useState("");
    const [privateMessageDelay, setPrivateMessageDelay] = useState(15); // Padrão solicitado: 15s
    const [privateMessageDelayUnit, setPrivateMessageDelayUnit] = useState("seconds");
    const [privateMessageConcurrency, setPrivateMessageConcurrency] = useState(1); // Padrão solicitado: 1 job
    const [selectedChatwootLabels, setSelectedChatwootLabels] = useState([]);
    const [whatsappProfile, setWhatsappProfile] = useState(null);

    // Button Actions (card 04)
    const [buttonActions, setButtonActions] = useState({});

    // Step 2: Execution & Contacts
    const [finalContacts, setFinalContacts] = useState([]);
    const [selectionMetadata, setSelectionMetadata] = useState({});
    const [isSending, setIsSending] = useState(false);
    const [delaySeconds, setDelaySeconds] = useState(1); // Padrão solicitado: 1s
    const [delayUnit, setDelayUnit] = useState("seconds");
    const [concurrency, setConcurrency] = useState(4); // Padrão solicitado: 4 jobs
    const [scheduledTime, setScheduledTime] = useState("");
    const [isValidated, setIsValidated] = useState(false);

    // Exclusion List
    const [exclusionList, setExclusionList] = useState([]);
    const [exclusionMode, setExclusionMode] = useState("manual");
    const [exclusionText, setExclusionText] = useState("");
    const [exclusionAvailableTags, setExclusionAvailableTags] = useState([]);
    const [isLoadingExclusionTags, setIsLoadingExclusionTags] = useState(false);
    const [selectedExclusionTag, setSelectedExclusionTag] = useState([]);
    const [exclusionTagMode, setExclusionTagMode] = useState("OR");
    const [exclusionCsvData, setExclusionCsvData] = useState(null);
    const [exclusionColSelector, setExclusionColSelector] = useState(false);
    const [exclusionSelectedCol, setExclusionSelectedCol] = useState(null);

    // Recurring
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurrenceFrequency, setRecurrenceFrequency] = useState('weekly');
    const [recurrenceDaysOfWeek, setRecurrenceDaysOfWeek] = useState([]);
    const [recurrenceDayOfMonth, setRecurrenceDayOfMonth] = useState("");
    const [recurrenceTime, setRecurrenceTime] = useState("09:00");

    // Modal Expansion
    const [expansionModal, setExpansionModal] = useState({ isOpen: false, title: '', key: '', value: '' });

    // --- API Loaders ---
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

    const loadExclusionTags = async () => {
        if (!activeClient) return;
        setIsLoadingExclusionTags(true);
        try {
            const res = await fetchWithAuth(`${API_URL}/leads/filters`, {}, activeClient.id);
            if (res.ok) {
                const data = await res.json();
                setExclusionAvailableTags(data.tags || []);
            } else {
                setExclusionAvailableTags([]);
            }
        } catch (err) {
            console.error("Erro tags exclusão:", err);
            setExclusionAvailableTags([]);
        } finally {
            setIsLoadingExclusionTags(false);
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

    useEffect(() => {
        if (activeClient) {
            loadTemplates();
            loadChatwootLabels();
            loadExclusionTags();
            loadFunnels();
            loadWhatsAppProfile();
        }
    }, [activeClient]);

    // --- Handlers ---
    const handleTemplateChange = (e) => {
        const name = e.target.value;
        setSelectedTemplate(name);
        setTemplateParams({});
        const t = templates.find(x => x.name === name);
        if (t && t.inbox_id) {
            setSelectionMetadata(prev => ({ ...prev, inbox_id: t.inbox_id }));
        }
    };

    const handleRecipientSelect = useCallback((contacts, metadata) => {
        setFinalContacts(contacts);
        setSelectionMetadata(metadata);
        setIsValidated(metadata?.isValidated || false);
    }, []);

    const handleReset = () => {
        setStep(1);
        setSelectedTemplate("");
        setTemplateParams({});
        setSendPrivateMessage(false);
        setPrivateMessageText("");
        setSelectedChatwootLabels([]);
        setFinalContacts([]);
        setExclusionList([]);
        setScheduledTime("");
        setIsRecurring(false);
        setButtonActions({});
        toast.success("Configurações resetadas!");
    };

    const handleSaveExclusion = () => {
        const nums = exclusionText.split('\n').map(n => n.trim().replace(/\D/g, '')).filter(n => n.length >= 8);
        setExclusionList(prev => [...new Set([...prev, ...nums])]);
        setExclusionText("");
        toast.success(`${nums.length} números adicionados à exclusão.`);
    };

    const handleExclusionFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
            if (data.length > 0) {
                setExclusionCsvData({ headers: data[0], rows: data.slice(1) });
                setExclusionColSelector(true);
            }
        };
        reader.readAsBinaryString(file);
    };

    const confirmExclusionColumn = () => {
        if (exclusionSelectedCol === null || !exclusionCsvData) return;
        const nums = exclusionCsvData.rows.map(r => String(r[exclusionSelectedCol] || '').replace(/\D/g, '')).filter(n => n.length >= 8);
        setExclusionList(prev => [...new Set([...prev, ...nums])]);
        setExclusionColSelector(false);
        setExclusionCsvData(null);
        toast.success(`${nums.length} números importados para exclusão.`);
    };

    const loadExclusionContactsByTag = async () => {
        const tags = Array.isArray(selectedExclusionTag) ? selectedExclusionTag : (selectedExclusionTag ? [selectedExclusionTag] : []);
        if (tags.length === 0) return;
        setIsWorking(true);
        setWorkingMessage(`Buscando contatos com as etiquetas: ${tags.join(', ')}...`);
        try {
            const tagParams = tags.map(t => `tag=${encodeURIComponent(t)}`).join('&');
            const res = await fetchWithAuth(`${API_URL}/leads?${tagParams}&tag_mode=${exclusionTagMode}&limit=10000`, {}, activeClient.id);
            if (res && res.ok) {
                const data = await res.json();
                const nums = (data.items || []).map(l => String(l.phone || '').replace(/\D/g, '')).filter(n => n.length >= 8);
                if (nums.length > 0) {
                    setExclusionList(prev => [...new Set([...prev, ...nums])]);
                    toast.success(`${[...new Set(nums)].length} contatos únicos adicionados à exclusão.`);
                    setSelectedExclusionTag([]); // Limpa a seleção após adicionar
                } else {
                    toast.success("Nenhum contato encontrado com as etiquetas selecionadas.");
                }
            } else {
                toast.error("Erro ao buscar contatos por etiqueta.");
            }
        } catch (err) {
            toast.error("Erro ao buscar contatos por etiqueta.");
        } finally {
            setIsWorking(false);
        }
    };

    const handleSend = async () => {
        if (!activeClient) return;
        
        // Validações de pré-requisitos
        if (finalContacts.length === 0) {
            return toast.error("Você precisa carregar os leads antes de iniciar o disparo!", {
                duration: 5000,
                icon: '📂',
                style: { borderRadius: '15px', background: '#1e293b', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }
            });
        }
        
        if (!isValidated) {
            return toast.error("Por favor, clique em 'VALIDAR CANAIS & JANELAS' antes de iniciar o disparo.", {
                duration: 5000,
                icon: '🛡️',
                style: { borderRadius: '15px', background: '#1e293b', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }
            });
        }

        const selectedTemplateObj = templates.find(t => t.name === selectedTemplate);
        if (!selectedTemplateObj) return toast.error("Selecione um template");

        // Validação de variáveis obrigatórias do template
        const reqVars = extractTemplateVariables(selectedTemplateObj);
        
        // Adiciona variáveis de botões com URL dinâmica
        const buttonsComp = selectedTemplateObj.components?.find(c => c.type === 'BUTTONS');
        if (buttonsComp?.buttons) {
            buttonsComp.buttons.forEach((btn, idx) => {
                if (btn.type === 'URL' && btn.url?.includes('{{1}}')) {
                    reqVars.push({
                        key: `BUTTONS_${idx}`,
                        label: `Variável do Botão ${idx + 1} (${btn.text || ''})`
                    });
                }
            });
        }

        const missingVars = [];
        for (const v of reqVars) {
            const hasGlobal = templateParams[v.key] !== undefined && templateParams[v.key] !== null && String(templateParams[v.key]).trim() !== '';
            if (hasGlobal) continue;

            const missingInContacts = finalContacts.some(c => {
                const val = c.vars ? c.vars[v.key] : undefined;
                return val === undefined || val === null || String(val).trim() === '';
            });

            if (missingInContacts) {
                missingVars.push(v.label);
            }
        }

        if (missingVars.length > 0) {
            return toast.error(`Defina o valor para as variáveis: ${missingVars.join(', ')}`, {
                duration: 5000,
                icon: '⚠️',
                style: { borderRadius: '15px', background: '#1e293b', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }
            });
        }

        setIsSending(true);
        try {
            const vFilters = selectionMetadata?.variableFilters || {};
            
            const payload = {
                contacts_list: finalContacts.map(c => {
                    const processedVars = {};
                    if (c.vars) {
                        Object.entries(c.vars).forEach(([key, val]) => {
                            if (vFilters[key] === 'first_name' && val) {
                                processedVars[key] = String(val).trim().split(' ')[0];
                            } else {
                                processedVars[key] = val;
                            }
                        });
                    }
                    
                    return {
                        phone: c.phone,
                        name: c.name,
                        components: buildComponentsPayload(selectedTemplateObj, { ...templateParams, ...processedVars }),
                        vars: processedVars
                    };
                }),
                exclusion_list: [...new Set([...exclusionList, ...(selectionMetadata?.tagExclusions || [])])],
                delay_seconds: delayUnit === 'minutes' ? delaySeconds * 60 : delaySeconds,
                concurrency_limit: concurrency,
                schedule_at: scheduledTime ? new Date(scheduledTime).toISOString() : new Date().toISOString(),
                chatwoot_label: selectedChatwootLabels,
                template_name: selectedTemplate,
                language: selectedTemplateObj.language || 'pt_BR',
                components: buildComponentsPayload(selectedTemplateObj, templateParams),
                private_message: sendPrivateMessage ? privateMessageText : null,
                private_message_delay: privateMessageDelayUnit === 'minutes' ? privateMessageDelay * 60 : privateMessageDelay,
                private_message_concurrency: privateMessageConcurrency,
                button_actions: Object.keys(buttonActions).length > 0 ? buttonActions : null
            };

            let res;
            if (isRecurring) {
                const isTagMode = selectionMetadata?.mode === 'tag';
                const rtPayload = { 
                    ...payload, 
                    frequency: recurrenceFrequency, 
                    days_of_week: recurrenceDaysOfWeek, 
                    day_of_month: recurrenceDayOfMonth ? [parseInt(recurrenceDayOfMonth)] : [], 
                    scheduled_time: (recurrenceDaysOfWeek && recurrenceDaysOfWeek.length > 0) ? recurrenceDaysOfWeek[0].time : recurrenceTime, 
                    is_active: true,
                    tag: isTagMode ? selectionMetadata.tag : null,
                    contacts_list: payload.contacts_list
                };
                res = await fetchWithAuth(`${API_URL}/schedules/recurring`, { method: 'POST', body: JSON.stringify(rtPayload) }, activeClient.id);
            } else {
                res = await fetchWithAuth(`${API_URL}/bulk-send/schedule`, { method: 'POST', body: JSON.stringify(payload) }, activeClient.id);
            }

            if (res.ok) {
                toast.success("Disparo processado com sucesso!");
                if (onSuccess) onSuccess();
                if (onViewChange) onViewChange(isRecurring ? 'recurring_schedules' : 'history');
            } else {
                const errData = await res.json();
                toast.error(errData.detail || "Falha ao processar disparo.");
            }
        } catch (error) {
            console.error("Erro no envio:", error);
            toast.error("Falha ao processar disparo.");
        } finally {
            setIsSending(false);
        }
    };

    const extractTemplateButtons = (templateObj) => {
        if (!templateObj?.components) return [];
        const buttonsComp = templateObj.components.find(c => c.type === 'BUTTONS');
        if (!buttonsComp?.buttons) return [];
        // Filtra botões que NÃO sejam do tipo URL ou PHONE (ou seja, apenas os QUICK_REPLY/REPLY)
        return buttonsComp.buttons
            .filter(b => b.type !== 'URL' && b.type !== 'PHONE')
            .map(b => b.text)
            .filter(Boolean);
    };

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
                label: `Link do Cabeçalho (${mediaTypeLabel})`
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
                        label: match
                    });
                });
            }
        }
        
        return vars;
    };

    return {
        step, setStep, isGuideOpen, setIsGuideOpen, isWorking, setIsWorking, workingMessage,
        templates, isLoadingTemplates, chatwootLabels, isLoadingChatwootLabels,
        funnels, isLoadingFunnels,
        selectedTemplate, setSelectedTemplate, templateSearch, setTemplateSearch,
        isTemplateDropdownOpen, setIsTemplateDropdownOpen, templateParams, setTemplateParams,
        buttonActions, setButtonActions,
        sendPrivateMessage, setSendPrivateMessage, privateMessageText, setPrivateMessageText,
        privateMessageDelay, setPrivateMessageDelay, privateMessageDelayUnit, setPrivateMessageDelayUnit,
        privateMessageConcurrency, setPrivateMessageConcurrency, selectedChatwootLabels, setSelectedChatwootLabels,
        finalContacts, selectionMetadata, isSending, delaySeconds, setDelaySeconds,
        delayUnit, setDelayUnit, concurrency, setConcurrency, scheduledTime, setScheduledTime,
        exclusionList, setExclusionList, exclusionMode, setExclusionMode, exclusionText, setExclusionText,
        exclusionAvailableTags, isLoadingExclusionTags, selectedExclusionTag, setSelectedExclusionTag,
        exclusionTagMode, setExclusionTagMode,
        exclusionCsvData, exclusionColSelector, setExclusionColSelector, exclusionSelectedCol, setExclusionSelectedCol,
        isRecurring, setIsRecurring, recurrenceFrequency, setRecurrenceFrequency,
        recurrenceDaysOfWeek, setRecurrenceDaysOfWeek, recurrenceDayOfMonth, setRecurrenceDayOfMonth,
        recurrenceTime, setRecurrenceTime, expansionModal, setExpansionModal,
        whatsappProfile,
        handleTemplateChange, handleRecipientSelect, handleReset, handleSaveExclusion,
        handleExclusionFileUpload, confirmExclusionColumn, loadExclusionContactsByTag, handleSend,
        extractTemplateVariables, extractTemplateButtons,
        activeClient
    };
};
