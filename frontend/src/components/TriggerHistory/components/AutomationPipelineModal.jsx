import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FiZap, FiCheckCircle, FiAlertCircle, FiX, FiUser, FiMessageSquare, FiRefreshCw } from 'react-icons/fi';
import { API_URL, WS_URL } from '../../../config';
import { fetchWithAuth } from '../../../AuthContext';
import { useClient } from '../../../contexts/ClientContext';
import { toast } from 'react-hot-toast';
import useScrollLock from '../../../hooks/useScrollLock';
import PipelineFlowViewer from './PipelineFlowViewer';
import CancelContactConfirmationModal from './CancelContactConfirmationModal';
import NodeStatsDetailsModal from './NodeStatsDetailsModal';
import PipelineTimeline from './PipelineTimeline';

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
        if (trigger.status === 'processing' || trigger.status === 'queued' || trigger.status === 'suspended' || trigger.status === 'failed') {
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

        const logsByContact = {};
        rawHistory.forEach(log => {
            const nodeId = log.node_id;
            if (!nodeId) return;

            const phone = log.extra?.contact_phone || log.extra?.contact_name || '__single__';
            if (!logsByContact[phone]) logsByContact[phone] = [];
            logsByContact[phone].push({
                ...log,
                nodeOrder: nodeOrderMap[nodeId] ?? 999
            });
        });

        const uniqueContactsMap = {};

        Object.entries(logsByContact).forEach(([phone, contactLogs]) => {
            const realNodeLogs = contactLogs.filter(l => l.nodeOrder < 999);
            const maxNodeOrder = realNodeLogs.length > 0 ? Math.max(...realNodeLogs.map(l => l.nodeOrder)) : -1;

            const logForNode = contactLogs.find(l => l.node_id === nodeId);
            if (!logForNode) return;

            const isWaiting = logForNode.status === 'waiting' || logForNode.status === 'processing';
            const isSuspended = logForNode.status === 'suspended';
            const alreadyMoved = (isWaiting || isSuspended) && logForNode.nodeOrder < maxNodeOrder;

            let effectiveStatus;
            if (logForNode.status === 'completed' || alreadyMoved) {
                effectiveStatus = 'completed';
            } else if (isWaiting) {
                effectiveStatus = 'waiting';
            } else if (isSuspended) {
                effectiveStatus = 'suspended';
            } else if (logForNode.status === 'failed') {
                effectiveStatus = 'failed';
            } else if (logForNode.status === 'cancelled') {
                effectiveStatus = 'cancelled';
            } else {
                return;
            }

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
            suspended: 'Aguardando',
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
                                className="p-3 bg-gray-100 hover:bg-gray-250 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-2xl transition-all active:scale-90 flex items-center justify-center border border-gray-200/30 dark:border-white/5 shadow-sm"
                                aria-label="Atualizar"
                                title="Atualizar informações"
                            >
                                <FiRefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
                            </button>

                            <button 
                                onClick={onClose}
                                className="p-3 bg-gray-100 hover:bg-gray-250 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-2xl transition-all active:scale-90 flex items-center justify-center border border-gray-200/30 dark:border-white/5 shadow-sm"
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
                            <PipelineTimeline 
                                history={history} 
                                trigger={trigger} 
                                activeClient={activeClient} 
                                isProcessing={isProcessing} 
                            />
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

            {/* Modal de Estatísticas de Contatos no Nó */}
            <NodeStatsDetailsModal
                selectedNodeStats={selectedNodeStats}
                onClose={() => setSelectedNodeStats(null)}
                statsPerPage={statsPerPage}
                setStatsPerPage={setStatsPerPage}
                statsPage={statsPage}
                setStatsPage={setStatsPage}
                activeClient={activeClient}
                trigger={trigger}
                onStopContact={(c) => setContactToCancel(c)}
            />

            {/* Modal de Confirmação para Parar Funil do Contato */}
            <CancelContactConfirmationModal
                contact={contactToCancel}
                onClose={() => setContactToCancel(null)}
                onConfirm={handleCancelContactFunnel}
                isCancelling={isCancellingContact}
            />
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
