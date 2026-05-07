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

    // Step 2: Execution & Contacts
    const [finalContacts, setFinalContacts] = useState([]);
    const [selectionMetadata, setSelectionMetadata] = useState({});
    const [isSending, setIsSending] = useState(false);
    const [delaySeconds, setDelaySeconds] = useState(1); // Padrão solicitado: 1s
    const [delayUnit, setDelayUnit] = useState("seconds");
    const [concurrency, setConcurrency] = useState(4); // Padrão solicitado: 4 jobs
    const [scheduledTime, setScheduledTime] = useState("");

    // Exclusion List
    const [exclusionList, setExclusionList] = useState([]);
    const [exclusionMode, setExclusionMode] = useState("manual");
    const [exclusionText, setExclusionText] = useState("");
    const [exclusionAvailableTags, setExclusionAvailableTags] = useState([]);
    const [isLoadingExclusionTags, setIsLoadingExclusionTags] = useState(false);
    const [selectedExclusionTag, setSelectedExclusionTag] = useState("");
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
            const res = await fetchWithAuth(`${API_URL}/whatsapp/templates`);
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
        if (!activeClient) return;
        setIsLoadingChatwootLabels(true);
        try {
            const res = await fetchWithAuth(`${API_URL}/chatwoot/labels`);
            if (res.ok) {
                const data = await res.json();
                setChatwootLabels(data || []);
            } else {
                setChatwootLabels([]);
            }
        } catch (error) {
            console.error("Erro ao carregar etiquetas:", error);
            setChatwootLabels([]);
        } finally {
            setIsLoadingChatwootLabels(false);
        }
    };

    const loadExclusionTags = async () => {
        if (!activeClient) return;
        setIsLoadingExclusionTags(true);
        try {
            const res = await fetchWithAuth(`${API_URL}/leads/filters`);
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

    useEffect(() => {
        if (activeClient) {
            loadTemplates();
            loadChatwootLabels();
            loadExclusionTags();
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
        if (!selectedExclusionTag) return;
        setIsWorking(true);
        setWorkingMessage(`Buscando contatos com a etiqueta: ${selectedExclusionTag}...`);
        try {
            const res = await fetchWithAuth(`${API_URL}/leads?tag=${encodeURIComponent(selectedExclusionTag)}&limit=1000`);
            if (res.ok) {
                const data = await res.json();
                const nums = (data.items || []).map(l => String(l.phone || '').replace(/\D/g, '')).filter(n => n.length >= 8);
                setExclusionList(prev => [...new Set([...prev, ...nums])]);
                toast.success(`${nums.length} contatos adicionados à exclusão.`);
            }
        } catch (err) {
            toast.error("Erro ao buscar contatos por etiqueta.");
        } finally {
            setIsWorking(false);
        }
    };

    const handleSend = async () => {
        if (!activeClient) return;
        if (finalContacts.length === 0) return toast.error("Selecione os contatos primeiro");
        const selectedTemplateObj = templates.find(t => t.name === selectedTemplate);
        if (!selectedTemplateObj) return toast.error("Selecione um template");

        setIsSending(true);
        try {
            const payload = {
                contacts_list: finalContacts.map(c => ({
                    phone: c.phone,
                    name: c.name,
                    components: buildComponentsPayload(selectedTemplateObj, { ...templateParams, ...(c.vars || {}) }),
                    vars: c.vars || {}
                })),
                exclusion_list: exclusionList,
                delay_seconds: delayUnit === 'minutes' ? delaySeconds * 60 : delaySeconds,
                concurrency_limit: concurrency,
                schedule_at: scheduledTime || new Date().toISOString(),
                chatwoot_label: selectedChatwootLabels,
                template_name: selectedTemplate,
                language: selectedTemplateObj.language || 'pt_BR',
                components: buildComponentsPayload(selectedTemplateObj, templateParams),
                private_message: sendPrivateMessage ? privateMessageText : null,
                private_message_delay: privateMessageDelayUnit === 'minutes' ? privateMessageDelay * 60 : privateMessageDelay,
                private_message_concurrency: privateMessageConcurrency
            };

            let res;
            if (isRecurring) {
                const rtPayload = { ...payload, frequency: recurrenceFrequency, days_of_week: recurrenceDaysOfWeek, day_of_month: recurrenceDayOfMonth ? [parseInt(recurrenceDayOfMonth)] : [], scheduled_time: recurrenceTime, is_active: true };
                res = await fetchWithAuth(`${API_URL}/schedules/recurring`, { method: 'POST', body: JSON.stringify(rtPayload) }, activeClient.id);
            } else {
                res = await fetchWithAuth(`${API_URL}/bulk-send/schedule`, { method: 'POST', body: JSON.stringify(payload) }, activeClient.id);
            }

            if (res.ok) {
                toast.success("Disparo processado com sucesso!");
                if (onSuccess) onSuccess();
                if (onViewChange) onViewChange('history');
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

    const extractTemplateVariables = (templateObj) => {
        if (!templateObj) return [];
        const bodyComp = templateObj.components?.find(c => c.type === 'BODY');
        if (!bodyComp || !bodyComp.text) return [];
        const matches = bodyComp.text.match(/\{\{\d+\}\}/g);
        if (!matches) return [];
        return [...new Set(matches)].map(match => ({
            key: `BODY_${parseInt(match.replace(/[{}]/g, '')) - 1}`,
            label: match
        }));
    };

    return {
        step, setStep, isGuideOpen, setIsGuideOpen, isWorking, setIsWorking, workingMessage,
        templates, isLoadingTemplates, chatwootLabels, isLoadingChatwootLabels,
        selectedTemplate, setSelectedTemplate, templateSearch, setTemplateSearch,
        isTemplateDropdownOpen, setIsTemplateDropdownOpen, templateParams, setTemplateParams,
        sendPrivateMessage, setSendPrivateMessage, privateMessageText, setPrivateMessageText,
        privateMessageDelay, setPrivateMessageDelay, privateMessageDelayUnit, setPrivateMessageDelayUnit,
        privateMessageConcurrency, setPrivateMessageConcurrency, selectedChatwootLabels, setSelectedChatwootLabels,
        finalContacts, selectionMetadata, isSending, delaySeconds, setDelaySeconds,
        delayUnit, setDelayUnit, concurrency, setConcurrency, scheduledTime, setScheduledTime,
        exclusionList, setExclusionList, exclusionMode, setExclusionMode, exclusionText, setExclusionText,
        exclusionAvailableTags, isLoadingExclusionTags, selectedExclusionTag, setSelectedExclusionTag,
        exclusionCsvData, exclusionColSelector, setExclusionColSelector, exclusionSelectedCol, setExclusionSelectedCol,
        isRecurring, setIsRecurring, recurrenceFrequency, setRecurrenceFrequency,
        recurrenceDaysOfWeek, setRecurrenceDaysOfWeek, recurrenceDayOfMonth, setRecurrenceDayOfMonth,
        recurrenceTime, setRecurrenceTime, expansionModal, setExpansionModal,
        handleTemplateChange, handleRecipientSelect, handleReset, handleSaveExclusion,
        handleExclusionFileUpload, confirmExclusionColumn, loadExclusionContactsByTag, handleSend, extractTemplateVariables,
        activeClient
    };
};
