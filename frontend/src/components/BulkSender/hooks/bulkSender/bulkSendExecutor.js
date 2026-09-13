import { toast } from 'react-hot-toast';
import { fetchWithAuth } from '../../../../AuthContext';
import { API_URL } from '../../../../config';
import { buildComponentsPayload, buildDeduplicatedPayloadContacts } from '../../utils/payloadBuilder';
import { extractTemplateVariables } from './templateUtils';

export const executeBulkSend = async ({
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
}) => {
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
            contacts_list: buildDeduplicatedPayloadContacts(finalContacts, selectedTemplateObj, templateParams, vFilters),
            exclusion_list: [...new Set([...exclusionList, ...(selectionMetadata?.tagExclusions || [])])],
            exclusion_tags: [...new Set([...configuredExclusionTags, ...(Array.isArray(selectedExclusionTag) ? selectedExclusionTag : (selectedExclusionTag ? [selectedExclusionTag] : []))])],
            exclusion_tag_mode: exclusionTagMode || 'OR',
            delay_seconds: delayUnit === 'minutes' ? delaySeconds * 60 : delaySeconds,
            concurrency_limit: concurrency,
            schedule_at: scheduledTime ? new Date(scheduledTime).toISOString() : new Date().toISOString(),
            max_dispatch_time: maxDispatchTime ? new Date(maxDispatchTime).toISOString() : null,
            chatwoot_label: selectedChatwootLabels,
            template_name: selectedTemplate,
            language: selectedTemplateObj.language || 'pt_BR',
            components: buildComponentsPayload(selectedTemplateObj, templateParams),
            private_message: sendPrivateMessage ? privateMessageText : null,
            private_message_delay: privateMessageDelayUnit === 'minutes' ? privateMessageDelay * 60 : privateMessageDelay,
            private_message_concurrency: privateMessageConcurrency,
            button_actions: Object.keys(buttonActions).length > 0 ? buttonActions : null,
            is_dynamic_label: !!(scheduledTime && isDynamicLabel && (selectionMetadata?.mode === 'tag' || (selectedChatwootLabels && selectedChatwootLabels.length > 0))),
            dynamic_label_name: selectionMetadata?.tag || (selectedChatwootLabels && selectedChatwootLabels[0]) || null
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
