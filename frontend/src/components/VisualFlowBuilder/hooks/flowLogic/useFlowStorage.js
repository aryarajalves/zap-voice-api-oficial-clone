import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { fetchWithAuth } from '../../../../AuthContext';
import { API_URL } from '../../../../config';

export const useFlowStorage = ({
    funnelId,
    onSave,
    activeClient,
    nodes,
    setNodes,
    edges,
    setEdges,
    metadata = {},
    nodeCallbacks = {}
}) => {
    const [saving, setSaving] = useState(false);
    const [currentFunnelId, setCurrentFunnelId] = useState(funnelId);
    const [globalVars, setGlobalVars] = useState([]);
    const [otherActiveFunnel, setOtherActiveFunnel] = useState(null);

    // Consultar funil que possui o gatilho de nova conversa ativo
    useEffect(() => {
        if (!activeClient?.id) return;
        fetchWithAuth(`${API_URL}/funnels/new-conversation-trigger`, {}, activeClient.id)
            .then(res => res.json())
            .then(data => {
                if (data && data.funnel_id) {
                    setOtherActiveFunnel(data);
                } else {
                    setOtherActiveFunnel(null);
                }
            })
            .catch(err => console.error("Erro ao buscar gatilho de nova conversa ativo:", err));
    }, [activeClient?.id, currentFunnelId, saving]);

    const {
        funnelName = '', setFunnelName,
        allowedPhones = '', setAllowedPhones,
        blockedPhones = '', setBlockedPhones,
        triggerPhrase = '', setTriggerPhrase,
        triggerMatchType = 'contains', setTriggerMatchType,
        triggerLimitType = 'none', setTriggerLimitType,
        isTriggerActive = true, setIsTriggerActive,
        businessHoursStart = '08:00', setBusinessHoursStart,
        businessHoursEnd = '18:00', setBusinessHoursEnd,
        businessHoursDays = [0, 1, 2, 3, 4], setBusinessHoursDays,
        triggerOnNewConversation = false, setTriggerOnNewConversation,
        triggerNewConversationMode = 'all', setTriggerNewConversationMode
    } = metadata;

    const {
        updateNodeData,
        handleDeleteRequest,
        setStartNode,
        handleDuplicateNode
    } = nodeCallbacks;

    // Buscar variáveis globais do cliente ativo
    useEffect(() => {
        if (activeClient?.id) {
            fetchWithAuth(`${API_URL}/globals`, {}, activeClient.id)
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) setGlobalVars(data);
                })
                .catch(err => console.error("Error fetching globals:", err));
        }
    }, [activeClient?.id]);

    // Salvar fluxo atualizado
    const handleSave = async () => {
        if (!currentFunnelId) {
            toast.error("Erro: Nenhum funil selecionado para salvar.");
            return;
        }

        if (!funnelName.trim()) {
            toast.error("Por favor, dê um nome para o funil.");
            return;
        }

        setSaving(true);

        const savePromise = (async () => {
            const cleanNodes = (nodes || []).map(n => {
                const { onChange, onDelete, onSetStart, onDuplicate, ...restData } = n.data || {};
                return { ...n, data: restData };
            });

            const stepsPayload = { nodes: cleanNodes, edges };

            const getRes = await fetchWithAuth(`${API_URL}/funnels/${currentFunnelId}`, {}, activeClient.id);
            if (!getRes.ok) throw new Error("Erro ao buscar dados do funil");

            const currentFunnel = await getRes.json();

            const updatePayload = {
                name: funnelName,
                description: currentFunnel.description,
                trigger_phrase: triggerPhrase.trim() || null,
                trigger_match_type: triggerMatchType,
                trigger_limit_type: triggerLimitType,
                is_trigger_active: isTriggerActive,
                allowed_phones: allowedPhones.split(',').map(p => p.trim()).filter(p => p),
                blocked_phones: blockedPhones.split(',').map(p => p.trim()).filter(p => p),
                allowed_phone: null,
                business_hours_start: businessHoursStart,
                business_hours_end: businessHoursEnd,
                business_hours_days: businessHoursDays,
                trigger_on_new_conversation: triggerOnNewConversation,
                trigger_new_conversation_mode: triggerNewConversationMode,
                steps: stepsPayload
            };

            const res = await fetchWithAuth(`${API_URL}/funnels/${currentFunnelId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatePayload)
            }, activeClient.id);

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.detail || "Erro ao salvar fluxo");
            }

            if (onSave) onSave();
            return "Fluxo salvo com sucesso! 💾";
        })();

        toast.promise(savePromise, {
            loading: 'Salvando fluxo... ⏳',
            success: (msg) => msg,
            error: (err) => err.message || "Erro de conexão"
        });

        try {
            await savePromise;
        } catch (e) {
            console.error("Save error:", e);
        } finally {
            setSaving(false);
        }
    };

    // Carregar funil do servidor
    useEffect(() => {
        if (!activeClient?.id) return;

        const loadFunnel = async () => {
            let targetId = funnelId;
            if (!targetId) {
                try {
                    const listRes = await fetchWithAuth(`${API_URL}/funnels`, {}, activeClient.id);
                    if (listRes.ok) {
                        const funnels = await listRes.json();
                        if (Array.isArray(funnels) && funnels.length > 0) targetId = funnels[0].id;
                    }
                } catch (e) { console.error(e); }
            }

            if (!targetId) return;

            setCurrentFunnelId(targetId);
            const res = await fetchWithAuth(`${API_URL}/funnels/${targetId}`, {}, activeClient.id);
            if (res.ok) {
                const data = await res.json();
                if (setFunnelName) setFunnelName(data.name || '');
                if (setTriggerPhrase) setTriggerPhrase(data.trigger_phrase || '');
                if (setTriggerMatchType) setTriggerMatchType(data.trigger_match_type || 'contains');
                if (setTriggerLimitType) setTriggerLimitType(data.trigger_limit_type || 'none');
                if (setIsTriggerActive) setIsTriggerActive(data.is_trigger_active !== false);
                if (setAllowedPhones) setAllowedPhones(Array.isArray(data.allowed_phones) ? data.allowed_phones.join(', ') : (data.allowed_phone || ''));
                if (setBlockedPhones) setBlockedPhones(Array.isArray(data.blocked_phones) ? data.blocked_phones.join(', ') : '');
                if (setBusinessHoursStart) setBusinessHoursStart(data.business_hours_start || '08:00');
                if (setBusinessHoursEnd) setBusinessHoursEnd(data.business_hours_end || '18:00');
                if (setBusinessHoursDays) setBusinessHoursDays(data.business_hours_days || [0, 1, 2, 3, 4]);
                if (setTriggerOnNewConversation) setTriggerOnNewConversation(Boolean(data.trigger_on_new_conversation));
                if (setTriggerNewConversationMode) setTriggerNewConversationMode(data.trigger_new_conversation_mode || 'all');

                if (data.steps && data.steps.nodes && setNodes) {
                    const loadedNodes = data.steps.nodes.map((n, index) => {
                        const position = n.position && typeof n.position.x === 'number' && typeof n.position.y === 'number'
                            ? n.position
                            : { x: 150 * (index + 1), y: 150 };

                        const isFolder = n.type === 'folderNode';

                        return {
                            ...n,
                            zIndex: isFolder ? -10 : (n.zIndex ?? 10),
                            position,
                            data: {
                                ...n.data,
                                onChange: updateNodeData,
                                onDelete: handleDeleteRequest,
                                onSetStart: setStartNode,
                                onDuplicate: handleDuplicateNode
                            }
                        };
                    });

                    // Pastas organizadoras sempre no início do array (renderizadas no fundo no DOM)
                    loadedNodes.sort((a, b) => {
                        const aFolder = a.type === 'folderNode' ? -1 : 1;
                        const bFolder = b.type === 'folderNode' ? -1 : 1;
                        return aFolder - bFolder;
                    });

                    setNodes(loadedNodes);
                    if (setEdges) setEdges(data.steps.edges || []);
                }
            }
        };
        loadFunnel();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [funnelId, activeClient?.id]);

    return {
        saving,
        currentFunnelId,
        otherActiveFunnel,
        globalVars,
        handleSave
    };
};
