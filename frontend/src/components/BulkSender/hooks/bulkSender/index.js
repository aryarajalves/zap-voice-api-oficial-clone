import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { useClient } from '../../../../contexts/ClientContext';
import { useBulkScheduling } from '../useBulkScheduling';
import { useBulkExclusion } from './useBulkExclusion';
import { useBulkDataLoaders } from './useBulkDataLoaders';
import { executeBulkSend } from './bulkSendExecutor';
import { extractTemplateVariables, extractTemplateButtons } from './templateUtils';

export {
    useBulkExclusion,
    useBulkDataLoaders,
    executeBulkSend,
    extractTemplateVariables,
    extractTemplateButtons
};

export const useBulkSender = (onViewChange, onSuccess) => {
    const { activeClient } = useClient();
    const prevClientIdRef = useRef(activeClient?.id);

    // --- Core State ---
    const [step, setStep] = useState(1);
    const [isGuideOpen, setIsGuideOpen] = useState(false);
    const [isWorking, setIsWorking] = useState(false);
    const [workingMessage, setWorkingMessage] = useState("");

    // Sub-hook: Data Loaders (Templates, Funnels, Labels, WhatsApp Profile)
    const {
        templates, setTemplates, isLoadingTemplates,
        chatwootLabels, setChatwootLabels, isLoadingChatwootLabels,
        funnels, setFunnels, isLoadingFunnels,
        whatsappProfile, setWhatsappProfile,
        loadTemplates, loadChatwootLabels, loadFunnels, loadWhatsAppProfile
    } = useBulkDataLoaders({ activeClient });

    // Step 1: Configuration
    const [selectedTemplate, setSelectedTemplate] = useState("");
    const [templateSearch, setTemplateSearch] = useState("");
    const [isTemplateDropdownOpen, setIsTemplateDropdownOpen] = useState(false);
    const [templateParams, setTemplateParams] = useState({});

    // Automation (Private Notes)
    const [sendPrivateMessage, setSendPrivateMessage] = useState(false);
    const [privateMessageText, setPrivateMessageText] = useState("");
    const [privateMessageDelay, setPrivateMessageDelay] = useState(15);
    const [privateMessageDelayUnit, setPrivateMessageDelayUnit] = useState("seconds");
    const [privateMessageConcurrency, setPrivateMessageConcurrency] = useState(1);
    const [selectedChatwootLabels, setSelectedChatwootLabels] = useState([]);

    // Button Actions (card 04)
    const [buttonActions, setButtonActions] = useState({});

    // Step 2: Execution & Contacts
    const [finalContacts, setFinalContacts] = useState([]);
    const [selectionMetadata, setSelectionMetadata] = useState({});
    const [isSending, setIsSending] = useState(false);
    const [delaySeconds, setDelaySeconds] = useState(1);
    const [delayUnit, setDelayUnit] = useState("seconds");
    const [concurrency, setConcurrency] = useState(10);
    const [isValidated, setIsValidated] = useState(false);

    // Sub-hook: Agendamento e Recorrência
    const {
        scheduledTime, setScheduledTime,
        maxDispatchTime, setMaxDispatchTime, clearMaxDispatchTime,
        isDynamicLabel, setIsDynamicLabel,
        isRecurring, setIsRecurring,
        recurrenceFrequency, setRecurrenceFrequency,
        recurrenceDaysOfWeek, setRecurrenceDaysOfWeek,
        recurrenceDayOfMonth, setRecurrenceDayOfMonth,
        recurrenceTime, setRecurrenceTime
    } = useBulkScheduling();

    // Sub-hook: Exclusões
    const {
        exclusionList, setExclusionList,
        exclusionMode, setExclusionMode,
        exclusionText, setExclusionText,
        exclusionAvailableTags, setExclusionAvailableTags,
        isLoadingExclusionTags,
        selectedExclusionTag, setSelectedExclusionTag,
        configuredExclusionTags, setConfiguredExclusionTags,
        exclusionTagMode, setExclusionTagMode,
        exclusionCsvData, setExclusionCsvData,
        exclusionColSelector, setExclusionColSelector,
        exclusionSelectedCol, setExclusionSelectedCol,
        loadExclusionTags,
        handleSaveExclusion,
        clearExclusionList,
        handleExclusionFileUpload,
        confirmExclusionColumn,
        loadExclusionContactsByTag,
        resetExclusion
    } = useBulkExclusion({ activeClient, setIsWorking, setWorkingMessage });

    // Modal Expansion
    const [expansionModal, setExpansionModal] = useState({ isOpen: false, title: '', key: '', value: '' });

    // Sync com activeClient
    useEffect(() => {
        if (activeClient) {
            if (prevClientIdRef.current && prevClientIdRef.current !== activeClient.id) {
                setStep(1);
                setSelectedTemplate("");
                setTemplateSearch("");
                setTemplateParams({});
                setSendPrivateMessage(false);
                setPrivateMessageText("");
                setSelectedChatwootLabels([]);
                setButtonActions({});
                setFinalContacts([]);
                setSelectionMetadata({});
                setIsValidated(false);
                resetExclusion();
                setScheduledTime("");
                setIsRecurring(false);
            }
            prevClientIdRef.current = activeClient.id;

            loadTemplates();
            loadChatwootLabels();
            loadExclusionTags();
            loadFunnels();
            loadWhatsAppProfile();
        }
    }, [activeClient?.id]);

    // Handlers
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
        resetExclusion();
        setScheduledTime("");
        setMaxDispatchTime("");
        setIsRecurring(false);
        setButtonActions({});
        toast.success("Configurações resetadas!");
    };

    const handleSend = async () => {
        await executeBulkSend({
            activeClient,
            finalContacts,
            isValidated,
            templates,
            selectedTemplate,
            templateParams,
            selectionMetadata,
            exclusionList,
            configuredExclusionTags,
            selectedExclusionTag,
            exclusionTagMode,
            delayUnit,
            delaySeconds,
            concurrency,
            scheduledTime,
            maxDispatchTime,
            selectedChatwootLabels,
            sendPrivateMessage,
            privateMessageText,
            privateMessageDelayUnit,
            privateMessageDelay,
            privateMessageConcurrency,
            buttonActions,
            isDynamicLabel,
            isRecurring,
            recurrenceFrequency,
            recurrenceDaysOfWeek,
            recurrenceDayOfMonth,
            recurrenceTime,
            setIsSending,
            onSuccess,
            onViewChange
        });
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
        maxDispatchTime, setMaxDispatchTime, clearMaxDispatchTime,
        isDynamicLabel, setIsDynamicLabel,

        exclusionList, setExclusionList, exclusionMode, setExclusionMode, exclusionText, setExclusionText,
        exclusionAvailableTags, isLoadingExclusionTags, selectedExclusionTag, setSelectedExclusionTag,
        configuredExclusionTags, setConfiguredExclusionTags,
        exclusionTagMode, setExclusionTagMode,
        exclusionCsvData, exclusionColSelector, setExclusionColSelector, exclusionSelectedCol, setExclusionSelectedCol,
        isRecurring, setIsRecurring, recurrenceFrequency, setRecurrenceFrequency,
        recurrenceDaysOfWeek, setRecurrenceDaysOfWeek, recurrenceDayOfMonth, setRecurrenceDayOfMonth,
        recurrenceTime, setRecurrenceTime, expansionModal, setExpansionModal,
        whatsappProfile,
        handleTemplateChange, handleRecipientSelect, handleReset, handleSaveExclusion, clearExclusionList,
        handleExclusionFileUpload, confirmExclusionColumn, loadExclusionContactsByTag, handleSend,
        extractTemplateVariables, extractTemplateButtons,
        activeClient
    };
};

export default useBulkSender;
