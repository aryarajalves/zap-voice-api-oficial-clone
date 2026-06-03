import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FiZap, FiActivity, FiCheckCircle, FiAlertCircle, FiX, FiUser, FiMessageSquare, FiCpu, FiClock, FiMusic, FiVideo, FiImage, FiFile, FiLayers, FiRefreshCw } from 'react-icons/fi';
import { API_URL, WS_URL } from '../../../config';
import { fetchWithAuth } from '../../../AuthContext';
import { useClient } from '../../../contexts/ClientContext';
import { toast } from 'react-hot-toast';
import useScrollLock from '../../../hooks/useScrollLock';
import CountdownTimer from './CountdownTimer';
import PipelineFlowViewer from './PipelineFlowViewer';

const resolveUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const baseUrl = API_URL.replace(/\/api\/*$/, '');
    return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
};

const AutomationPipelineModal = ({ trigger: initialTrigger, onClose, onStop, onDelete, hideTabs = false }) => {
    useScrollLock(!!initialTrigger);
    const { activeClient } = useClient();
    const [trigger, setTrigger] = useState(initialTrigger);
    const [activeTab, setActiveTab] = useState('flow');
    const [selectedNodeStats, setSelectedNodeStats] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [statsPage, setStatsPage] = useState(1);
    const [statsPerPage, setStatsPerPage] = useState(20);
    const [contactToCancel, setContactToCancel] = useState(null);
    const [isCancellingContact, setIsCancellingContact] = useState(false);
    
    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            const res = await fetchWithAuth(`${API_URL}/triggers/${trigger.id}`, {}, activeClient?.id);
            if (res.ok) {
                const data = await res.json();
                setTrigger(data);
                toast.success("Informações atualizadas!");
            } else {
                toast.error("Falha ao atualizar dados.");
            }
        } catch (error) {
            console.error("Erro ao atualizar trigger:", error);
            toast.error("Falha ao atualizar dados.");
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleCancelContactFunnel = async () => {
        if (!contactToCancel) return;
        setIsCancellingContact(true);
        try {
            const res = await fetchWithAuth(
                `${API_URL}/triggers/${contactToCancel.triggerId}/cancel`, 
                { method: 'POST' }, 
                activeClient?.id
            );
            if (res.ok) {
                toast.success(`Funil parado para o contato ${contactToCancel.name || contactToCancel.phone}`);
                setSelectedNodeStats(prev => {
                    if (!prev) return null;
                    return {
                        ...prev,
                        contacts: prev.contacts.filter(item => item.phone !== contactToCancel.phone)
                    };
                });
                handleRefresh();
            } else {
                const errData = await res.json().catch(() => ({}));
                toast.error(errData.detail || "Falha ao parar funil para este contato.");
            }
        } catch (error) {
            console.error("Erro ao cancelar funil do contato:", error);
            toast.error("Falha ao parar funil para este contato.");
        } finally {
            setIsCancellingContact(false);
            setContactToCancel(null);
        }
    };

    useEffect(() => {
        setTrigger(initialTrigger);
    }, [initialTrigger]);

    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [trigger?.execution_history?.length]);

    useEffect(() => {
        if (!trigger) return;
        let pollInterval;
        if (trigger.status === 'processing' || trigger.status === 'queued') {
            const fetchLatestTrigger = async () => {
                try {
                    const res = await fetchWithAuth(`${API_URL}/triggers/${trigger.id}`, {}, activeClient?.id);
                    if (res.ok) {
                        const data = await res.json();
                        setTrigger(data);
                    }
                } catch (error) {
                    console.error("Erro ao fazer poll do trigger:", error);
                }
            };
            fetchLatestTrigger();
            pollInterval = setInterval(fetchLatestTrigger, 3000);
        }
        return () => {
            if (pollInterval) clearInterval(pollInterval);
        };
    }, [trigger?.status, trigger?.id, activeClient?.id]);

    useEffect(() => {
        if (!trigger) return;
        let ws;
        const wsBase = WS_URL.endsWith('/ws') ? WS_URL : `${WS_URL}/ws`;
        const wsToken = localStorage.getItem('token');
        const wsFinalUrl = wsToken ? `${wsBase}?token=${wsToken}` : wsBase;
        
        try {
            ws = new WebSocket(wsFinalUrl);
            ws.onmessage = (event) => {
                try {
                    const payload = JSON.parse(event.data);
                    if (payload.event === "trigger_progress" && payload.data && payload.data.id === trigger.id) {
                        setTrigger(prev => {
                            if (!prev) return payload.data;
                            return {
                                ...payload.data,
                                funnel: prev.funnel
                            };
                        });
                    }
                } catch (err) {
                    console.error("Erro ao processar mensagem do WebSocket no modal:", err);
                }
            };
        } catch (e) {
            console.error("Falha ao criar WebSocket no modal:", e);
        }
        
        return () => {
            if (ws) ws.close();
        };
    }, [trigger?.id]);

    const handleNodeStatClick = (nodeId, clickedStatus) => {
        const rawHistory = Array.isArray(trigger.execution_history) ? trigger.execution_history : [];
        const funnelNodes = trigger.funnel?.steps?.nodes || [];

        // Mapa de nodeId -> ordem topológica (igual ao PipelineFlowViewer)
        const nodeOrderMap = {};
        const adj = {};
        const inDegree = {};
        
        funnelNodes.forEach(node => {
            adj[node.id] = [];
            inDegree[node.id] = 0;
        });
        
        const funnelEdges = trigger.funnel?.steps?.edges || [];
        funnelEdges.forEach(edge => {
            if (adj[edge.source] && adj[edge.target] !== undefined) {
                adj[edge.source].push(edge.target);
                inDegree[edge.target] = (inDegree[edge.target] || 0) + 1;
            }
        });
        
        let startNodes = funnelNodes.filter(node => 
            node.type === 'start' || 
            node.data?.isStart === true
        ).map(n => n.id);
        
        if (startNodes.length === 0) {
            startNodes = funnelNodes.filter(node => (inDegree[node.id] || 0) === 0).map(n => n.id);
        }
        
        if (startNodes.length === 0 && funnelNodes.length > 0) {
            startNodes = [funnelNodes[0].id];
        }
        
        const queue = startNodes.map(id => ({ id, level: 0 }));
        const visited = new Set();
        
        while (queue.length > 0) {
            const { id, level } = queue.shift();
            nodeOrderMap[id] = Math.max(nodeOrderMap[id] || 0, level);
            
            const visitKey = `${id}-${level}`;
            if (visited.has(visitKey)) continue;
            visited.add(visitKey);
            
            if (adj[id]) {
                adj[id].forEach(nextId => {
                    if (level < funnelNodes.length) {
                        queue.push({ id: nextId, level: level + 1 });
                    }
                });
            }
        }
        
        funnelNodes.forEach((node, idx) => {
            if (nodeOrderMap[node.id] === undefined) {
                nodeOrderMap[node.id] = idx + 1000;
            }
        });

        // Agrupar todos os logs por contato
        const logsByContact = {};
        rawHistory.forEach(log => {
            const phone = log.extra?.contact_phone || log.extra?.contact_name || '__single__';
            if (!logsByContact[phone]) logsByContact[phone] = [];
            logsByContact[phone].push({
                ...log,
                nodeOrder: nodeOrderMap[log.node_id] ?? 999
            });
        });

        const uniqueContactsMap = {};

        Object.entries(logsByContact).forEach(([phone, contactLogs]) => {
            // Encontrar o nó mais avançado que este contato atingiu (ignorando nós virtuais com order 999)
            const realNodeLogs = contactLogs.filter(l => l.nodeOrder < 999);
            const maxNodeOrder = realNodeLogs.length > 0 ? Math.max(...realNodeLogs.map(l => l.nodeOrder)) : -1;

            // Pegar apenas o log deste contato para o nodeId solicitado
            const logForNode = contactLogs.find(l => l.node_id === nodeId);
            if (!logForNode) return;

            const isWaiting = logForNode.status === 'waiting' || logForNode.status === 'processing';
            const alreadyMoved = isWaiting && logForNode.nodeOrder < maxNodeOrder;

            // Determinar a categoria real do contato neste nó
            let effectiveStatus;
            if (logForNode.status === 'completed' || alreadyMoved) {
                effectiveStatus = 'completed';
            } else if (isWaiting) {
                effectiveStatus = 'waiting';
            } else if (logForNode.status === 'failed') {
                effectiveStatus = 'failed';
            } else if (logForNode.status === 'cancelled') {
                effectiveStatus = 'cancelled';
            } else {
                return;
            }

            // Incluir apenas se bate com o status clicado
            if (effectiveStatus !== clickedStatus) return;

            if (!uniqueContactsMap[phone]) {
                uniqueContactsMap[phone] = {
                    name: logForNode.extra?.contact_name || 'Contato ZapVoice',
                    phone: logForNode.extra?.contact_phone || 'N/A',
                    status: logForNode.status,
                    timestamp: logForNode.timestamp,
                    updated_at: logForNode.updated_at,
                    targetTime: logForNode.extra?.target_time,
                    error: logForNode.extra?.error,
                    details: logForNode.details,
                    convoId: logForNode.extra?.conversation_id || trigger.conversation_id,
                    accountId: logForNode.extra?.account_id || trigger.chatwoot_account_id,
                    triggerId: logForNode.extra?.trigger_id || trigger.id
                };
            }
        });

        const contactsList = Object.values(uniqueContactsMap);
        const statusTitles = {
            completed: 'Aprovados',
            waiting: 'Na Fila',
            failed: 'Falhas',
            cancelled: 'Parados'
        };

        setSelectedNodeStats({
            nodeId,
            status: clickedStatus,
            title: `Contatos - ${statusTitles[clickedStatus] || clickedStatus}`,
            contacts: contactsList
        });
        setStatsPage(1);
    };


    if (!trigger) return null;

    try {
        const rawHistory = Array.isArray(trigger.execution_history) ? trigger.execution_history : [];
        const isProcessing = trigger.status === 'processing' || trigger.status === 'queued';
        
        const history = [];
        if (!trigger.is_bulk && !trigger.is_interaction) {
            history.push({
                node_id: 'INITIAL_SECURITY',
                details: '⏱️ SEGURANÇA: AGUARDANDO DELEY INICIAL (5s)',
                status: 'completed',
                timestamp: trigger.created_at,
                extra: { 
                    content: 'Sincronizando com Chatwoot para garantir que a conversa e os IDs estejam prontos.',
                    account_id: trigger.chatwoot_account_id,
                    conversation_id: trigger.conversation_id
                }
            });
        }
        history.push(...rawHistory);

        // Ordenação cronológica pura baseada no timestamp
        history.sort((a, b) => {
            const timeA = new Date(a.timestamp || 0).getTime();
            const timeB = new Date(b.timestamp || 0).getTime();
            return timeA - timeB;
        });

        return createPortal(
            <>
                <div className="fixed inset-0 z-[20000] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 md:p-8 animate-in fade-in duration-300">
                <div className="bg-white dark:bg-gray-900 w-full max-w-7xl h-[90vh] max-h-[95vh] rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                    
                    <div className="p-6 pb-4 flex justify-between items-start">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <FiZap className="text-white text-2xl" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Pipeline de Automação</h2>
                                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Fluxo de execução cronológico</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex flex-col gap-2">
                                {trigger.is_interaction && (
                                    <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-2 text-emerald-500">
                                        <FiZap size={16} className="animate-pulse" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Janela 24h Ativa</span>
                                    </div>
                                )}

                                {(activeClient?.chatwoot_url || trigger.chatwoot_url) && (
                                    (() => {
                                        const accountId = trigger.chatwoot_account_id || activeClient?.chatwoot_account_id || history.find(h => h.extra?.account_id)?.extra?.account_id;
                                        const convoId = trigger.conversation_id || history.find(h => h.extra?.conversation_id)?.extra?.conversation_id;
                                        
                                        if (accountId && convoId) {
                                            let baseUrl = activeClient?.chatwoot_url || '';
                                            if (!baseUrl && trigger.chatwoot_url) {
                                                const idx = trigger.chatwoot_url.indexOf('/app/accounts/');
                                                if (idx !== -1) {
                                                    baseUrl = trigger.chatwoot_url.substring(0, idx);
                                                }
                                            }
                                            if (baseUrl) {
                                                return (
                                                    <a 
                                                        href={`${baseUrl}/app/accounts/${accountId}/conversations/${convoId}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2 active:scale-95"
                                                    >
                                                        <FiMessageSquare size={16} /> Ver no Chatwoot
                                                    </a>
                                                );
                                            }
                                        }
                                        return null;
                                    })()
                                )}
                            </div>

                            <button 
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                className="p-3 bg-gray-100 hover:bg-gray-250 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-2xl transition-all active:scale-90 flex items-center justify-center border border-gray-200/30 dark:border-white/5 shadow-sm"
                                aria-label="Atualizar"
                                title="Atualizar informações"
                            >
                                <FiRefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
                            </button>

                            <button 
                                onClick={onClose}
                                className="p-3 bg-gray-100 hover:bg-gray-250 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-2xl transition-all active:scale-90 flex items-center justify-center border border-gray-200/30 dark:border-white/5 shadow-sm"
                                aria-label="Fechar"
                            >
                                <FiX size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="px-6 pb-4">
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-2xl p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-blue-600/10 flex items-center justify-center text-blue-600">
                                    <FiUser size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-black text-blue-600/60 uppercase tracking-widest">Contato Vinculado</p>
                                    <p className="text-sm font-black text-gray-800 dark:text-white truncate">{trigger.contact_name || trigger.contact_phone || 'Contato ZapVoice'}</p>
                                </div>
                            </div>
                            <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
                                isProcessing ? 'bg-blue-100 text-blue-600 border-blue-200 animate-pulse' : 
                                trigger.status === 'completed' ? 'bg-green-100 text-green-600 border-green-200' :
                                'bg-gray-100 text-gray-500 border-gray-200'
                            }`}>
                                {isProcessing ? '⚡ Rodando Agora' : trigger.status === 'completed' ? '✅ Finalizado' : trigger.status}
                            </div>
                        </div>
                    </div>

                    {!hideTabs && (
                        <div className="px-6 pb-3 flex gap-2 border-b border-gray-100 dark:border-gray-800">
                            <button 
                                onClick={() => setActiveTab('flow')}
                                className={`flex-1 md:flex-none px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${
                                    activeTab === 'flow' 
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/10' 
                                        : 'bg-white dark:bg-gray-850 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`}
                            >
                                🔄 Fluxo Visual
                            </button>
                            <button 
                                onClick={() => setActiveTab('timeline')}
                                className={`flex-1 md:flex-none px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${
                                    activeTab === 'timeline' 
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/10' 
                                        : 'bg-white dark:bg-gray-850 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`}
                            >
                                📋 Linha do Tempo
                            </button>
                        </div>
                    )}

                    {activeTab === 'flow' ? (
                        <div className="flex-1 relative w-full" style={{ height: '100%', minHeight: '450px' }}>
                            <PipelineFlowViewer trigger={trigger} onNodeStatClick={handleNodeStatClick} />
                        </div>
                    ) : (
                        <div ref={scrollRef} className="flex-1 overflow-y-auto px-10 pb-10 custom-scrollbar">
                            {history.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <FiActivity size={48} className="animate-pulse mb-4 text-blue-500/50 dark:text-blue-400/50" />
                                    <p className="font-black uppercase tracking-widest text-sm text-gray-500 dark:text-gray-400">Aguardando início do fluxo...</p>
                                </div>
                            ) : (
                                <div className="relative">
                                    <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-gray-200 dark:bg-gray-800"></div>
                                    <div className="space-y-10">
                                        {history.map((log, idx) => {
                                            const isCompleted = log.status === 'completed';
                                            const isWaiting = log.status === 'waiting';
                                            const isFailed = log.status === 'failed';

                                            const logAccountId = log.extra?.account_id || trigger.chatwoot_account_id || activeClient?.chatwoot_account_id;
                                            const logConversationId = log.extra?.conversation_id || trigger.conversation_id;

                                            return (
                                                <div key={idx} className="relative flex gap-8 group">
                                                    <div className={`z-10 w-10 h-10 rounded-full border-4 flex items-center justify-center transition-all ${
                                                        isCompleted ? 'bg-green-500 border-green-100 dark:border-green-900/50 text-white' :
                                                        isWaiting ? 'bg-orange-500 border-orange-100 dark:border-orange-900/50 text-white animate-bounce' :
                                                        isFailed ? 'bg-red-500 border-red-100 dark:border-red-900/50 text-white' :
                                                        'bg-blue-500 border-blue-100 dark:border-blue-900/50 text-white animate-pulse'
                                                    }`}>
                                                        {isCompleted ? <FiCheckCircle size={20} /> :
                                                         isWaiting ? <FiClock size={20} /> :
                                                         isFailed ? <FiAlertCircle size={20} /> : <FiActivity size={20} />}
                                                    </div>

                                                    <div className="flex flex-col flex-1 bg-gray-50 dark:bg-gray-800/40 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 p-4 rounded-2xl transition-all">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <h3 className="font-black text-gray-800 dark:text-gray-200 uppercase tracking-tighter">
                                                                {log.details || `Passo: ${log.node_id}`}
                                                            </h3>
                                                            <span className="text-[10px] font-mono text-gray-400 bg-white dark:bg-gray-900 px-2 py-0.5 rounded shadow-sm">
                                                                {log.timestamp && !isNaN(new Date(log.timestamp).getTime()) 
                                                                    ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                                                                    : '--:--:--'}
                                                            </span>
                                                        </div>
                                                        
                                                        {(log.node_id === 'DISCOVERY' || logAccountId) && (
                                                            <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold">
                                                                <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-lg border border-blue-200/50 flex items-center gap-1.5">
                                                                    <FiCpu size={12} /> ID CONTA: {logAccountId || 'N/A'}
                                                                </span>
                                                                {logConversationId && (activeClient?.chatwoot_url || trigger.chatwoot_url) ? (
                                                                    (() => {
                                                                        let baseUrl = activeClient?.chatwoot_url || '';
                                                                        if (!baseUrl && trigger.chatwoot_url) {
                                                                            const idx = trigger.chatwoot_url.indexOf('/app/accounts/');
                                                                            if (idx !== -1) {
                                                                                baseUrl = trigger.chatwoot_url.substring(0, idx);
                                                                            }
                                                                        }
                                                                        if (baseUrl) {
                                                                            return (
                                                                                <a 
                                                                                    href={`${baseUrl}/app/accounts/${logAccountId}/conversations/${logConversationId}`}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg border border-indigo-700 flex items-center gap-1.5 hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20 active:scale-95"
                                                                                >
                                                                                    <FiMessageSquare size={12} /> VER CHAT: {logConversationId}
                                                                                </a>
                                                                            );
                                                                        }
                                                                        return (
                                                                            <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded-lg border border-indigo-200/50 flex items-center gap-1.5">
                                                                                <FiMessageSquare size={12} /> ID CONVERSA: {logConversationId || 'N/A'}
                                                                            </span>
                                                                        );
                                                                    })()
                                                                ) : (
                                                                    <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded-lg border border-indigo-200/50 flex items-center gap-1.5">
                                                                        <FiMessageSquare size={12} /> ID CONVERSA: {logConversationId || 'N/A'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                        
                                                        {log.extra?.memory_status && (
                                                            <div className="mt-2 flex">
                                                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border transition-all flex items-center gap-1 ${
                                                                    log.extra.memory_status === 'success' || log.extra.memory_status === 'sent'
                                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' 
                                                                        : log.extra.memory_status === 'failed'
                                                                            ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
                                                                            : log.extra.memory_status === 'not_configured'
                                                                                ? 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                                                                                : 'bg-indigo-50 text-indigo-700 border-indigo-200 animate-pulse'
                                                                }`}>
                                                                    🧠 Memória: {
                                                                        log.extra.memory_status === 'success' || log.extra.memory_status === 'sent' ? 'Sincronizado' :
                                                                        log.extra.memory_status === 'failed' ? 'Falha no Sync' :
                                                                        log.extra.memory_status === 'not_configured' ? 'Desativada' : 'Sincronizando...'
                                                                    }
                                                                </span>
                                                            </div>
                                                        )}

                                                        {log.extra?.content && (
                                                            <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 font-medium bg-white dark:bg-gray-900/50 p-3 rounded-xl border border-gray-100 dark:border-gray-800 italic relative overflow-hidden group/content">
                                                                <p className="line-clamp-3">"{log.extra.content}"</p>
                                                                <FiMessageSquare className="absolute -bottom-1 -right-1 opacity-5 text-gray-900 dark:text-white" size={24} />
                                                            </div>
                                                        )}

                                                        {log.extra?.media_type && (
                                                            <div className="mt-3 flex flex-col gap-2 overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm transition-all group/media">
                                                                {log.extra.media_type === 'image' && (
                                                                    <img 
                                                                        src={resolveUrl(log.extra.media_url)} 
                                                                        alt="Preview" 
                                                                        className="w-full h-auto max-h-64 object-contain bg-gray-50 dark:bg-gray-800 transition-transform duration-500 group-hover/media:scale-105"
                                                                    />
                                                                )}
                                                                {log.extra.media_type === 'video' && (
                                                                    <video 
                                                                        src={resolveUrl(log.extra.media_url)} 
                                                                        className="w-full h-auto max-h-64 bg-black"
                                                                        controls 
                                                                    />
                                                                )}
                                                                {log.extra.media_type === 'audio' && (
                                                                    <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 flex flex-col gap-2">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg">
                                                                                <FiMusic size={18} />
                                                                            </div>
                                                                            <div className="flex-1 min-w-0">
                                                                                <p className="text-[10px] font-black text-blue-600/60 uppercase tracking-widest">Áudio Enviado</p>
                                                                                <p className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate">{log.extra.media_file || 'Áudio'}</p>
                                                                            </div>
                                                                        </div>
                                                                        <audio src={resolveUrl(log.extra.media_url)} controls className="w-full h-8 mt-1" />
                                                                    </div>
                                                                )}
                                                                {log.extra.media_type === 'file' && (
                                                                    <div className="p-4 flex items-center gap-3 bg-gray-50 dark:bg-gray-800/50">
                                                                        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-xl flex items-center justify-center text-gray-500 dark:text-gray-400">
                                                                            <FiFile size={20} />
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Documento</p>
                                                                            <p className="text-xs font-black text-gray-800 dark:text-gray-200 truncate">{log.extra.media_file || 'Arquivo'}</p>
                                                                        </div>
                                                                        <a href={resolveUrl(log.extra.media_url)} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors text-blue-500">
                                                                            <FiLayers size={18} />
                                                                        </a>
                                                                    </div>
                                                                )}
                                                                {log.extra.caption && (
                                                                    <div className="p-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-900/40 italic text-xs text-gray-600 dark:text-gray-400">
                                                                        "{log.extra.caption}"
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                        
                                                        {isWaiting && log.extra?.target_time && isProcessing && (
                                                            <div className="mt-3 flex items-center gap-2 bg-orange-100/50 dark:bg-orange-900/20 px-3 py-2 rounded-xl border border-orange-200/50">
                                                                <FiClock className="text-orange-500" size={14} />
                                                                <CountdownTimer targetTime={log.extra.target_time} />
                                                            </div>
                                                        )}

                                                        {log.extra?.error && (
                                                            <p className="mt-2 text-xs text-red-500 font-bold bg-red-100/50 dark:bg-red-900/20 p-2 rounded-lg border border-red-200/50">
                                                                {log.extra.error}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="p-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex gap-3">
                        {isProcessing && (
                            <button 
                                onClick={() => onStop(trigger.id)}
                                className="flex-1 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 font-black rounded-xl hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                            >
                                <FiX size={16} /> Parar Funil
                            </button>
                        )}
                        
                        <button 
                            onClick={onClose}
                            className="flex-1 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-black rounded-xl hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                        >
                            Fechar Pipeline
                        </button>
                    </div>
                </div>
            </div>

            {selectedNodeStats && (
                    <div className="fixed inset-0 z-[21000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-[2rem] shadow-2xl border border-gray-150 dark:border-white/5 overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
                            <div className="p-5 pb-3 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                                <h3 className="text-lg font-black text-gray-800 dark:text-white uppercase tracking-wider">{selectedNodeStats.title}</h3>
                                <button onClick={() => setSelectedNodeStats(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-250 transition-colors">
                                    <FiX size={20} />
                                </button>
                            </div>

                            <div className="px-5 py-3 bg-gray-50/50 dark:bg-gray-900/20 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center text-xs">
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider text-[10px]">Mostrar:</span>
                                    <select
                                        value={statsPerPage}
                                        onChange={(e) => {
                                            setStatsPerPage(Number(e.target.value));
                                            setStatsPage(1);
                                        }}
                                        className="bg-white dark:bg-gray-800 border border-gray-250 dark:border-gray-700 rounded-xl px-2.5 py-1 font-black text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer shadow-sm text-xs"
                                    >
                                        <option value={20}>20 por vez</option>
                                        <option value={50}>50 por vez</option>
                                        <option value={100}>100 por vez</option>
                                    </select>
                                </div>
                                <div className="text-gray-500 dark:text-gray-400 font-black text-[10px] uppercase tracking-widest bg-gray-200/50 dark:bg-gray-800 px-2.5 py-1 rounded-lg">
                                    Total: {selectedNodeStats.contacts.length}
                                </div>
                            </div>
                            
                            <div className="p-4 overflow-y-auto flex-1 divide-y divide-gray-105 dark:divide-gray-800 bg-gray-50/50 dark:bg-gray-950/20 min-h-[250px]">
                                {selectedNodeStats.contacts.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-gray-400 font-medium">
                                        Nenhum contato encontrado.
                                    </div>
                                ) : (
                                    selectedNodeStats.contacts
                                        .slice((statsPage - 1) * statsPerPage, statsPage * statsPerPage)
                                        .map((c, i) => (
                                        <div key={i} className="py-3 flex justify-between items-center gap-3">
                                            <div className="min-w-0">
                                                <p className="text-xs font-black text-gray-800 dark:text-white truncate">{c.name}</p>
                                                <p className="text-[10px] text-gray-500 font-bold font-mono mt-0.5">{c.phone}</p>
                                                <div className="mt-2 flex flex-col gap-1 text-[10px] text-gray-500 dark:text-gray-400 bg-gray-100/50 dark:bg-gray-800/30 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800/50">
                                                    {c.timestamp && (
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-bold text-gray-400 dark:text-gray-500">📥 Entrada:</span>
                                                            <span className="font-mono font-semibold text-gray-700 dark:text-gray-300">{new Date(c.timestamp).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</span>
                                                        </div>
                                                    )}
                                                    {c.targetTime && (
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <span className="font-bold text-gray-400 dark:text-gray-500">⏱️ Prazo:</span>
                                                            <span className="font-mono font-bold text-orange-500">{new Date(c.targetTime).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</span>
                                                        </div>
                                                    )}
                                                    {c.status === 'completed' && (
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <span className="font-bold text-gray-400 dark:text-gray-500">📤 Saída:</span>
                                                            <span className="font-mono font-bold text-emerald-500">
                                                                {c.updated_at 
                                                                    ? new Date(c.updated_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
                                                                    : new Date(c.timestamp).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                                {c.error && (
                                                    <p className="text-[9px] text-red-500 font-bold bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-lg mt-1 inline-block">
                                                        ❌ {c.error}
                                                    </p>
                                                )}
                                            </div>
                                            
                                            <div className="flex items-center gap-2 shrink-0">
                                                {selectedNodeStats.status === 'waiting' && (
                                                    <button
                                                        onClick={() => setContactToCancel(c)}
                                                        title="Parar funil para este contato"
                                                        className="px-3 py-1.5 bg-red-100 hover:bg-red-200 dark:bg-red-950/30 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all active:scale-95 flex items-center gap-1 border border-red-200/30"
                                                    >
                                                        <FiX size={10} /> Parar Funil
                                                    </button>
                                                )}
                                                
                                                {c.convoId && c.accountId && (activeClient?.chatwoot_url || trigger.chatwoot_url) && (
                                                    (() => {
                                                        let baseUrl = activeClient?.chatwoot_url || '';
                                                        if (!baseUrl && trigger.chatwoot_url) {
                                                            const idx = trigger.chatwoot_url.indexOf('/app/accounts/');
                                                            if (idx !== -1) {
                                                                baseUrl = trigger.chatwoot_url.substring(0, idx);
                                                            }
                                                        }
                                                        if (baseUrl) {
                                                            return (
                                                                <a 
                                                                    href={`${baseUrl}/app/accounts/${c.accountId}/conversations/${c.convoId}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shadow-md shadow-blue-500/20 active:scale-95 shrink-0 flex items-center gap-1"
                                                                >
                                                                    <FiMessageSquare size={10} /> Chat
                                                                </a>
                                                            );
                                                        }
                                                        return null;
                                                    })()
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {selectedNodeStats.contacts.length > statsPerPage && (
                                <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-55/50 dark:bg-gray-900/30 flex justify-between items-center">
                                    <button
                                        disabled={statsPage === 1}
                                        onClick={() => setStatsPage(prev => Math.max(prev - 1, 1))}
                                        className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 font-black rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all text-[10px] uppercase tracking-wider active:scale-95 border border-gray-200/20 shadow-sm"
                                    >
                                        ◀ Anterior
                                    </button>
                                    <span className="text-[10px] text-gray-500 dark:text-gray-400 font-black uppercase tracking-widest">
                                        Página <span className="font-mono text-xs text-blue-500 font-black">{statsPage}</span> de <span className="font-mono text-xs font-black">{Math.ceil(selectedNodeStats.contacts.length / statsPerPage)}</span>
                                    </span>
                                    <button
                                        disabled={statsPage >= Math.ceil(selectedNodeStats.contacts.length / statsPerPage)}
                                        onClick={() => setStatsPage(prev => Math.min(prev + 1, Math.ceil(selectedNodeStats.contacts.length / statsPerPage)))}
                                        className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 font-black rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all text-[10px] uppercase tracking-wider active:scale-95 border border-gray-200/20 shadow-sm"
                                    >
                                        Próxima ▶
                                    </button>
                                </div>
                            )}
                            
                            <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex justify-end">
                                <button 
                                    onClick={() => setSelectedNodeStats(null)}
                                    className="px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-black rounded-xl hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest text-xs"
                                >
                                    Fechar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            {contactToCancel && (
                <div className="fixed inset-0 z-[22000] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[2rem] shadow-2xl border border-gray-150 dark:border-white/5 overflow-hidden flex flex-col p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-4">
                                <FiAlertCircle size={32} />
                            </div>
                            <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Parar Funil?</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mt-2">
                                Tem certeza de que deseja parar a execução do funil para o contato <strong className="text-gray-800 dark:text-white">{contactToCancel.name || contactToCancel.phone}</strong>?
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                Esta ação cancelará o agendamento atual e interromperá as próximas etapas deste contato.
                            </p>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setContactToCancel(null)}
                                disabled={isCancellingContact}
                                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 font-black rounded-xl transition-all uppercase tracking-widest text-xs"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCancelContactFunnel}
                                disabled={isCancellingContact}
                                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-red-600/20"
                            >
                                {isCancellingContact ? 'Parando...' : 'Confirmar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            </>,
            document.body
        );
    } catch (e) {
        console.error("Critical Render Error in Modal:", e);
        return createPortal(
            <div className="fixed inset-0 z-[20000] flex items-center justify-center bg-black/80 backdrop-blur-sm">
                <div className="bg-white p-8 rounded-3xl max-w-md text-center">
                    <FiAlertCircle size={48} className="mx-auto text-red-500 mb-4" />
                    <h2 className="text-xl font-black mb-2">Erro de Visualização</h2>
                    <p className="text-gray-600 text-sm mb-6">Ocorreu um erro ao carregar os detalhes do funil.</p>
                    <button onClick={onClose} className="mt-6 w-full py-4 bg-gray-900 text-white font-black rounded-2xl">Fechar</button>
                </div>
            </div>,
            document.body
        );
    }
};

export default AutomationPipelineModal;
