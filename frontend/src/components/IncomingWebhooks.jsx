import React, { useState, useEffect } from 'react';
import { FiPlus, FiTrash2, FiCopy, FiCheck, FiActivity, FiGlobe, FiAlertCircle, FiEdit2, FiList, FiRefreshCw, FiMaximize2, FiMinimize2, FiType } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { fetchWithAuth } from '../AuthContext';
import { useClient } from '../contexts/ClientContext';
import { API_URL, WS_URL } from '../config';
import { FiEye, FiDownload } from 'react-icons/fi';

const COUNTRIES = [
    { name: "Brasil", ddi: "55" },
    { name: "Portugal", ddi: "351" },
    { name: "Estados Unidos", ddi: "1" },
    { name: "Espanha", ddi: "34" },
    { name: "México", ddi: "52" },
    { name: "Colômbia", ddi: "57" },
    { name: "Argentina", ddi: "54" },
    { name: "Chile", ddi: "56" },
    { name: "Peru", ddi: "51" },
    { name: "Reino Unido", ddi: "44" },
    { name: "França", ddi: "33" },
    { name: "Itália", ddi: "39" },
    { name: "Alemanha", ddi: "49" }
];

const IncomingWebhooks = () => {
    const { activeClient } = useClient();
    const [webhooks, setWebhooks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [funnels, setFunnels] = useState([]);

    // Create Config State
    // Create/Edit State
    const [isCreating, setIsCreating] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [newName, setNewName] = useState("");
    const [selectedFunnel, setSelectedFunnel] = useState("");

    // Mappings
    const [phoneField, setPhoneField] = useState("");
    const [nameField, setNameField] = useState("");
    const [defaultDdi, setDefaultDdi] = useState("Brasil");
    const [forwardUrl, setForwardUrl] = useState("");
    const [delayAmount, setDelayAmount] = useState(0);
    const [delayUnit, setDelayUnit] = useState("seconds");

    // Custom Variables Mappings [{ key: 'var_name', path: 'buyer.email'}]
    const [customMappings, setCustomMappings] = useState([]);

    // Conditional Routing
    const [conditionalField, setConditionalField] = useState("");
    const [conditionalRules, setConditionalRules] = useState([]); // [{ value: 'approved', funnel_id: 12 }]

    // Delete Confirmation
    const [webhookToDelete, setWebhookToDelete] = useState(null);

    // Logs & Events State
    const [activeLogsWebhook, setActiveLogsWebhook] = useState(null);
    const [selectedLog, setSelectedLog] = useState(null); // Para ver o payload completo
    const [payloadMaximized, setPayloadMaximized] = useState(false);
    const [logs, setLogs] = useState([]);
    const [logsLoading, setLogsLoading] = useState(false);
    const [selectedLogIds, setSelectedLogIds] = useState([]);
    const [logToDelete, setLogToDelete] = useState(null);
    const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);

    // Listening Mode States
    const [isListening, setIsListening] = useState(false);
    const [listeningPayload, setListeningPayload] = useState(null);
    const [activeListeningField, setActiveListeningField] = useState(null); // 'phone' | 'name' | 'ddi' | 'custom' | 'conditional'
    const [activeCustomIdx, setActiveCustomIdx] = useState(null);

    // Translations UI State
    const [openTransIdx, setOpenTransIdx] = useState(null);

    // Auto-update selectedLog if logs refresh (e.g. after retry)
    useEffect(() => {
        if (selectedLog) {
            const updated = logs.find(l => l.id === selectedLog.id);
            if (updated && updated !== selectedLog) {
                setSelectedLog(updated);
            }
        }
    }, [logs, selectedLog]);

    useEffect(() => {
        if (activeClient) {
            fetchWebhooks();
            fetchFunnels();
        }
    }, [activeClient]);

    // WebSocket Global: Dashboard Updates, Real-time Logs, and Listening Mode
    useEffect(() => {
        if (!activeClient?.id) return;

        let ws;
        const wsFinalUrl = WS_URL.endsWith('/ws') ? WS_URL : `${WS_URL}/ws`;

        try {
            ws = new WebSocket(wsFinalUrl);
            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    if (msg.event === "webhook_caught") {
                        const data = msg.data;

                        // 1. Dashboard: Update Counts & Timestamps
                        setWebhooks(prev => prev.map(wb => {
                            if (wb.id === data.webhook_id) {
                                return {
                                    ...wb,
                                    total_received: (wb.total_received || 0) + 1,
                                    last_triggered_at: new Date().toISOString()
                                };
                            }
                            return wb;
                        }));

                        // 2. Logs: Update if viewing specific webhook logs
                        if (activeLogsWebhook && activeLogsWebhook.id === data.webhook_id) {
                            setLogs(prevLogs => [{
                                id: data.id,
                                status: "processing",
                                created_at: new Date().toISOString(),
                                payload: data.payload,
                                headers: data.headers,
                                error_message: null
                            }, ...prevLogs]);
                        }

                        // 3. Configuration: Listening Mode (only if enabled)
                        if (isListening) {
                            if (editingId) {
                                const wb = webhooks.find(w => w.id === editingId);
                                if (wb && data.slug === wb.slug) {
                                    setListeningPayload(data.payload);
                                    toast.success("Webhook capturado!");
                                }
                            } else {
                                // For new webhooks, we might match by temporary slug or just take the latest 
                                // if logical constraint allows. Here we trust the flow.
                                setListeningPayload(data.payload);
                                toast.success("Webhook capturado!");
                            }
                        }
                    }
                } catch (err) {
                    console.error("WS Logic Error:", err);
                }
            };
        } catch (e) {
            console.error("WS Connection Error:", e);
        }

        return () => ws?.close();
    }, [activeClient?.id, isListening, editingId, activeLogsWebhook, webhooks]);

    const fetchWebhooks = async () => {
        setLoading(true);
        try {
            const res = await fetchWithAuth(`${API_URL}/webhooks/`, {}, activeClient.id);
            if (res.ok) {
                const data = await res.json();
                setWebhooks(data);
            }
        } catch (error) {
            toast.error("Erro ao carregar webhooks");
        } finally {
            setLoading(false);
        }
    };

    const fetchFunnels = async () => {
        const url = `${API_URL}/funnels`; // URL sem barra final para evitar redirects estranhos
        console.log("DEBUG: Fetching Funnels from:", url, "Client:", activeClient?.id);

        try {
            const res = await fetchWithAuth(url, {}, activeClient.id);
            if (res.ok) {
                const data = await res.json();
                console.log("DEBUG: Funnels Response Body:", data);

                if (Array.isArray(data)) {
                    setFunnels(data);
                } else if (data.data && Array.isArray(data.data)) {
                    setFunnels(data.data);
                } else {
                    console.error("DEBUG: Invalid funnels format", data);
                    setFunnels([]);
                }
            } else {
                console.error("DEBUG: Fetch Failed", res.status);
                toast.error(`Erro buscando funis: ${res.status}`);
            }
        } catch (error) {
            console.error("DEBUG: Fetch Exception", error);
            toast.error("Erro desconhecido ao buscar funis");
        }
    };

    const addCustomMapping = () => {
        setCustomMappings([...customMappings, { key: "", path: "", translations: [] }]);
    };

    const removeCustomMapping = (index) => {
        const newMappings = [...customMappings];
        newMappings.splice(index, 1);
        setCustomMappings(newMappings);
    };

    const updateCustomMapping = (index, field, value) => {
        const newMappings = [...customMappings];
        newMappings[index][field] = value;
        setCustomMappings(newMappings);
    };

    const addTranslationPair = (idx) => {
        const newMappings = [...customMappings];
        if (!newMappings[idx].translations) newMappings[idx].translations = [];
        newMappings[idx].translations.push({ from: "", to: "" });
        setCustomMappings(newMappings);
    };

    const updateTranslationPair = (mapIdx, transIdx, field, value) => {
        const newMappings = [...customMappings];
        newMappings[mapIdx].translations[transIdx][field] = value;
        setCustomMappings(newMappings);
    };

    const removeTranslationPair = (mapIdx, transIdx) => {
        const newMappings = [...customMappings];
        newMappings[mapIdx].translations.splice(transIdx, 1);
        setCustomMappings(newMappings);
    };

    // Conditional Helpers
    const addConditionalRule = () => {
        setConditionalRules([...conditionalRules, { value: "", funnel_id: "" }]);
    };
    const removeConditionalRule = (index) => {
        const newRules = [...conditionalRules];
        newRules.splice(index, 1);
        setConditionalRules(newRules);
    };
    const updateConditionalRule = (index, field, value) => {
        const newRules = [...conditionalRules];
        newRules[index][field] = value;
        setConditionalRules(newRules);
    };

    const handleEdit = (wb) => {
        setEditingId(wb.id);
        setNewName(wb.name);
        setSelectedFunnel(wb.funnel_id.toString());
        setPhoneField(wb.field_mapping?.phone_field || "");
        setNameField(wb.field_mapping?.name_field || "");
        setDefaultDdi(wb.field_mapping?.default_ddi || "Brasil");
        setForwardUrl(wb.forward_url || "");
        setDelayAmount(wb.delay_amount || 0);
        setDelayUnit(wb.delay_unit || "seconds");

        // Persistir o payload de mapeamento se existir
        if (wb.last_payload) {
            setListeningPayload(wb.last_payload);
            setIsListening(true);
        }

        // Custom mappings
        const customs = [];
        const transData = wb.field_mapping?.translations || {};
        if (wb.field_mapping?.custom_variables) {
            Object.entries(wb.field_mapping.custom_variables).forEach(([key, path]) => {
                const fieldTrans = transData[key] || {};
                const transArray = Object.entries(fieldTrans).map(([from, to]) => ({ from, to }));
                customs.push({ key, path, translations: transArray });
            });
        }
        setCustomMappings(customs);

        // Conditional Routing
        const cond = wb.field_mapping?.conditional_routing || {};
        setConditionalField(cond.field_path || "");
        setConditionalRules(cond.rules || []);

        setIsCreating(true);
    };

    const handleCreate = async () => {
        if (!newName || !selectedFunnel) {
            toast.error("Nome e Funil são obrigatórios");
            return;
        }

        const mapping = {
            custom_variables: {}
        };

        if (phoneField) mapping.phone_field = phoneField;
        if (nameField) mapping.name_field = nameField;
        mapping.default_ddi = defaultDdi;

        // Add Conditional Routing to mapping
        if (conditionalField && conditionalRules.length > 0) {
            mapping.conditional_routing = {
                field_path: conditionalField,
                rules: conditionalRules.filter(r => r.value && r.funnel_id)
            };
        }

        customMappings.forEach(m => {
            if (m.key || m.path) {
                mapping.custom_variables[m.key || ""] = m.path || "";

                // Salvar traduções se existirem
                if (m.translations && m.translations.length > 0) {
                    if (!mapping.translations) mapping.translations = {};
                    const tMap = {};
                    m.translations.forEach(t => {
                        if (t.from) tMap[t.from] = t.to || t.from;
                    });
                    if (Object.keys(tMap).length > 0) {
                        mapping.translations[m.key] = tMap;
                    }
                }
            }
        });

        const method = editingId ? 'PUT' : 'POST';
        const url = editingId ? `${API_URL}/webhooks/${editingId}` : `${API_URL}/webhooks/`;

        try {
            const res = await fetchWithAuth(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newName,
                    funnel_id: parseInt(selectedFunnel),
                    field_mapping: mapping,
                    forward_url: forwardUrl,
                    delay_amount: parseInt(delayAmount),
                    delay_unit: delayUnit,
                    last_payload: listeningPayload
                })
            }, activeClient.id);

            if (res.ok) {
                toast.success(editingId ? "Webhook atualizado!" : "Webhook criado!");
                resetForm();
                fetchWebhooks();
            } else {
                toast.error("Erro ao salvar webhook");
            }
        } catch (e) {
            toast.error("Erro de conexão");
        }
    };

    const resetForm = () => {
        setNewName("");
        setSelectedFunnel("");
        setPhoneField("");
        setNameField("");
        setDefaultDdi("Brasil");
        setForwardUrl("");
        setDelayAmount(0);
        setDelayUnit("seconds");
        setCustomMappings([]);
        setConditionalField("");
        setConditionalRules([]);
        setEditingId(null);
        setIsCreating(false);
        setIsListening(false);
        setListeningPayload(null);
        setActiveListeningField(null);
        setOpenTransIdx(null);
    };

    // Helper to render JSON visually and select paths
    const renderJsonPicker = (data, path = "") => {
        if (typeof data !== 'object' || data === null) {
            return (
                <span
                    onClick={() => handlePathSelect(path)}
                    className="cursor-pointer bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors border border-blue-200 dark:border-blue-700"
                >
                    {JSON.stringify(data)}
                </span>
            );
        }

        return (
            <div className="pl-4 border-l border-gray-200 dark:border-gray-700 my-1">
                {Object.entries(data).map(([key, val]) => {
                    const currentPath = path ? `${path}.${key}` : key;
                    return (
                        <div key={key} className="flex flex-wrap items-baseline gap-2 py-0.5">
                            <span className="text-gray-500 dark:text-gray-400 font-mono text-[11px]">{key}:</span>
                            {renderJsonPicker(val, currentPath)}
                        </div>
                    );
                })}
            </div>
        );
    };

    const handlePathSelect = (path) => {
        const appendFallback = (current, setter) => {
            if (!current || current.trim() === "") {
                setter(path);
                toast.success(`Caminho selecionado: ${path}`);
                return;
            }

            // Verifica se o caminho exato já existe na lista
            const existingPaths = current.split('||').map(p => p.trim());
            if (!existingPaths.includes(path)) {
                setter(`${current} || ${path}`);
                toast.success(`Fallback adicionado: ${path}`);
            } else {
                toast.error("Este caminho já está no mapeamento.");
            }
        };

        if (activeListeningField === 'phone') {
            appendFallback(phoneField, setPhoneField);
        } else if (activeListeningField === 'name') {
            appendFallback(nameField, setNameField);
        } else if (activeListeningField === 'ddi') {
            appendFallback(defaultDdi, setDefaultDdi);
        } else if (activeListeningField === 'custom' && activeCustomIdx !== null) {
            const currentPath = customMappings[activeCustomIdx]?.path || "";
            if (!currentPath || currentPath.trim() === "") {
                updateCustomMapping(activeCustomIdx, 'path', path);
                toast.success(`Caminho selecionado: ${path}`);
            } else {
                const existingPaths = currentPath.split('||').map(p => p.trim());
                if (!existingPaths.includes(path)) {
                    updateCustomMapping(activeCustomIdx, 'path', `${currentPath} || ${path}`);
                    toast.success(`Fallback adicionado: ${path}`);
                } else {
                    toast.error("Este caminho já está no mapeamento.");
                }
            }
        } else if (activeListeningField === 'conditional') {
            setConditionalField(path);
            toast.success(`Campo de condição selecionado: ${path}`);
        }
    };

    const handleUseLogForMapping = (log) => {
        const webhookToEdit = activeLogsWebhook;
        if (!webhookToEdit) return;

        // 1. Abrir formulário de edição
        handleEdit(webhookToEdit);

        // 2. Fechar as janelas de logs
        setSelectedLog(null);
        setActiveLogsWebhook(null);

        // 3. Injetar o payload no modo de mapeamento
        setIsListening(true);
        setListeningPayload(log.payload);

        toast.success("JSON do histórico carregado no mapeador!");
    };

    const handleDelete = async (id) => {
        setWebhookToDelete(id);
    };

    const confirmDelete = async () => {
        if (!webhookToDelete) return;

        try {
            const res = await fetchWithAuth(`${API_URL}/webhooks/${webhookToDelete}`, {
                method: 'DELETE'
            }, activeClient.id);

            if (res.ok) {
                toast.success("Webhook excluído com sucesso!");
                setWebhookToDelete(null);
                fetchWebhooks();
            } else {
                toast.error("Erro ao excluir webhook");
            }
        } catch (e) {
            toast.error("Erro de conexão");
        }
    };

    // --- Logs Logic ---
    const handleShowLogs = (wb) => {
        setActiveLogsWebhook(wb);
        fetchLogs(wb.id);
    };

    const renderPathWithHighlight = (fullPath, matchedPath) => {
        if (!fullPath && !matchedPath) return null;

        // Se for heurística/busca automática
        if (matchedPath && matchedPath.startsWith('auto:')) {
            return (
                <span className="text-[10px] text-blue-500 dark:text-blue-400 block mt-1 italic font-medium flex items-center gap-1">
                    <FiActivity size={10} /> Encontrado via Busca Automática: <span className="underline">{matchedPath.replace('auto:', '')}</span>
                </span>
            );
        }

        if (!matchedPath) {
            return <span className="text-[10px] text-gray-400 block mt-1 italic">Mapeamento: {fullPath || "Nenhum"}</span>;
        }

        const parts = String(fullPath).split('||').map(p => p.trim());
        return (
            <span className="text-[10px] text-gray-400 block mt-1 break-all">
                Path: {parts.map((p, idx) => (
                    <React.Fragment key={idx}>
                        {idx > 0 && <span className="mx-1 text-gray-600">||</span>}
                        <span className={p === matchedPath ? "text-green-600 dark:text-green-400 font-bold bg-green-500/10 dark:bg-green-500/20 px-1 rounded border border-green-500/30" : "opacity-60"}>
                            {p}
                        </span>
                    </React.Fragment>
                ))}
            </span>
        );
    };

    const fetchLogs = async (wbId) => {
        setLogsLoading(true);
        try {
            const res = await fetchWithAuth(`${API_URL}/webhooks/${wbId}/events`, {}, activeClient.id);
            if (res.ok) {
                const data = await res.json();
                setLogs(data);
            } else {
                toast.error("Erro ao carregar logs");
            }
        } catch (error) {
            toast.error("Erro de conexão (logs)");
        } finally {
            setLogsLoading(false);
        }
    };

    const retryEvent = async (eventId) => {
        const toastId = toast.loading("Re-enviando...");
        try {
            const res = await fetchWithAuth(`${API_URL}/webhooks/events/${eventId}/retry`, {
                method: 'POST'
            }, activeClient.id);

            if (res.ok) {
                const data = await res.json();
                if (data.status === 'retried' || data.status === 'success') {
                    toast.success("Re-processado com sucesso!", { id: toastId });
                    fetchLogs(activeLogsWebhook.id);
                    fetchWebhooks(); // atualiza counts
                } else {
                    toast.error(`Falha: ${data.message || data.error}`, { id: toastId });
                }
            } else {
                toast.error("Erro ao solicitar retry", { id: toastId });
            }
        } catch (error) {
            toast.error("Erro de conexão", { id: toastId });
        }
    };

    const deleteLog = async (id) => {
        try {
            const res = await fetchWithAuth(`${API_URL}/webhooks/events/${id}`, {
                method: 'DELETE'
            }, activeClient.id);
            if (res.ok) {
                toast.success("Log removido");
                setLogs(prev => prev.filter(l => l.id !== id));
                setSelectedLogIds(prev => prev.filter(i => i !== id));
                fetchWebhooks(); // Refresh webhook stats (counters)
            }
        } catch (e) {
            toast.error("Erro ao deletar");
        } finally {
            setLogToDelete(null);
        }
    };

    const bulkDeleteLogs = async () => {
        if (selectedLogIds.length === 0) return;
        const toastId = toast.loading("Removendo logs...");
        try {
            const res = await fetchWithAuth(`${API_URL}/webhooks/events/bulk-delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(selectedLogIds)
            }, activeClient.id);
            if (res.ok) {
                toast.success(`${selectedLogIds.length} logs removidos`, { id: toastId });
                setLogs(prev => prev.filter(l => !selectedLogIds.includes(l.id)));
                setSelectedLogIds([]);
                setShowBatchDeleteModal(false);
                fetchWebhooks(); // Refresh webhook stats (counters)
            } else {
                toast.error("Erro ao deletar em massa", { id: toastId });
            }
        } catch (e) {
            toast.error("Erro de conexão", { id: toastId });
        }
    };

    const toggleLogSelection = (id) => {
        setSelectedLogIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleSelectAllLogs = () => {
        if (selectedLogIds.length === logs.length && logs.length > 0) {
            setSelectedLogIds([]);
        } else {
            setSelectedLogIds(logs.map(l => l.id));
        }
    };

    const copyToClipboard = (slug) => {
        const url = `${window.location.protocol}//${window.location.host}/api/webhooks/catch/${slug}`;
        navigator.clipboard.writeText(url);
        toast.success("URL copiada!");
    };

    return (

        <div className="p-6 h-full flex flex-col gap-6 bg-gray-50/50 dark:bg-gray-900/50">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold mb-1 flex items-center gap-2 dark:text-white">
                        <FiGlobe className="text-blue-500" /> Webhooks de Entrada
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                        Receba dados de APIs externas e inicie funis.
                    </p>
                </div>
                {!isCreating && (
                    <div className="flex gap-2">
                        <button
                            onClick={fetchWebhooks}
                            className="flex items-center gap-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg transition-colors font-medium shadow-sm border border-gray-200 dark:border-gray-700"
                            title="Atualizar Lista"
                        >
                            <FiRefreshCw className={loading ? "animate-spin" : ""} />
                        </button>
                        <button
                            onClick={() => setIsCreating(true)}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium shadow-sm"
                        >
                            <FiPlus /> Novo Webhook
                        </button>
                    </div>
                )}
            </div>

            {/* Criar Webhook Modal/Card */}
            {isCreating && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 animate-in slide-in-from-top-4 duration-200 flex flex-col max-h-[85vh]">
                    <div className="p-6 overflow-y-auto flex-1">
                        <h3 className="font-bold text-lg mb-4 dark:text-white">
                            {editingId ? "Editar Webhook" : "Novo Webhook"}
                        </h3>

                        {/* Linha 1 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome da Integração</label>
                                <input
                                    type="text"
                                    className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none transition"
                                    placeholder="Ex: Lead Works"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Funil a Disparar</label>
                                <select
                                    className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none transition"
                                    value={selectedFunnel}
                                    onChange={(e) => setSelectedFunnel(e.target.value)}
                                >
                                    <option value="">Selecione um funil...</option>
                                    {Array.isArray(funnels) && funnels.map(f => (
                                        <option key={f.id} value={f.id}>{f.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Mapeamento Obrigatório */}
                        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Mapeamento Básico (Obrigatório)</span>
                                {editingId && !isListening && (
                                    <button
                                        onClick={() => setIsListening(true)}
                                        className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-md hover:bg-blue-200 transition-colors flex items-center gap-1 font-bold"
                                    >
                                        <FiActivity size={10} /> Mapeamento Assistido
                                    </button>
                                )}
                            </div>

                            {isListening && !listeningPayload && (
                                <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl text-center animate-pulse">
                                    <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                                        🔌 Aguardando envio do webhook para {newName || 'API'}...
                                    </p>
                                    <p className="text-[10px] text-blue-500 mt-1 italic">
                                        Envie os dados para a URL do webhook agora para capturarmos os campos.
                                    </p>
                                    <button onClick={() => setIsListening(false)} className="mt-2 text-xs text-blue-500 underline">Cancelar</button>
                                </div>
                            )}

                            {isListening && listeningPayload && (
                                <div className="mb-6 p-4 bg-white dark:bg-gray-800 border-2 border-blue-500/50 rounded-xl shadow-inner relative">
                                    <div className="absolute top-2 right-2 flex gap-2">
                                        <button onClick={() => setListeningPayload(null)} className="text-[10px] text-gray-400 hover:text-gray-600">Limpar</button>
                                        <button onClick={() => setIsListening(false)} className="text-[10px] text-gray-400 hover:text-red-500">Fechar</button>
                                    </div>
                                    <h4 className="text-[10px] font-bold text-blue-500 uppercase mb-2 flex items-center gap-1">
                                        <FiEye size={12} /> Payload Recebido - Clique no valor para mapear:
                                    </h4>
                                    <div className="max-h-60 overflow-y-auto bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border dark:border-gray-700">
                                        {renderJsonPicker(listeningPayload)}
                                    </div>
                                    <p className="text-[10px] text-blue-500 mt-2 italic">
                                        💡 Dica: Clique em valores diferentes para adicionar "Fallbacks" (se o primeiro caminho falhar, tentamos o segundo).
                                    </p>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 flex justify-between items-center">
                                        <span>Campo do Telefone (JSON Path)</span>
                                        {isListening && listeningPayload && (
                                            <button
                                                onClick={() => setActiveListeningField('phone')}
                                                className={`text-[9px] px-1.5 py-0.5 rounded cursor-pointer ${activeListeningField === 'phone' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}
                                            >
                                                {activeListeningField === 'phone' ? 'Aguardando Clique' : 'Mapear este'}
                                            </button>
                                        )}
                                    </label>
                                    <input
                                        type="text"
                                        className={`w-full text-sm border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg p-2 font-mono transition-all ${activeListeningField === 'phone' ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/50' : ''}`}
                                        placeholder="Ex: buyer.phone"
                                        value={phoneField}
                                        onChange={(e) => setPhoneField(e.target.value)}
                                    />
                                    <p className="text-[9px] text-gray-400 mt-1">Identificador do telefone. Use || para caminhos secundários (fallback).</p>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 flex justify-between items-center">
                                        <span>País Padrão (DDI)</span>
                                        {isListening && listeningPayload && (
                                            <button
                                                onClick={() => setActiveListeningField('ddi')}
                                                className={`text-[9px] px-1.5 py-0.5 rounded cursor-pointer ${activeListeningField === 'ddi' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}
                                            >
                                                {activeListeningField === 'ddi' ? 'Aguardando Clique' : 'Mapear JSON'}
                                            </button>
                                        )}
                                    </label>

                                    {/* Se o valor parecer um PATH (contém pontos ou não está na lista de países), mostra input de texto. Senão, mostra select. */}
                                    {(defaultDdi.includes('.') || !COUNTRIES.some(c => c.name === defaultDdi)) ? (
                                        <div className="relative">
                                            <input
                                                type="text"
                                                className={`w-full text-sm border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg p-2 font-mono transition-all ${activeListeningField === 'ddi' ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/50' : ''}`}
                                                placeholder="Ex: buyer.country"
                                                value={defaultDdi}
                                                onChange={(e) => setDefaultDdi(e.target.value)}
                                            />
                                            <button
                                                onClick={() => setDefaultDdi("Brasil")}
                                                className="absolute right-2 top-2 text-[10px] text-blue-500 hover:underline"
                                                title="Voltar para lista de seleção"
                                            >
                                                Usar Lista
                                            </button>
                                        </div>
                                    ) : (
                                        <select
                                            className="w-full text-sm border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg p-2 outline-none"
                                            value={defaultDdi}
                                            onChange={(e) => setDefaultDdi(e.target.value)}
                                        >
                                            {COUNTRIES.map(c => (
                                                <option key={c.name} value={c.name}>
                                                    {c.name} (+{c.ddi})
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                    <p className="text-[9px] text-gray-400 mt-1">Selecione na lista OU mapeie caminhos JSON com || para fallback.</p>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 flex justify-between items-center">
                                        <span>Campo do Nome (JSON Path)</span>
                                        {isListening && listeningPayload && (
                                            <button
                                                onClick={() => setActiveListeningField('name')}
                                                className={`text-[9px] px-1.5 py-0.5 rounded cursor-pointer ${activeListeningField === 'name' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}
                                            >
                                                {activeListeningField === 'name' ? 'Aguardando Clique' : 'Mapear este'}
                                            </button>
                                        )}
                                    </label>
                                    <input
                                        type="text"
                                        className={`w-full text-sm border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg p-2 font-mono transition-all ${activeListeningField === 'name' ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/50' : ''}`}
                                        placeholder="Ex: buyer.full_name"
                                        value={nameField}
                                        onChange={(e) => setNameField(e.target.value)}
                                    />
                                    <p className="text-[9px] text-gray-400 mt-1">Nome do contato. Aceita múltiplos caminhos com ||.</p>
                                </div>
                            </div>
                        </div>

                        {/* Mapeamento Variáveis Extras */}
                        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Mapeamento de Variáveis (Opcional)</span>
                                <button onClick={addCustomMapping} className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1">
                                    <FiPlus /> Adicionar Campo
                                </button>
                            </div>
                            <div className="space-y-3">
                                {customMappings.map((map, idx) => (
                                    <div key={idx} className="space-y-2">
                                        <div className="flex gap-2 items-center">
                                            <input
                                                type="text"
                                                placeholder="Variável (ex: status)"
                                                className="flex-1 text-sm border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg p-2 font-mono"
                                                value={map.key}
                                                onChange={(e) => updateCustomMapping(idx, 'key', e.target.value)}
                                            />
                                            <span className="text-gray-400">➜</span>
                                            <div className="flex-[1.5] relative">
                                                <input
                                                    type="text"
                                                    placeholder="Caminho JSON (ex: purchase.status)"
                                                    className={`w-full text-sm border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg p-2 font-mono ${activeListeningField === 'custom' && activeCustomIdx === idx ? 'ring-2 ring-blue-500 border-blue-500' : ''}`}
                                                    value={map.path}
                                                    onChange={(e) => updateCustomMapping(idx, 'path', e.target.value)}
                                                />
                                                {isListening && listeningPayload && (
                                                    <button
                                                        onClick={() => { setActiveListeningField('custom'); setActiveCustomIdx(idx); }}
                                                        className={`absolute right-2 top-1.5 text-[8px] px-1 py-0.5 rounded ${activeListeningField === 'custom' && activeCustomIdx === idx ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}
                                                    >
                                                        {activeListeningField === 'custom' && activeCustomIdx === idx ? 'Aguardando' : 'Mapear'}
                                                    </button>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => setOpenTransIdx(openTransIdx === idx ? null : idx)}
                                                className={`p-2 rounded transition-colors ${openTransIdx === idx ? 'bg-blue-600 text-white' : 'hover:bg-blue-50 text-blue-600'}`}
                                                title="Definir Traduções (Renomear valores)"
                                            >
                                                <FiType size={18} />
                                            </button>
                                            <button onClick={() => removeCustomMapping(idx)} className="text-red-500 p-2 hover:bg-red-50 rounded">
                                                <FiTrash2 />
                                            </button>
                                        </div>

                                        {/* Translation Editor Area */}
                                        {openTransIdx === idx && (
                                            <div className="ml-8 p-3 bg-blue-50/50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800 animate-in slide-in-from-top-2">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-[10px] font-bold text-blue-600 uppercase">Tradução de Valores para "{map.key || 'campo'}"</span>
                                                    <button onClick={() => addTranslationPair(idx)} className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded hover:bg-blue-700">
                                                        + Nova Tradução
                                                    </button>
                                                </div>
                                                <div className="space-y-2">
                                                    {(map.translations || []).map((t, tIdx) => (
                                                        <div key={tIdx} className="flex gap-2 items-center">
                                                            <input
                                                                type="text"
                                                                placeholder="Se vier assim (ex: Approved)"
                                                                className="flex-1 text-[11px] border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded p-1.5"
                                                                value={t.from}
                                                                onChange={(e) => updateTranslationPair(idx, tIdx, 'from', e.target.value)}
                                                            />
                                                            <span className="text-gray-400">➜</span>
                                                            <input
                                                                type="text"
                                                                placeholder="Renomear para (ex: Compra Aprovada)"
                                                                className="flex-1 text-[11px] border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded p-1.5"
                                                                value={t.to}
                                                                onChange={(e) => updateTranslationPair(idx, tIdx, 'to', e.target.value)}
                                                            />
                                                            <button onClick={() => removeTranslationPair(idx, tIdx)} className="text-red-400 hover:text-red-600">
                                                                <FiTrash2 size={12} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    {(map.translations || []).length === 0 && (
                                                        <p className="text-[10px] text-gray-400 italic">Nenhuma tradução definida. O valor virá original da API.</p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {customMappings.length === 0 && (
                                    <p className="text-xs text-gray-400 italic">Nenhuma variável extra mapeada.</p>
                                )}
                            </div>
                        </div>

                        {/* Roteamento Condicional (NOVO) */}
                        <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-200 dark:border-orange-800/50">
                            <div className="flex justify-between items-center mb-3">
                                <div>
                                    <span className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 flex items-center gap-1">
                                        <FiList /> Disparo Condicional (Opcional)
                                    </span>
                                    <p className="text-[10px] text-gray-500 mt-1 max-w-sm leading-tight">
                                        Substitui o Funil Principal se o valor de um campo for igual a uma regra.
                                    </p>
                                </div>
                                <button onClick={addConditionalRule} className="text-xs text-orange-600 hover:text-orange-700 font-bold flex items-center gap-1 bg-white px-2 py-1 rounded border border-orange-200 shadow-sm">
                                    <FiPlus /> Nova Regra
                                </button>
                            </div>

                            <div className="mb-4">
                                <label className="text-xs text-gray-500 mb-1 flex justify-between items-center">
                                    <span>Campo para Verificar (JSON Path)</span>
                                    {isListening && listeningPayload && (
                                        <button
                                            onClick={() => setActiveListeningField('conditional')}
                                            className={`text-[9px] px-1.5 py-0.5 rounded cursor-pointer ${activeListeningField === 'conditional' ? 'bg-orange-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}
                                        >
                                            {activeListeningField === 'conditional' ? 'Aguardando Clique' : 'Mapear este'}
                                        </button>
                                    )}
                                </label>
                                <input
                                    type="text"
                                    className={`w-full text-sm border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg p-2 font-mono transition-all ${activeListeningField === 'conditional' ? 'ring-2 ring-orange-500 border-orange-500 bg-orange-50' : ''}`}
                                    placeholder="Ex: body.current_status"
                                    value={conditionalField}
                                    onChange={(e) => setConditionalField(e.target.value)}
                                />
                            </div>

                            {conditionalRules.length > 0 && (
                                <div className="space-y-2">
                                    <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-gray-400 uppercase">
                                        <div className="col-span-4">Valor Esperado</div>
                                        <div className="col-span-1 text-center">=</div>
                                        <div className="col-span-6">Disparar Este Funil</div>
                                        <div className="col-span-1"></div>
                                    </div>
                                    {conditionalRules.map((rule, idx) => (
                                        <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                                            <div className="col-span-4">
                                                <input
                                                    type="text"
                                                    placeholder="Ex: approved"
                                                    className="w-full text-sm border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg p-2 font-mono"
                                                    value={rule.value}
                                                    onChange={(e) => updateConditionalRule(idx, 'value', e.target.value)}
                                                />
                                            </div>
                                            <div className="col-span-1 text-center text-gray-400">➜</div>
                                            <div className="col-span-6">
                                                <select
                                                    className="w-full text-sm border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg p-2 outline-none"
                                                    value={rule.funnel_id}
                                                    onChange={(e) => updateConditionalRule(idx, 'funnel_id', e.target.value)}
                                                >
                                                    <option value="">Selecione...</option>
                                                    {Array.isArray(funnels) && funnels.map(f => (
                                                        <option key={f.id} value={f.id}>{f.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="col-span-1 flex justify-end">
                                                <button onClick={() => removeConditionalRule(idx)} className="text-red-500 p-2 hover:bg-red-50 rounded">
                                                    <FiTrash2 />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {conditionalRules.length === 0 && (
                                <p className="text-xs text-gray-400 italic text-center py-2 bg-white/50 dark:bg-black/20 rounded border border-dashed border-gray-200">
                                    Nenhuma regra condicional. O funil padrão será sempre usado.
                                </p>
                            )}
                        </div>

                        {/* Forwarding */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Encaminhar Webhook (Forwarding)
                            </label>
                            <p className="text-xs text-gray-500 mb-2">Se preenchido, enviaremos uma cópia exata do JSON recebido para esta URL.</p>
                            <input
                                type="text"
                                className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg p-2 placeholder-gray-400"
                                placeholder="https://n8n.seu-servidor.com/webhook/..."
                                value={forwardUrl}
                                onChange={(e) => setForwardUrl(e.target.value)}
                            />
                        </div>

                        {/* Delay Config */}
                        <div className="mb-6 p-4 bg-blue-50/30 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-800/50">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Delay de Disparo
                            </label>
                            <p className="text-xs text-gray-500 mb-3">Aguardar este tempo antes de iniciar o funil após receber o webhook.</p>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <input
                                        type="number"
                                        min="0"
                                        className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg p-2"
                                        value={delayAmount}
                                        onChange={(e) => setDelayAmount(e.target.value)}
                                    />
                                </div>
                                <div className="flex-1">
                                    <select
                                        className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg p-2"
                                        value={delayUnit}
                                        onChange={(e) => setDelayUnit(e.target.value)}
                                    >
                                        <option value="seconds">Segundos</option>
                                        <option value="minutes">Minutos</option>
                                        <option value="hours">Horas</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                    </div>

                    <div className="p-4 bg-gray-50/50 dark:bg-gray-900/40 border-t dark:border-gray-700 flex justify-end gap-3 rounded-b-xl">
                        <button
                            onClick={resetForm}
                            className="px-6 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition font-bold text-sm"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleCreate}
                            className="px-8 py-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg shadow-lg transition font-bold text-sm"
                        >
                            {editingId ? "Salvar Alterações" : "Criar Webhook"}
                        </button>
                    </div>
                </div>
            )
            }

            {/* Lista Webhooks Existentes */}
            {
                !isCreating && (
                    <div className="grid grid-cols-1 gap-4 pb-12">
                        {webhooks.length === 0 && !loading && (
                            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                                <FiActivity className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Nenhum webhook configurado</h3>
                                <p className="text-gray-500 dark:text-gray-400">Crie um webhook para integrar with plataformas externas.</p>
                            </div>
                        )}

                        {webhooks.map(wb => (
                            <div key={wb.id} className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col gap-4 transition hover:shadow-md">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                            {wb.name}
                                            <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                                                Funil: {funnels.find(f => f.id === wb.funnel_id)?.name || `#${wb.funnel_id}`}
                                            </span>
                                        </h3>

                                        {/* Status Badge */}
                                        <div className="flex items-center gap-2 mt-1">
                                            {(() => {
                                                if (!wb.last_triggered_at) {
                                                    return <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded flex items-center gap-1">🌑 Nunca acionado</span>;
                                                }
                                                const diff = (new Date() - new Date(wb.last_triggered_at)) / 1000 / 60; // minutes
                                                if (diff < 60) {
                                                    return <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded flex items-center gap-1 animate-pulse">🟢 Ativo agora</span>;
                                                } else if (diff < 1440) { // 24h
                                                    return <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded flex items-center gap-1">🟡 Recente</span>;
                                                } else {
                                                    return <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded flex items-center gap-1">⚪ Inativo (+24h)</span>;
                                                }
                                            })()}
                                            <span className="text-[10px] text-gray-400">
                                                {wb.last_triggered_at ? `Último: ${new Date(wb.last_triggered_at).toLocaleString()}` : ''}
                                            </span>
                                        </div>

                                        {wb.forward_url && (
                                            <div className="mt-1 text-xs text-purple-600 dark:text-purple-400 flex items-center gap-1">
                                                <span className="font-bold">Encaminhando para:</span> {wb.forward_url}
                                            </div>
                                        )}

                                        <div className="mt-3 flex items-center gap-2 bg-gray-100 dark:bg-gray-900 p-2 rounded-lg border border-gray-200 dark:border-gray-700 max-w-2xl">
                                            <span className="text-xs font-mono text-gray-500 select-none">POST</span>
                                            <code className="text-xs md:text-sm text-gray-800 dark:text-gray-300 font-mono truncate flex-1">
                                                {API_URL}/webhooks/catch/{wb.slug}
                                            </code>
                                            <button
                                                onClick={() => copyToClipboard(wb.slug)}
                                                className="p-1.5 hover:bg-white dark:hover:bg-gray-700 rounded-md text-gray-600 dark:text-gray-400 transition"
                                                title="Copiar URL"
                                            >
                                                <FiCopy />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <div className="flex gap-4 text-sm text-gray-500 dark:text-gray-400">
                                            <div className="text-center">
                                                <span className="block font-bold text-gray-900 dark:text-white text-lg">{wb.total_received}</span>
                                                <span className="text-xs">Recebidos</span>
                                            </div>
                                            <div className="text-center">
                                                <span className="block font-bold text-green-600 text-lg">{wb.total_processed}</span>
                                                <span className="text-xs">Processados</span>
                                            </div>
                                            <div className="text-center">
                                                <span className="block font-bold text-red-500 text-lg">{wb.total_errors}</span>
                                                <span className="text-xs">Erros</span>
                                            </div>
                                        </div>

                                        <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 hidden md:block"></div>

                                        <button
                                            onClick={() => handleShowLogs(wb)}
                                            className="p-2 text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition"
                                            title="Ver Histórico/Logs"
                                        >
                                            <FiList size={18} />
                                        </button>

                                        <button
                                            onClick={() => handleEdit(wb)}
                                            className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
                                            title="Editar"
                                        >
                                            <FiEdit2 size={18} />
                                        </button>

                                        <button
                                            onClick={() => handleDelete(wb.id)}
                                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                                            title="Excluir"
                                        >
                                            <FiTrash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            }

            {/* Modal de Logs */}
            {
                activeLogsWebhook && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setActiveLogsWebhook(null)}></div>
                        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 p-6 w-full max-w-4xl h-[80vh] flex flex-col animate-in zoom-in-95">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold dark:text-white flex items-center gap-2">
                                    <FiActivity /> Logs: {activeLogsWebhook.name}
                                </h3>
                                <div className="flex gap-2">
                                    {selectedLogIds.length > 0 && (
                                        <button
                                            onClick={() => setShowBatchDeleteModal(true)}
                                            className="px-3 py-1 text-sm bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 transition font-bold flex items-center gap-1"
                                        >
                                            <FiTrash2 size={14} /> Apagar Selecionados ({selectedLogIds.length})
                                        </button>
                                    )}
                                    <button
                                        onClick={() => fetchLogs(activeLogsWebhook.id)}
                                        className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 transition dark:text-gray-200"
                                    >
                                        Atualizar
                                    </button>
                                    <button onClick={() => setActiveLogsWebhook(null)} className="text-gray-400 hover:text-gray-600">✕</button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto">
                                {logsLoading ? (
                                    <div className="text-center py-10 text-gray-400">Carregando logs...</div>
                                ) : logs.length === 0 ? (
                                    <div className="text-center py-10 text-gray-400">Nenhum evento registrado.</div>
                                ) : (
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 font-medium sticky top-0 z-10">
                                            <tr>
                                                <th className="p-3 w-10">
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                        checked={logs.length > 0 && selectedLogIds.length === logs.length}
                                                        onChange={handleSelectAllLogs}
                                                    />
                                                </th>
                                                <th className="p-3">Data/Hora</th>
                                                <th className="p-3">Status</th>
                                                <th className="p-3">Payload Preview</th>
                                                <th className="p-3">Erro</th>
                                                <th className="p-3 text-right">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                            {logs.map(log => (
                                                <tr key={log.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${selectedLogIds.includes(log.id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                                                    <td className="p-3">
                                                        <input
                                                            type="checkbox"
                                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                            checked={selectedLogIds.includes(log.id)}
                                                            onChange={() => toggleLogSelection(log.id)}
                                                        />
                                                    </td>
                                                    <td className="p-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                                        {new Date(log.created_at).toLocaleString()}
                                                    </td>
                                                    <td className="p-3">
                                                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${log.status === 'processed' ? 'bg-green-100 text-green-700' :
                                                            log.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                                            }`}>
                                                            {log.status}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 font-mono text-xs text-gray-500 max-w-[200px] truncate" title="Clique para ver o JSON completo">
                                                        <button
                                                            onClick={() => setSelectedLog(log)}
                                                            className="text-blue-500 hover:underline text-left block truncate w-full"
                                                        >
                                                            {JSON.stringify(log.payload)}
                                                        </button>
                                                    </td>
                                                    <td className="p-3 text-red-500 text-xs max-w-[150px] truncate" title={log.error_message}>
                                                        {log.error_message || "-"}
                                                    </td>
                                                    <td className="p-3 text-right">
                                                        <div className="flex justify-end gap-1">
                                                            <button
                                                                onClick={() => handleUseLogForMapping(log)}
                                                                className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded transition-colors"
                                                                title="Mapear"
                                                            >
                                                                <FiActivity size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => retryEvent(log.id)}
                                                                className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/40 rounded transition-colors"
                                                                title="Re-processar"
                                                            >
                                                                <FiRefreshCw size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => setLogToDelete(log.id)}
                                                                className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 rounded transition-colors"
                                                                title="Excluir Log"
                                                            >
                                                                <FiTrash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Modal de Detalhes do Payload (Sub-modal) */}
            {
                selectedLog && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => { setSelectedLog(null); setPayloadMaximized(false); }}></div>
                        <div className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 p-6 w-full flex flex-col transition-all duration-300 animate-in zoom-in-95 ${payloadMaximized ? 'max-w-[95vw] h-[90vh]' : 'max-w-2xl h-auto max-h-[90vh]'}`}>
                            <div className="flex justify-between items-center mb-4 border-b dark:border-gray-700 pb-3">
                                <h3 className="text-lg font-bold dark:text-white">Conteúdo do Payload (Body)</h3>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setPayloadMaximized(!payloadMaximized)}
                                        className="p-2 text-gray-400 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                                        title={payloadMaximized ? "Recolher" : "Expandir"}
                                    >
                                        {payloadMaximized ? <FiMinimize2 /> : <FiMaximize2 />}
                                    </button>
                                    <button onClick={() => { setSelectedLog(null); setPayloadMaximized(false); }} className="text-gray-400 hover:text-red-500 text-xl font-bold p-1">✕</button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                {selectedLog.processed_data && (
                                    <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                                        <h4 className="text-xs font-bold text-green-700 dark:text-green-400 uppercase mb-3 flex items-center gap-2">
                                            <FiCheck /> Dados Entendidos pelo Sistema
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* PHONE */}
                                            <div className="bg-white dark:bg-gray-800 p-2 rounded border dark:border-gray-700">
                                                <span className="text-[10px] text-gray-500 block uppercase font-bold">Telefone Final</span>
                                                <span className="text-sm font-mono dark:text-white font-bold">
                                                    {selectedLog.processed_data.extracted_phone?.value || "Não encontrado"}
                                                </span>
                                                {renderPathWithHighlight(selectedLog.processed_data.extracted_phone?.path, selectedLog.processed_data.extracted_phone?.matched)}
                                            </div>

                                            {/* NAME */}
                                            <div className="bg-white dark:bg-gray-800 p-2 rounded border dark:border-gray-700">
                                                <span className="text-[10px] text-gray-500 block uppercase font-bold">Nome</span>
                                                <span className="text-sm dark:text-white font-bold">
                                                    {selectedLog.processed_data.extracted_name?.value || "Não encontrado"}
                                                </span>
                                                {renderPathWithHighlight(selectedLog.processed_data.extracted_name?.path, selectedLog.processed_data.extracted_name?.matched)}
                                            </div>

                                            {/* COUNTRY */}
                                            <div className="bg-white dark:bg-gray-800 p-2 rounded border dark:border-gray-700">
                                                <span className="text-[10px] text-gray-500 block uppercase font-bold">País/DDI</span>
                                                <span className="text-sm dark:text-white font-bold">
                                                    {selectedLog.processed_data.country_used?.value || "Brasil (Default)"}
                                                </span>
                                                {renderPathWithHighlight(selectedLog.processed_data.country_used?.path, selectedLog.processed_data.country_used?.matched)}
                                            </div>

                                            {/* CUSTOM VARS (Compact List) */}
                                            {selectedLog.processed_data?.custom_vars && Object.entries(selectedLog.processed_data.custom_vars).map(([key, data]) => {
                                                if (!data || !data.value) return null; // Hide empty fields
                                                return (
                                                    <div key={key} className="bg-white dark:bg-gray-800 p-2 rounded border dark:border-gray-700">
                                                        <span className="text-[10px] text-blue-500 block uppercase font-bold">{key}</span>
                                                        <span className="text-sm dark:text-white font-bold">{data.value}</span>
                                                        {renderPathWithHighlight(data.path, data.matched)}
                                                    </div>
                                                );
                                            })}


                                        </div>
                                    </div>
                                )}

                                {!selectedLog.processed_data && (
                                    <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900/40 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-center">
                                        <p className="text-xs text-gray-400 italic">Mapeamento indisponível para este log antigo ou não processado.</p>
                                    </div>
                                )}

                                <div className="mb-6">
                                    <h4 className="text-sm font-bold text-gray-500 mb-2 uppercase tracking-wide">Payload Bruto (JSON Body):</h4>
                                    <div className="bg-gray-900 border border-gray-700/50 rounded-lg p-4 font-mono text-sm space-y-4">
                                        {/* ALERT: Conditional Routing */}
                                        {selectedLog.processed_data?.routing_info && (
                                            <div className="bg-orange-500/10 border border-orange-500/30 p-3 rounded text-orange-200 text-xs mb-3">
                                                <div className="flex items-center gap-2 font-bold text-orange-400 mb-1">
                                                    <FiList /> ROTEAMENTO CONDICIONAL APLICADO
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 mt-2">
                                                    <div className="col-span-2">
                                                        <span className="text-orange-500/70 block text-[10px] uppercase font-bold">Caminho da Condição</span>
                                                        {renderPathWithHighlight(selectedLog.processed_data.routing_info.field, selectedLog.processed_data.routing_info.field_matched)}
                                                    </div>
                                                    <div>
                                                        <span className="text-orange-500/70 block text-[10px] uppercase font-bold mt-2">Valor Encontrado</span>
                                                        <span className="font-bold text-white text-sm">{selectedLog.processed_data.routing_info.value_found}</span>
                                                    </div>
                                                    <div className="border-t border-orange-500/20 pt-2 mt-2 col-span-2">
                                                        <span className="text-orange-500/70 block text-[10px] uppercase font-bold">Ação Tomada</span>
                                                        <span>
                                                            Desviado para Funil ID <span className="font-bold text-white ml-1">{selectedLog.processed_data.routing_info.target_funnel}</span>
                                                            <span className="text-gray-300 text-[10px] ml-2">(Regra: {selectedLog.processed_data.routing_info.matched_rule})</span>
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <pre className="text-xs font-mono text-gray-800 dark:text-gray-300 whitespace-pre-wrap break-all">
                                            {JSON.stringify(selectedLog.payload, null, 2)}
                                        </pre>
                                    </div>
                                </div>

                                {selectedLog.headers && (
                                    <div className="">
                                        <h4 className="text-sm font-bold text-gray-500 mb-2 uppercase tracking-wide">Headers Enviados:</h4>
                                        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border dark:border-gray-700">
                                            <pre className="text-xs font-mono text-gray-400 whitespace-pre-wrap break-all">
                                                {JSON.stringify(selectedLog.headers, null, 2)}
                                            </pre>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-2 mt-4 pt-4 border-t dark:border-gray-700">
                                <button
                                    onClick={() => handleUseLogForMapping(selectedLog)}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-bold text-sm flex items-center gap-2"
                                >
                                    <FiActivity /> Usar p/ Mapeamento
                                </button>
                                <button
                                    onClick={() => { setSelectedLog(null); setPayloadMaximized(false); }}
                                    className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 transition font-medium"
                                >
                                    Fechar
                                </button>
                            </div>
                        </div>
                    </div >
                )
            }

            {/* Modal de Exclusão Premium */}
            {
                webhookToDelete && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        {/* Backdrop com blur */}
                        <div
                            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200"
                            onClick={() => setWebhookToDelete(null)}
                        ></div>

                        {/* Card do Modal */}
                        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 p-8 w-full max-w-md animate-in zoom-in-95 duration-200">
                            <div className="flex flex-col items-center text-center">
                                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                                    <FiAlertCircle size={32} className="text-red-500" />
                                </div>

                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                    Excluir Webhook?
                                </h3>
                                <p className="text-gray-500 dark:text-gray-400 mb-8">
                                    Esta ação não pode ser desfeita. Você perderá todo o histórico de recebimento deste webhook.
                                </p>

                                <div className="flex flex-col w-full gap-3">
                                    <button
                                        onClick={confirmDelete}
                                        className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-red-500/20 active:scale-95"
                                    >
                                        Sim, Excluir Agora
                                    </button>
                                    <button
                                        onClick={() => setWebhookToDelete(null)}
                                        className="w-full text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-medium py-2 transition"
                                    >
                                        Não, manter webhook
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Modal de Exclusão Individual de Log */}
            {
                logToDelete && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setLogToDelete(null)}></div>
                        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 p-8 w-full max-w-md animate-in zoom-in-95">
                            <div className="flex flex-col items-center text-center">
                                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                                    <FiAlertCircle size={32} className="text-red-500" />
                                </div>
                                <h3 className="text-xl font-bold dark:text-white mb-2">Excluir este log?</h3>
                                <p className="text-gray-500 dark:text-gray-400 mb-8">Esta ação removerá permanentemente este registro de transação.</p>
                                <div className="flex flex-col w-full gap-3">
                                    <button
                                        onClick={() => deleteLog(logToDelete)}
                                        className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition shadow-lg active:scale-95"
                                    >
                                        Sim, Excluir Log
                                    </button>
                                    <button
                                        onClick={() => setLogToDelete(null)}
                                        className="w-full text-gray-500 dark:text-gray-400 font-medium py-2"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Modal de Exclusão em Massa de Logs */}
            {
                showBatchDeleteModal && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowBatchDeleteModal(false)}></div>
                        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 p-8 w-full max-w-md animate-in zoom-in-95">
                            <div className="flex flex-col items-center text-center">
                                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                                    <FiTrash2 size={32} className="text-red-500" />
                                </div>
                                <h3 className="text-xl font-bold dark:text-white mb-2">Excluir {selectedLogIds.length} logs?</h3>
                                <p className="text-gray-500 dark:text-gray-400 mb-8">Você está prestes a apagar permanentemente todos os logs selecionados. Deseja continuar?</p>
                                <div className="flex flex-col w-full gap-3">
                                    <button
                                        onClick={bulkDeleteLogs}
                                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition shadow-lg active:scale-95"
                                    >
                                        Apagar Todos Selecionados
                                    </button>
                                    <button
                                        onClick={() => setShowBatchDeleteModal(false)}
                                        className="w-full text-gray-500 dark:text-gray-400 font-medium py-2"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default IncomingWebhooks;
