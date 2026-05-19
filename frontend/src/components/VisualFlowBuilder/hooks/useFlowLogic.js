import { useState, useCallback, useEffect, useRef } from 'react';
import { applyNodeChanges, applyEdgeChanges, addEdge, useReactFlow } from 'reactflow';
import { toast } from 'react-hot-toast';
import { fetchWithAuth } from '../../../AuthContext';
import { API_URL } from '../../../config';
import { useClient } from '../../../contexts/ClientContext';

export const useFlowLogic = (funnelId, onSave, refreshKey) => {
    const { activeClient } = useClient();
    const [nodes, setNodes] = useState([]);
    const [edges, setEdges] = useState([]);
    const [saving, setSaving] = useState(false);
    const [currentFunnelId, setCurrentFunnelId] = useState(funnelId);
    const [globalVars, setGlobalVars] = useState([]);
    const [nodeToDelete, setNodeToDelete] = useState(null);
    const [menu, setMenu] = useState(null);

    // Funnel Metadata State
    const [funnelName, setFunnelName] = useState('');
    const [triggerPhrase, setTriggerPhrase] = useState('');
    const [allowedPhones, setAllowedPhones] = useState('');
    const [blockedPhones, setBlockedPhones] = useState('');
    const [showRestrictions, setShowRestrictions] = useState(false);

    // Business Hours State
    const [businessHoursStart, setBusinessHoursStart] = useState('08:00');
    const [businessHoursEnd, setBusinessHoursEnd] = useState('18:00');
    const [businessHoursDays, setBusinessHoursDays] = useState([0, 1, 2, 3, 4]);
    const [showBusinessHours, setShowBusinessHours] = useState(false);

    const reactFlowWrapper = useRef(null);
    const { project } = useReactFlow();
    const connectingNodeId = useRef(null);
    const connectingHandleId = useRef(null);

    useEffect(() => {
        if (activeClient) {
            fetchWithAuth(`${API_URL}/globals`, {}, activeClient.id)
                .then(res => res.json())
                .then(setGlobalVars)
                .catch(err => console.error("Error fetching globals:", err));
        }
    }, [activeClient]);

    const updateNodeData = useCallback((id, newData) => {
        setNodes((nds) => nds.map((node) => {
            if (node.id === id) {
                return { ...node, data: { ...node.data, ...newData } };
            }
            return node;
        }));
    }, []);

    const setStartNode = useCallback((id, type) => {
        if (type !== 'messageNode' && type !== 'mediaNode' && type !== 'audioNode' && type !== 'templateNode') {
            toast.error("Apenas 'Mensagem', 'Mídia', 'Áudio' ou 'Template' podem ser o nó inicial! 🚫");
            return;
        }

        setNodes((nds) => nds.map((node) => ({
            ...node,
            data: {
                ...node.data,
                isStart: node.id === id
            }
        })));

        setEdges((eds) => eds.filter(e => e.target !== id));
        toast.success("Nó inicial atualizado! 🏁");
    }, []);

    const handleDeleteRequest = useCallback((id) => {
        setNodeToDelete(id);
    }, []);

    const confirmDelete = useCallback(() => {
        if (!nodeToDelete) return;
        const id = nodeToDelete;
        setNodes((nds) => nds.filter((n) => n.id !== id));
        setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
        setNodeToDelete(null);
        toast.success("Nó removido com sucesso!");
    }, [nodeToDelete]);

    const cancelDelete = useCallback(() => {
        setNodeToDelete(null);
    }, []);

    const onPaneContextMenu = useCallback(
        (event) => {
            event.preventDefault();
            const pane = reactFlowWrapper.current.getBoundingClientRect();

            let top = event.clientY - pane.top;
            let left = event.clientX - pane.left;

            const menuWidth = 220;
            const menuHeight = 350;

            if (left + menuWidth > pane.width) left -= menuWidth;
            if (top + menuHeight > pane.height) top -= menuHeight;

            left = Math.max(10, left);
            top = Math.max(10, top);

            setMenu({ top, left });
        },
        []
    );

    const onPaneClick = useCallback(() => {
        setMenu(null);
        connectingNodeId.current = null;
    }, []);

    const handleAddNode = useCallback((type) => {
        if (!menu) return;

        const position = project({
            x: menu.left,
            y: menu.top,
        });

        const defaultData = {
            onChange: updateNodeData,
            onDelete: handleDeleteRequest,
            onSetStart: setStartNode
        };

        if (type === 'delayNode') {
            defaultData.time = 10;
            defaultData.unit = 'seconds';
            defaultData.useRandom = false;
        } else if (type === 'messageNode') {
            defaultData.content = '';
            defaultData.variations = [];
        } else if (type === 'randomizerNode') {
            defaultData.percentA = 50;
        } else if (type === 'conditionNode') {
            defaultData.conditionType = 'text';
        }

        setNodes((nds) => {
            const hasStartNode = nds.some(n => n.data?.isStart);
            const isStartingType = ['messageNode', 'mediaNode', 'audioNode', 'templateNode'].includes(type);

            if (!hasStartNode && isStartingType) {
                defaultData.isStart = true;
            }

            const newNode = {
                id: `node_${Date.now()}`,
                type,
                position,
                data: defaultData
            };

            const newNodes = nds.concat(newNode);

            if (menu.sourceNodeId) {
                setEdges((eds) => {
                    const filtered = eds.filter(e =>
                        !(e.source === menu.sourceNodeId && e.sourceHandle === menu.sourceHandleId)
                    );
                    return addEdge({
                        id: `e${menu.sourceNodeId}-${newNode.id}`,
                        source: menu.sourceNodeId,
                        sourceHandle: menu.sourceHandleId,
                        target: newNode.id,
                        animated: true
                    }, filtered);
                });
            }

            return newNodes;
        });

        setMenu(null);
        connectingNodeId.current = null;
    }, [menu, project, updateNodeData, handleDeleteRequest, setStartNode]);

    const onNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
    const onEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);

    const onConnect = useCallback((params) => {
        setEdges((eds) => {
            const filteredEdges = eds.filter(e =>
                !(e.source === params.source && e.sourceHandle === params.sourceHandle) &&
                !(e.target === params.target && e.targetHandle === params.targetHandle)
            );
            return addEdge({ ...params, animated: true }, filteredEdges);
        });
    }, []);

    const onConnectStart = useCallback((_, { nodeId, handleId }) => {
        connectingNodeId.current = nodeId;
        connectingHandleId.current = handleId;
    }, []);

    const onConnectEnd = useCallback(() => {
        connectingNodeId.current = null;
        connectingHandleId.current = null;
    }, []);

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
            const cleanNodes = nodes.map(n => {
                const { onChange, onDelete, onSetStart, ...restData } = n.data;
                return { ...n, data: restData };
            });

            const stepsPayload = { nodes: cleanNodes, edges };

            const getRes = await fetchWithAuth(`${API_URL}/funnels/${currentFunnelId}`, {}, activeClient.id);
            if (!getRes.ok) throw new Error("Erro ao buscar dados do funil");

            const currentFunnel = await getRes.json();

            const updatePayload = {
                name: funnelName,
                description: currentFunnel.description,
                trigger_phrase: triggerPhrase,
                allowed_phones: allowedPhones.split(',').map(p => p.trim()).filter(p => p),
                blocked_phones: blockedPhones.split(',').map(p => p.trim()).filter(p => p),
                allowed_phone: null,
                business_hours_start: businessHoursStart,
                business_hours_end: businessHoursEnd,
                business_hours_days: businessHoursDays,
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

    useEffect(() => {
        if (!activeClient) return;

        const loadFunnel = async () => {
            let targetId = funnelId;
            if (!targetId) {
                try {
                    const listRes = await fetchWithAuth(`${API_URL}/funnels`, {}, activeClient.id);
                    if (listRes.ok) {
                        const funnels = await listRes.json();
                        if (funnels.length > 0) targetId = funnels[0].id;
                    }
                } catch (e) { console.error(e); }
            }

            if (!targetId) return;

            setCurrentFunnelId(targetId);
            const res = await fetchWithAuth(`${API_URL}/funnels/${targetId}`, {}, activeClient.id);
            if (res.ok) {
                const data = await res.json();
                setFunnelName(data.name || '');
                setTriggerPhrase(data.trigger_phrase || '');
                setAllowedPhones(Array.isArray(data.allowed_phones) ? data.allowed_phones.join(', ') : (data.allowed_phone || ''));
                setBlockedPhones(Array.isArray(data.blocked_phones) ? data.blocked_phones.join(', ') : '');
                setBusinessHoursStart(data.business_hours_start || '08:00');
                setBusinessHoursEnd(data.business_hours_end || '18:00');
                setBusinessHoursDays(data.business_hours_days || [0, 1, 2, 3, 4]);

                if (data.steps && data.steps.nodes) {
                    const loadedNodes = data.steps.nodes.map(n => ({
                        ...n,
                        data: {
                            ...n.data,
                            onChange: updateNodeData,
                            onDelete: handleDeleteRequest,
                            onSetStart: setStartNode
                        }
                    }));
                    setNodes(loadedNodes);
                    setEdges(data.steps.edges || []);
                }
            }
        };
        loadFunnel();
    }, [funnelId, activeClient, updateNodeData, handleDeleteRequest, setStartNode]);

    return {
        nodes, setNodes, edges, setEdges, saving, funnelName, setFunnelName,
        triggerPhrase, setTriggerPhrase, allowedPhones, setAllowedPhones,
        blockedPhones, setBlockedPhones, showRestrictions, setShowRestrictions,
        businessHoursStart, setBusinessHoursStart, businessHoursEnd, setBusinessHoursEnd,
        businessHoursDays, setBusinessHoursDays, showBusinessHours, setShowBusinessHours,
        globalVars, nodeToDelete, menu, setMenu, reactFlowWrapper,
        onNodesChange, onEdgesChange, onConnect, onConnectStart, onConnectEnd,
        onPaneContextMenu, onPaneClick, handleAddNode, handleSave, confirmDelete, cancelDelete
    };
};
