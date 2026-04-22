import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { API_URL, WS_URL } from '../config';
import { toast } from 'react-hot-toast';
import { fetchWithAuth, useAuth } from '../AuthContext';
import { useClient } from '../contexts/ClientContext';
import { 
    FiZap, FiActivity, FiClock, FiCheckCircle, FiAlertCircle, 
    FiX, FiUser, FiSmartphone, FiShield, FiSend, FiLayers, FiSearch, FiRefreshCw,
    FiMusic, FiVideo, FiImage, FiFile, FiCpu, FiMessageSquare, FiNavigation, FiMousePointer
} from 'react-icons/fi';
import ConfirmModal from './ConfirmModal';
import useScrollLock from '../hooks/useScrollLock';

const resolveUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const baseUrl = API_URL.replace(/\/api\/*$/, '');
    return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
};

const CountdownTimer = ({ targetTime }) => {
    const [timeLeft, setTimeLeft] = useState(0);

    useEffect(() => {
        if (!targetTime) return;
        const calculate = () => {
            try {
                const target = new Date(targetTime).getTime();
                if (isNaN(target)) return;
                const diff = Math.ceil((target - new Date().getTime()) / 1000);
                setTimeLeft(Math.max(0, diff));
            } catch (e) {
                console.error("Countdown error:", e);
            }
        };
        calculate();
        const interval = setInterval(calculate, 1000);
        return () => clearInterval(interval);
    }, [targetTime]);

    if (!targetTime) return null;
    if (timeLeft <= 0) return <span className="text-emerald-500 font-black animate-pulse">Retomando...</span>;

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    return (
        <span className="text-orange-500 font-mono font-black tracking-tighter">
            {minutes > 0 ? `${minutes}m ` : ''}{seconds}s p/ concluir
        </span>
    );
};

/**
 * Inspirado na Imagem 03 fornecida pelo usuário.
 */
const AutomationPipelineModal = ({ trigger: initialTrigger, onClose, onStop, onDelete }) => {
    useScrollLock(!!initialTrigger);
    const { activeClient } = useClient();
    const [trigger, setTrigger] = useState(initialTrigger);

    useEffect(() => {
        setTrigger(initialTrigger);
    }, [initialTrigger]);

    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [trigger?.execution_history?.length]);


    if (!initialTrigger) return null; 

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

    if (!trigger) return null;

    try {
        const rawHistory = Array.isArray(trigger.execution_history) ? trigger.execution_history : [];
        const isProcessing = trigger.status === 'processing' || trigger.status === 'queued';
        
        // Enrich history with initial security delay step
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

        return createPortal(
            <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 md:p-8 animate-in fade-in duration-300">
                <div className="bg-white dark:bg-gray-900 w-full max-w-2xl max-h-[90vh] rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                    
                    {/* Header Premium */}
                    <div className="p-8 pb-6 flex justify-between items-start">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <FiZap className="text-white text-2xl" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Pipeline de Automação</h2>
                                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Fluxo de execução cronológico</p>
                            </div>
                        </div>

                        {/* Botão Chatwoot */}
                        {activeClient?.chatwoot_url && (
                            (() => {
                                const accountId = trigger.chatwoot_account_id || history.find(h => h.extra?.account_id)?.extra?.account_id;
                                const convoId = trigger.conversation_id || history.find(h => h.extra?.conversation_id)?.extra?.conversation_id;
                                
                                if (accountId && convoId) {
                                    return (
                                        <a 
                                            href={`${activeClient.chatwoot_url}/app/accounts/${accountId}/conversations/${convoId}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2 active:scale-95"
                                        >
                                            <FiMessageSquare size={16} /> Ver no Chatwoot
                                        </a>
                                    );
                                }
                                return null;
                            })()
                        )}
                    </div>

                    {/* Status Card */}
                    <div className="px-8 pb-6">
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-3xl p-5 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-blue-600/10 flex items-center justify-center text-blue-600">
                                    <FiUser size={18} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-blue-600/60 uppercase tracking-widest">Contato Vinculado</p>
                                    <p className="text-sm font-black text-gray-800 dark:text-white">{trigger.contact_name || trigger.contact_phone || 'Contato ZapVoice'}</p>
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

                    {/* Timeline Body */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto px-10 pb-10 custom-scrollbar">
                        {history.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <FiActivity size={48} className="animate-pulse mb-4 text-blue-500/50 dark:text-blue-400/50" />
                                <p className="font-black uppercase tracking-widest text-sm text-gray-500 dark:text-gray-400">Aguardando início do fluxo...</p>
                            </div>
                        ) : (
                            <div className="relative">
                                {/* Vertical Line Connector */}
                                <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-gray-200 dark:bg-gray-800"></div>

                                {/* Nodes */}
                                <div className="space-y-10">
                                    {history.map((log, idx) => {
                                        const isCompleted = log.status === 'completed';
                                        const isWaiting = log.status === 'waiting';
                                        const isFailed = log.status === 'failed';

                                        return (
                                            <div key={idx} className="relative flex gap-8 group">
                                                {/* Circular Indicator */}
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

                                                {/* Node Content */}
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
                                                    
                                                    {/* Chatwoot Discovery Info */}
                                                    {(log.node_id === 'DISCOVERY' || log.extra?.account_id) && (
                                                        <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold">
                                                            <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-lg border border-blue-200/50 flex items-center gap-1.5 focus:ring-2 focus:ring-blue-500 outline-none">
                                                                <FiCpu size={12} /> ID CONTA: {log.extra?.account_id || 'N/A'}
                                                            </span>
                                                            {log.extra?.conversation_id && activeClient?.chatwoot_url ? (
                                                                <a 
                                                                    href={`${activeClient.chatwoot_url}/app/accounts/${log.extra.account_id}/conversations/${log.extra.conversation_id}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="bg-indigo-600 dark:bg-indigo-600 text-white px-3 py-1.5 rounded-lg border border-indigo-700 flex items-center gap-1.5 hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20 active:scale-95"
                                                                >
                                                                    <FiMessageSquare size={12} /> VER CHAT: {log.extra.conversation_id}
                                                                </a>
                                                            ) : (
                                                                <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded-lg border border-indigo-200/50 flex items-center gap-1.5">
                                                                    <FiMessageSquare size={12} /> ID CONVERSA: {log.extra?.conversation_id || 'N/A'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                    
                                                    {/* Memory Sync Status */}
                                                    {log.extra?.memory_status && (
                                                        <div className="mt-2 flex">
                                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border transition-all flex items-center gap-1 ${
                                                                log.extra.memory_status === 'success' || log.extra.memory_status === 'sent'
                                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' 
                                                                    : log.extra.memory_status === 'failed'
                                                                        ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
                                                                        : log.extra.memory_status === 'not_configured'
                                                                            ? 'bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700'
                                                                            : 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800 animate-pulse'
                                                            }`}>
                                                                🧠 Memória: {
                                                                    log.extra.memory_status === 'success' || log.extra.memory_status === 'sent' ? 'Sincronizado' :
                                                                    log.extra.memory_status === 'failed' ? 'Falha no Sync' :
                                                                    log.extra.memory_status === 'not_configured' ? 'Sem Configuração' : 
                                                                    log.extra.memory_status === 'queued' ? 'Aguardando Fila' : 'Sincronizando...'
                                                                }
                                                            </span>
                                                        </div>
                                                    )}

                                                    {/* Enriched Content (Text Message) */}
                                                    {log.extra?.content && (
                                                        <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 font-medium bg-white dark:bg-gray-900/50 p-3 rounded-xl border border-gray-100 dark:border-gray-800 italic relative overflow-hidden group/content">
                                                            <p className="line-clamp-3">"{log.extra.content}"</p>
                                                            <FiMessageSquare className="absolute -bottom-1 -right-1 opacity-5 text-gray-900 dark:text-white" size={24} />
                                                        </div>
                                                    )}

                                                    {/* Enriched Content (Media) */}
                                                    {log.extra?.media_type && (
                                                        <div className="mt-3 flex flex-col gap-2 overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm transition-all group/media">
                                                            {log.extra.media_type === 'image' && (
                                                                <img 
                                                                    src={resolveUrl(log.extra.media_url)} 
                                                                    alt="Preview" 
                                                                    className="w-full h-auto max-h-64 object-contain bg-gray-50 dark:bg-gray-800 transition-transform duration-500 group-hover/media:scale-105"
                                                                    onError={(e) => {
                                                                        e.target.onerror = null;
                                                                        e.target.src = 'https://placehold.co/400x300?text=Erro+ao+Carregar+Imagem';
                                                                    }}
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
                                                            
                                                            {/* Caption in same media block */}
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

                                                    {isWaiting && log.extra?.target_time && !isProcessing && (
                                                        <div className="mt-3 flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 opacity-60">
                                                            <FiX className="text-gray-400" size={14} />
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Agendamento Interrompido</span>
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

                    {/* Footer */}
                    <div className="p-8 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-4">
                        <div className="flex gap-4">
                            {isProcessing && (
                                <button 
                                    onClick={() => onStop(trigger.id)}
                                    className="flex-1 py-4 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 font-black rounded-2xl hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                                >
                                    <FiX size={18} /> Parar Funil
                                </button>
                            )}
                            {!isProcessing && (
                                <button 
                                    onClick={() => onDelete(trigger.id)}
                                    className="flex-1 py-4 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-black rounded-2xl hover:bg-red-200 dark:hover:bg-red-900/50 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                                >
                                    <FiX size={18} /> Apagar Registro
                                </button>
                            )}
                        </div>
                        
                        <button 
                            onClick={onClose}
                            className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-black rounded-2xl hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest text-sm"
                        >
                            Fechar Pipeline
                        </button>
                    </div>
                </div>
            </div>,
            document.body
        );
    } catch (e) {
        console.error("Critical Render Error in Modal:", e);
        return createPortal(
            <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm">
                <div className="bg-white p-8 rounded-3xl max-w-md text-center">
                    <FiAlertCircle size={48} className="mx-auto text-red-500 mb-4" />
                    <h2 className="text-xl font-black mb-2">Erro de Visualização</h2>
                    <p className="text-gray-600 text-sm mb-6">Ocorreu um erro ao carregar os detalhes do funil. Isso geralmente acontece por falta de algum dado esperado.</p>
                    <pre className="mt-4 p-4 bg-gray-100 rounded-xl text-[10px] text-left overflow-auto max-h-40">{e.message}</pre>
                    <button onClick={onClose} className="mt-6 w-full py-4 bg-gray-900 text-white font-black rounded-2xl">Fechar</button>
                </div>
            </div>,
            document.body
        );
    }
};

const TriggerHistory = ({ refreshKey, onNavigateToBulk }) => {
    const { activeClient } = useClient();
    const { user } = useAuth();
    const [triggers, setTriggers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [monitoringTrigger, setMonitoringTrigger] = useState(null);
    const [modalConfig, setModalConfig] = useState({
        isOpen: false,
        type: null, // 'delete' or 'cancel'
        id: null,
        title: '',
        message: '',
        confirmText: '',
        isDangerous: false
    });

    // Contacts Modal State
    const [contactsModal, setContactsModal] = useState({
        isOpen: false,
        title: '',
        triggerId: null,
        contacts: [],
        counts: {}
    });
    const [contactsFilter, setContactsFilter] = useState('all');
    const [contactsTypeFilter, setContactsTypeFilter] = useState('all');
    const [loadingContacts, setLoadingContacts] = useState(false);

    // Edit Params Modal State
    const [editParamsModal, setEditParamsModal] = useState({
        isOpen: false,
        id: null,
        delay: 5,
        concurrency: 1,
        contacts: [],
        scheduledTime: ''
    });

    // Bulk Selection State
    const [selectedIds, setSelectedIds] = useState([]);

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds((Array.isArray(triggers) ? triggers : []).map(t => t.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (id) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const confirmBulkDelete = () => {
        setModalConfig({
            isOpen: true,
            type: 'bulk_delete',
            id: 'batch', // Dummy ID
            title: `Excluir ${selectedIds.length} Itens`,
            message: `Tem certeza que deseja excluir ${selectedIds.length} registros de histórico selecionados? Esta ação não pode ser desfeita.`,
            confirmText: 'Excluir Selecionados',
            isDangerous: true
        });
    };

    // Error Report Modal State
    const [errorModal, setErrorModal] = useState({
        isOpen: false,
        triggerId: null,
        errors: [],
        isLoading: false
    });

    // Children Funnels Modal State
    const [childrenModal, setChildrenModal] = useState({
        isOpen: false,
        triggerId: null,
        triggerName: '',
        children: [],
        isLoading: false
    });


    const fetchErrors = async (triggerId) => {
        setErrorModal({ isOpen: true, triggerId, errors: [], isLoading: true });
        try {
            const res = await fetchWithAuth(`${API_URL}/triggers/${triggerId}/failures`, {}, activeClient?.id);
            if (res.ok) {
                const data = await res.json();
                setErrorModal(prev => ({ ...prev, errors: data, isLoading: false }));
            } else {
                toast.error("Erro ao buscar relatório de falhas");
                setErrorModal(prev => ({ ...prev, isLoading: false }));
            }
        } catch (e) {
            console.error(e);
            toast.error("Erro de conexão");
            setErrorModal(prev => ({ ...prev, isLoading: false }));
        }
    };

    const fetchChildren = async (trigger) => {
        setChildrenModal({ isOpen: true, triggerId: trigger.id, triggerName: trigger.template_name || trigger.funnel?.name || 'Disparo', children: [], isLoading: true });
        try {
            const res = await fetchWithAuth(`${API_URL}/triggers/${trigger.id}/children`, {}, activeClient?.id);
            if (res.ok) {
                const data = await res.json();
                console.log("Children fetched successfully:", data);
                setChildrenModal(prev => ({ ...prev, children: data, isLoading: false }));
            } else {
                const errorData = await res.json().catch(() => ({}));
                console.error("Failed to fetch children:", res.status, errorData);
                toast.error(`Erro ${res.status}: ${errorData.detail || "Falha ao buscar funis iniciados"}`);
                setChildrenModal(prev => ({ ...prev, isLoading: false }));
            }
        } catch (err) {
            console.error("Error fetching children:", err);
            toast.error("Erro de conexão ao buscar funis iniciados");
            setChildrenModal(prev => ({ ...prev, isLoading: false }));
        }
    };


    // Polling for Children Modal
    useEffect(() => {
        let interval;
        if (childrenModal.isOpen && childrenModal.children.some(c => !['completed', 'failed', 'cancelled'].includes(c.status))) {
            const pollChildren = async () => {
                try {
                    const res = await fetchWithAuth(`${API_URL}/triggers/${childrenModal.triggerId}/children`, {}, activeClient?.id);
                    if (res.ok) {
                        const data = await res.json();
                        setChildrenModal(prev => ({ ...prev, children: data }));
                    }
                } catch (e) { console.error("Poll Error:", e); }
            };
            interval = setInterval(pollChildren, 3000); // Check every 3s
        }
        return () => clearInterval(interval);
    }, [childrenModal.isOpen, childrenModal.children, childrenModal.triggerId, activeClient?.id]);

    // Apply scroll lock when either modal is open
    useScrollLock(contactsModal.isOpen || editParamsModal.isOpen || childrenModal.isOpen);

    // Filter States
    const [filterName, setFilterName] = useState('');
    const [dateRange, setDateRange] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [triggerType, setTriggerType] = useState('all');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [showTechnical, setShowTechnical] = useState(false);

    // Pagination
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    const fetchHistory = useCallback(async () => {
        if (!activeClient) return;
        setLoading(true);
        try {
            const skip = (page - 1) * itemsPerPage;
            let url = `${API_URL}/triggers?limit=${itemsPerPage}&skip=${skip}`;

            if (filterName) url += `&funnel_name=${encodeURIComponent(filterName)}`;
            if (filterStatus && filterStatus !== 'all') url += `&status=${filterStatus}`;
            if (showTechnical) url += `&show_technical=true`;

            const now = new Date();
            let start = null;
            let end = null;
            if (dateRange === 'today') {
                start = new Date(now.setHours(0, 0, 0, 0));
                end = new Date(now.setHours(23, 59, 59, 999));
            } else if (dateRange === '7days') {
                start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            } else if (dateRange === '14days') {
                start = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
            } else if (dateRange === 'month') {
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            } else if (dateRange === 'custom') {
                if (customStart) start = new Date(customStart);
                if (customEnd) end = new Date(customEnd);
            }

            if (start) url += `&start_date=${start.toISOString()}`;
            if (end) url += `&end_date=${end.toISOString()}`;

            if (triggerType && triggerType !== 'all') {
                url += `&trigger_type=${triggerType}`;
            }

            const res = await fetchWithAuth(url, {}, activeClient?.id);
            if (!res.ok) throw new Error("Falha ao carregar histórico");
            const data = await res.json();

            if (data && Array.isArray(data.items)) {
                setTriggers(data.items);
                setTotalItems(typeof data.total === 'number' ? data.total : data.items.length);
                setTotalPages(data.total ? Math.ceil(data.total / itemsPerPage) : 1);
            } else if (Array.isArray(data)) {
                setTriggers(data);
                setTotalItems(data.length);
                setTotalPages(1);
            } else {
                console.error("API returned unexpected data format:", data);
                setTriggers([]);
                setTotalItems(0);
                setTotalPages(1);
            }
        } catch (error) {
            console.error(error);
            toast.error("Erro ao carregar histórico de disparos");
        } finally {
            setLoading(false);
        }
    }, [filterName, dateRange, customStart, customEnd, filterStatus, itemsPerPage, page, triggerType, showTechnical, activeClient]);

    const handleBulkDeleteAction = useCallback(async () => {
        setLoading(true);
        let successCount = 0;
        let failCount = 0;

        for (const id of selectedIds) {
            try {
                const res = await fetchWithAuth(`${API_URL}/triggers/${id}`, { method: 'DELETE' }, activeClient?.id);
                if (res.ok) successCount++;
                else failCount++;
            } catch (e) {
                console.error(e);
                failCount++;
            }
        }

        if (successCount > 0) {
            toast.success(`${successCount} itens excluídos.`);
            // Optimistic update
            setTriggers(prev => prev.filter(t => !selectedIds.includes(t.id)));
        }
        if (failCount > 0) toast.error(`${failCount} falhas na exclusão.`);

        setSelectedIds([]);
        fetchHistory();
        setModalConfig(prev => ({ ...prev, isOpen: false }));
    }, [selectedIds, activeClient, fetchHistory]);

    const handleViewPipeline = useCallback(async (triggerId) => {
        if (!triggerId) return;
        try {
            const res = await fetchWithAuth(`${API_URL}/triggers/${triggerId}`, {}, activeClient?.id);
            if (res.ok) {
                const data = await res.json();
                setMonitoringTrigger(data);
            } else {
                toast.error("Erro ao carregar pipeline");
            }
        } catch (e) {
            console.error(e);
            toast.error("Erro ao conectar ao servidor");
        }
    }, [activeClient, setMonitoringTrigger]);

    const handleAction = useCallback(async () => {
        const { type, id } = modalConfig;
        if (!type || !id) return;

        if (type === 'bulk_delete') {
            await handleBulkDeleteAction();
            return;
        }

        const url = type === 'delete'
            ? `${API_URL}/triggers/${id}`
            : `${API_URL}/triggers/${id}/cancel`;

        const method = type === 'delete' ? 'DELETE' : 'POST';

        try {
            const res = await fetchWithAuth(url, { method }, activeClient?.id);
            if (res.ok) {
                toast.success(type === 'delete' ? "Histórico excluído" : "Envio cancelado");
                if (type === 'delete') {
                    setMonitoringTrigger(null);
                    // Optimistic update
                    setTriggers(prev => prev.filter(t => t.id !== id));
                }
                fetchHistory(); 
            } else {
                const data = await res.json().catch(() => ({}));
                toast.error(data.detail || "Erro na operação");
            }
        } catch (e) {
            console.error(e);
            toast.error("Erro na operação");
        }
        setModalConfig(prev => ({ ...prev, isOpen: false }));
    }, [modalConfig, activeClient, fetchHistory, handleBulkDeleteAction]);



    useEffect(() => {
        if (contactsModal.isOpen && contactsModal.triggerId) {
            fetchTriggerContacts();
        }
    }, [contactsFilter, contactsTypeFilter, contactsModal.isOpen, contactsModal.triggerId]);

    const fetchTriggerContacts = async () => {
        if (!contactsModal.triggerId) return;
        setLoadingContacts(true);
        try {
            let url = `${API_URL}/triggers/${contactsModal.triggerId}/messages`;
            const params = new URLSearchParams();
            
            if (contactsFilter !== 'all') {
                params.append('status_filter', contactsFilter);
            }

            if (contactsTypeFilter !== 'all') {
                params.append('message_type', contactsTypeFilter);
            }
            
            const queryString = params.toString();
            if (queryString) {
                url += `?${queryString}`;
            }

            const res = await fetchWithAuth(url, {}, activeClient?.id);
            if (res.ok) {
                const data = await res.json();
                setContactsModal(prev => ({
                    ...prev,
                    contacts: data.items || [],
                    counts: data.counts || {}
                }));
            }
        } catch (e) {
            console.error(e);
            toast.error("Erro ao carregar lista de contatos");
        } finally {
            setLoadingContacts(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, [refreshKey, activeClient?.id]); // Remove fetchHistory and user to break potential loops

    // WebSocket Realtime Updates
    useEffect(() => {
        let ws;
        const wsBase = WS_URL.endsWith('/ws') ? WS_URL : `${WS_URL}/ws`;
        const wsToken = localStorage.getItem('token');
        const wsFinalUrl = wsToken ? `${wsBase}?token=${wsToken}` : wsBase;
        try {
            ws = new WebSocket(wsFinalUrl);

            ws.onopen = () => console.log("🟢 WebSocket Conectado!");

            ws.onmessage = (event) => {
                try {
                    const payload = JSON.parse(event.data);

                    if (payload.event === "bulk_progress") {
                        // Atualiza estado local sem re-fetch
                        setTriggers(prev => prev.map(t => {
                            if (t.id === payload.data.trigger_id) {
                                return {
                                    ...t,
                                    status: payload.data.status,
                                    total_sent: payload.data.sent,
                                    total_failed: payload.data.failed,
                                    total_delivered: payload.data.delivered,
                                    total_read: payload.data.read,
                                    total_interactions: payload.data.interactions,
                                    total_blocked: payload.data.blocked,
                                    total_cost: payload.data.cost,
                                    total_memory_sent: payload.data.memory_sent
                                };
                            }
                            return t;
                        }));
                    } else if (payload.event === "trigger_deleted") {
                        // Verifica se o trigger pertence ao cliente ativo
                        if (payload.data.client_id === activeClient?.id) {
                            setTriggers(prev => prev.filter(t => t.id !== payload.data.trigger_id));
                        }
                    } else if (payload.event === "trigger_updated") {
                        // Verifica se o trigger pertence ao cliente ativo
                        if (payload.data.client_id === activeClient?.id) {
                            setTriggers(prev => prev.map(t => {
                                if (t.id === payload.data.trigger_id) {
                                    return { ...t, status: payload.data.status };
                                }
                                return t;
                            }));
                        }
                    }
                } catch (e) {
                    console.error("WS Parse Error", e);
                }
            };

            ws.onerror = (e) => console.error("🔴 WS Error", e);

        } catch (e) {
            // Silently fail, it will retry
            // console.error("WS Connection Failed", e);
        }

        // Falback: Polling a cada 60s (SÓ para garantir sincronia se WS cair)
        const interval = setInterval(fetchHistory, 60000);

        return () => {
            if (ws) ws.close();
            clearInterval(interval);
        };
    }, [activeClient?.id]);

    const handleDelete = (id) => {
        setModalConfig({
            isOpen: true,
            type: 'delete',
            id,
            title: 'Excluir Histórico',
            message: 'Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.',
            confirmText: 'Excluir',
            isDangerous: true
        });
    };

    const handleStartNow = async (id) => {
        try {
            const res = await fetchWithAuth(`${API_URL}/triggers/${id}/start-now`, { method: 'POST' }, activeClient?.id);
            if (res.ok) {
                toast.success("Disparo iniciado com sucesso!");
                fetchHistory();
            } else {
                const data = await res.json();
                toast.error(data.detail || "Erro ao iniciar");
            }
        } catch (e) {
            console.error(e);
            toast.error("Erro de conexão");
        }
    };

    const handleCancel = (id) => {
        setModalConfig({
            isOpen: true,
            type: 'cancel',
            id,
            title: 'Cancelar Envio',
            message: 'Tem certeza que deseja interromper este envio em andamento?',
            confirmText: 'Sim, Cancelar',
            isDangerous: true
        });
    };

    const handleRetry = async (id) => {
        try {
            const res = await fetchWithAuth(`${API_URL}/triggers/${id}/retry`, { method: 'POST' }, activeClient?.id);
            if (res.ok) {
                toast.success("Reencontro iniciado com sucesso!");
                fetchHistory();
            } else {
                const data = await res.json();
                toast.error(data.detail || "Erro ao tentar reenviar");
            }
        } catch (e) {
            console.error(e);
            toast.error("Erro de conexão ao tentar reenviar");
        }
    };

    // View Contacts Handler
    const filterLabels = { sent: 'Enviados', delivered: 'Recebidas', read: 'Lidos', failed: 'Falhas', interaction: 'Interações', blocked: 'Bloqueados', free: 'Gratuitas', template: 'Templates', private_note: 'Notas Privadas' };
    const handleViewContacts = (trigger, initialFilter = 'all') => {
        setContactsFilter(initialFilter);
        const label = filterLabels[initialFilter];
        setContactsModal({
            isOpen: true,
            title: label ? `${label} — ${trigger.funnel?.name || trigger.template_name || 'Envio em Massa'}` : `Contatos — ${trigger.funnel?.name || 'Envio em Massa'}`,
            triggerId: trigger.id,
            isTemplate: !!trigger.template_name,
            showTabs: initialFilter === 'all',
            contacts: [],
            counts: {}
        });
    };

    const getStatusBadge = (trigger) => {
        const { status, failure_reason } = trigger;
        switch (status) {
            case 'completed':
                return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">Enviado</span>;
            case 'pending':
                return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700">Agendado</span>;
            case 'processing':
                return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">Enviando...</span>;
            case 'failed':
                return (
                    <div className="flex flex-col items-center gap-1">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">Falha no Envio</span>
                        {failure_reason && <span className="text-[10px] text-red-500 font-medium max-w-[150px] truncate" title={failure_reason}>{failure_reason}</span>}
                    </div>
                );
            case 'cancelled':
                return (
                    <div className="flex flex-col items-center gap-1">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-200 text-gray-700">Cancelado</span>
                        {failure_reason && <span className="text-[10px] text-gray-400 font-medium italic max-w-[150px] truncate" title={failure_reason}>{failure_reason}</span>}
                    </div>
                );
            default:
                return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">{status}</span>;
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';

        let date = new Date(dateString);

        // Check if dateString is strictly naive ISO (no Z, no +, no - after time part)
        // Heuristic: If it ends in a digit, it's likely naive.
        if (!dateString.endsWith('Z') && !dateString.includes('+') && dateString.slice(19).indexOf('-') === -1) {
            // It's naive (or just YYYY-MM-DDTHH:MM:SS), treat as UTC to show correctly in Local
            date = new Date(dateString + 'Z');
        }

        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }).format(date);
    };

    const handleEditParams = (trigger) => {
        let formattedDate = '';
        if (trigger.scheduled_time) {
            // Create date object
            let d = new Date(trigger.scheduled_time);

            // Handle potential naive string from backend treated as UTC by convention
            if (trigger.scheduled_time.indexOf('Z') === -1 && trigger.scheduled_time.indexOf('+') === -1 && trigger.scheduled_time.slice(19).indexOf('-') === -1) {
                d = new Date(trigger.scheduled_time + 'Z');
            }

            // Adjust to local time string for input
            const offset = d.getTimezoneOffset() * 60000;
            const localDate = new Date(d.getTime() - offset);
            formattedDate = localDate.toISOString().slice(0, 16);
        }

        setEditParamsModal({
            isOpen: true,
            id: trigger.id,
            delay: trigger.delay_seconds || 5,
            concurrency: trigger.concurrency_limit || 1,
            contacts: trigger.contacts_list || [],
            scheduledTime: formattedDate
        });
    };

    const saveParams = async () => {
        try {
            const res = await fetchWithAuth(`${API_URL}/triggers/${editParamsModal.id}/update-params`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    delay_seconds: Number(editParamsModal.delay),
                    concurrency_limit: Number(editParamsModal.concurrency),
                    contacts_list: editParamsModal.contacts,
                    scheduled_time: editParamsModal.scheduledTime ? new Date(editParamsModal.scheduledTime).toISOString() : null
                })
            });

            if (res.ok) {
                toast.success("Parâmetros atualizados!");
                setEditParamsModal({ ...editParamsModal, isOpen: false });
                fetchHistory();
            } else {
                const data = await res.json();
                toast.error(data.detail || "Erro ao atualizar");
            }
        } catch (error) {
            console.error(error);
            toast.error("Erro de conexão");
        }
    };





    // Intercept standard handleAction to support bulk delete
    const handleActionWrapper = () => {
        if (modalConfig.type === 'bulk_delete') {
            handleBulkDeleteAction();
        } else {
            handleAction();
        }
    };


    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mt-8 transition-colors duration-200">
            <ConfirmModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
                onConfirm={handleActionWrapper}
                title={modalConfig.title}
                message={modalConfig.message}
                confirmText={modalConfig.confirmText}
                isDangerous={modalConfig.isDangerous}
            />


            {/* Edit Params Modal */}
            {editParamsModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm animated-fade-in">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-sm w-full p-6">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Editar Parâmetros de Envio</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Data/Hora Agendada</label>
                                <input
                                    type="datetime-local"
                                    value={editParamsModal.scheduledTime}
                                    onChange={(e) => setEditParamsModal({ ...editParamsModal, scheduledTime: e.target.value })}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Delay (segundos)</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={editParamsModal.delay}
                                    onChange={(e) => setEditParamsModal({ ...editParamsModal, delay: e.target.value })}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Concorrência</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="50"
                                    value={editParamsModal.concurrency}
                                    onChange={(e) => setEditParamsModal({ ...editParamsModal, concurrency: e.target.value })}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                            <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    Adicionar Mais Contatos (CSV):
                                </label>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                    Atual: <b>{editParamsModal.contacts?.length || 0}</b> contatos.
                                </div>
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={(e) => {
                                        const file = e.target.files[0];
                                        if (!file) return;

                                        const reader = new FileReader();
                                        reader.onload = (event) => {
                                            const text = event.target.result;
                                            const lines = text.split('\n').map(line => line.trim()).filter(line => line);
                                            if (lines.length > 0 && !lines[0].toLowerCase().includes('numero')) {
                                                toast.error('O CSV deve ter a coluna "Numero"');
                                                return;
                                            }
                                            const newContacts = lines.slice(1).map(line => {
                                                const rawNum = line.split(',')[0].trim();
                                                return rawNum.replace(/\D/g, '');
                                            }).filter(num => num && num.length >= 8);

                                            const existing = new Set(editParamsModal.contacts || []);
                                            let addedCount = 0;
                                            newContacts.forEach(c => {
                                                if (!existing.has(c)) {
                                                    existing.add(c);
                                                    addedCount++;
                                                }
                                            });
                                            setEditParamsModal(prev => ({ ...prev, contacts: [...existing] }));
                                            if (addedCount > 0) toast.success(`${addedCount} novos contatos!`);
                                            else toast('Nenhum contato novo.', { icon: 'ℹ️' });
                                        };
                                        reader.readAsText(file);
                                    }}
                                    className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                />
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button onClick={() => setEditParamsModal({ ...editParamsModal, isOpen: false })} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium">Cancelar</button>
                            <button onClick={saveParams} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">Salvar Alterações</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Contacts Viewer Modal - Filterable */}
            {contactsModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm animated-fade-in">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[85vh]" style={{ userSelect: 'none', cursor: 'default' }}>
                        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                            <div className="flex items-center gap-4">
                                <h3 className="font-bold text-gray-800 dark:text-white text-lg">{contactsModal.title}</h3>
                                {contactsModal.isTemplate && (
                                    <select
                                        value={contactsTypeFilter}
                                        onChange={(e) => setContactsTypeFilter(e.target.value)}
                                        className="text-[10px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 outline-none font-black uppercase tracking-widest text-gray-700 dark:text-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500/20 transition-all"
                                    >
                                        <option value="all">✨ Todos os Tipos</option>
                                        <option value="template">💳 Pagos (Template)</option>
                                        <option value="free">🆓 Gratuitos (Livre)</option>
                                    </select>
                                )}
                            </div>
                            <button onClick={() => { setContactsModal({ ...contactsModal, isOpen: false }); setContactsTypeFilter('all'); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>

                        {/* Filters - Only show when opened without a specific filter */}
                        {contactsModal.showTabs && contactsModal.isTemplate && (
                            <div className="px-4 pt-2 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex gap-2 overflow-x-auto no-scrollbar">
                                {[
                                    { id: 'all', label: 'Todos', icon: '📋' },
                                    { id: 'sent', label: 'Enviados', icon: '✅' },
                                    { id: 'free', label: 'Gratuita', icon: '🆓' },
                                    { id: 'template', label: 'Template', icon: '📝' },
                                    { id: 'delivered', label: 'Interações', icon: '📬' }, // Delivered+Read
                                    { id: 'read', label: 'Viram', icon: '👀' },
                                    { id: 'interaction', label: 'Interagiram', icon: '👆' },
                                    { id: 'blocked', label: 'Bloquearam', icon: '🚫' },
                                    { id: 'failed', label: 'Falharam', icon: '❌' },
                                ].map(tab => {
                                    const count = contactsModal.counts?.[tab.id] || 0;
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => setContactsFilter(tab.id)}
                                            className={`pb-2 px-3 text-sm font-medium border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${contactsFilter === tab.id
                                                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                                }`}
                                        >
                                            <span>{tab.icon}</span>
                                            <span>{tab.label}</span>
                                            {count > 0 && (
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${contactsFilter === tab.id ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                                                    {count}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}


                        <div className="p-0 overflow-y-auto flex-1 bg-gray-50 dark:bg-gray-900/30 min-h-[300px]">
                            {loadingContacts ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {contactsModal.contacts.map((contact, i) => (
                                        <div key={i} className="p-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition flex justify-between items-center group">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2 h-2 rounded-full ${contact.status === 'read' ? 'bg-blue-500' :
                                                    contact.status === 'delivered' ? 'bg-green-500' :
                                                        contact.status === 'sent' ? 'bg-blue-300 animate-pulse' :
                                                            contact.status === 'failed' ? 'bg-red-500' :
                                                                contact.failure_reason === 'BLOCKED_VIA_BUTTON' ? 'bg-orange-500' :
                                                                    contact.is_interaction ? 'bg-purple-500' : 'bg-gray-300'
                                                    }`} title={contact.status === 'sent' ? 'Enviado ao WhatsApp (Aguardando Retorno)' : contact.status} />
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="text-sm font-medium text-gray-900 dark:text-white font-mono">
                                                            {contact.phone_number || contact.phone || 'Desconhecido'}
                                                        </div>
                                                        {['FREE_MESSAGE', 'DIRECT_MESSAGE'].includes(contact.message_type) ? (
                                                            <span className="text-[9px] font-black uppercase tracking-tighter bg-cyan-500/10 text-cyan-500 px-1.5 py-0.5 rounded border border-cyan-500/20">Template Grátis</span>
                                                        ) : (
                                                            <span className="text-[9px] font-black uppercase tracking-tighter bg-orange-500/10 text-orange-500 px-1.5 py-0.5 rounded border border-orange-500/20">Template Pago</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <div className="text-[10px] text-gray-400">
                                                            {new Date(contact.updated_at || contact.timestamp).toLocaleString()}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                             <div className="flex items-center gap-3">
                                                <div className="text-right">
                                                    {contact.status === 'sent' && !contact.failure_reason && (
                                                        <div className="text-xs text-blue-400 italic">
                                                            Aguardando entrega...
                                                        </div>
                                                    )}
                                                    {contact.failure_reason && (
                                                        <div className="text-xs text-red-500 max-w-[200px] truncate" title={contact.failure_reason}>
                                                            {contact.failure_reason === 'BLOCKED_VIA_BUTTON' ? 'Bloqueou o contato' : contact.failure_reason}
                                                        </div>
                                                    )}
                                                    {contact.is_interaction && !contact.failure_reason && (
                                                        <div className="text-xs text-purple-600 font-semibold bg-purple-50 dark:bg-purple-900/20 px-2 py-0.5 rounded">
                                                            Interagiu
                                                        </div>
                                                    )}

                                                    {/* AI Memory Status Component */}
                                                    {contact.memory_webhook_status && (
                                                        <div 
                                                            className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 mt-1.5 group/mem relative cursor-help"
                                                            title={contact.memory_webhook_error || (contact.memory_webhook_status === 'sent' || contact.memory_webhook_status === 'success' ? 'Conteúdo salvo na Memória IA' : 'Aguardando processamento')}
                                                        >
                                                            <FiCpu size={12} className={
                                                                contact.memory_webhook_status === 'sent' || contact.memory_webhook_status === 'success' ? 'text-emerald-500 animate-pulse' :
                                                                contact.memory_webhook_status === 'failed' ? 'text-red-500' :
                                                                'text-gray-400'
                                                            } />
                                                            <span className={`text-[9px] font-bold uppercase tracking-tighter ${
                                                                contact.memory_webhook_status === 'sent' || contact.memory_webhook_status === 'success' ? 'text-emerald-600' :
                                                                contact.memory_webhook_status === 'failed' ? 'text-red-600' :
                                                                'text-gray-500'
                                                            }`}>
                                                                Memória
                                                            </span>
                                                        </div>
                                                    )}

                                                    {/* NOTA Privada Status Component */}
                                                    {contact.private_note_posted && (
                                                        <div 
                                                            className="flex items-center justify-center gap-1.5 px-2 py-0.5 rounded-lg bg-pink-50 dark:bg-pink-900/10 border border-pink-100 dark:border-pink-900/20 mt-1 cursor-help"
                                                            title="Nota Privada enviada ao Chatwoot"
                                                        >
                                                            <span className="text-[9px] font-bold uppercase tracking-tighter text-pink-600">
                                                                Nota
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {contactsModal.contacts.length === 0 && (
                                        <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                                            <svg className="w-10 h-10 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                            <p className="text-sm">Nenhum contato encontrado neste filtro.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex justify-end gap-3 z-10">
                            <button onClick={() => {
                                const text = contactsModal.contacts.map(c => c.phone_number || c.phone).join('\n');
                                navigator.clipboard.writeText(text);
                                toast.success('Lista copiada!');
                            }} className="px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition font-medium flex items-center gap-2"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>Copiar Lista</button>
                            <button onClick={() => setContactsModal({ ...contactsModal, isOpen: false })} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition font-medium">Fechar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Report Modal */}
            {errorModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm animated-fade-in">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh]">
                        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-red-50 dark:bg-red-900/30">
                            <h3 className="font-bold text-red-800 dark:text-red-300 text-lg flex items-center gap-2">
                                ❌ Relatório de Falhas
                            </h3>
                            <button onClick={() => setErrorModal({ ...errorModal, isOpen: false })} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>

                        <div className="p-0 overflow-y-auto flex-1 bg-white dark:bg-gray-800 min-h-[300px]">
                            {errorModal.isLoading ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {errorModal.errors.map((err, i) => (
                                        <div key={i} className="p-3 hover:bg-red-50 dark:hover:bg-red-900/10 transition">
                                            <div className="flex justify-between items-start">
                                                <div className="font-mono text-sm font-bold text-gray-800 dark:text-gray-200">
                                                    {err.phone}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {new Date(err.time).toLocaleString()}
                                                </div>
                                            </div>
                                            <div className="mt-1 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-100 dark:border-red-900/50">
                                                {err.reason}
                                            </div>
                                        </div>
                                    ))}
                                    {errorModal.errors.length === 0 && (
                                        <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                                            <p className="text-sm">Nenhuma falha registrada.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex justify-end gap-3">
                            <button onClick={() => {
                                const text = errorModal.errors.map(e => `${e.phone};${e.reason};${e.time}`).join('\n');
                                navigator.clipboard.writeText(text);
                                toast.success('Relatório copiado!');
                            }} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition font-medium text-xs">Copiar Tudo</button>
                            <button onClick={() => setErrorModal({ ...errorModal, isOpen: false })} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium">Fechar</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex flex-col gap-4">
                <div className="flex gap-2 items-center">

                    {selectedIds.length > 0 && user?.role === 'super_admin' && (
                        <button
                            onClick={confirmBulkDelete}
                            className="flex items-center gap-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-3 py-1 rounded-full text-sm font-semibold hover:bg-red-200 dark:hover:bg-red-900/50 transition shadow-sm"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Excluir ({selectedIds.length})
                        </button>
                    )}

                    <div className="flex items-center gap-2">
                        <select
                            value={itemsPerPage}
                            onChange={(e) => setItemsPerPage(Number(e.target.value))}
                            className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-xs text-gray-600 dark:text-gray-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700"
                        >
                            <option value={10}>10 itens</option>
                            <option value={25}>25 itens</option>
                            <option value={50}>50 itens</option>
                            <option value={100}>100 itens</option>
                        </select>
                        <button
                            onClick={fetchHistory}
                            className="p-2 text-gray-400 hover:text-blue-600 transition"
                            title="Atualizar"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 items-center">
                    <input type="text" placeholder="Buscar por funil..." value={filterName} onChange={(e) => { setFilterName(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm w-48 focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                    <select value={dateRange} onChange={(e) => { setDateRange(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                        <option value="all">Todo o período</option>
                        <option value="today">Hoje</option>
                        <option value="7days">Últimos 7 dias</option>
                        <option value="14days">Últimos 14 dias</option>
                        <option value="month">Este mês</option>
                        <option value="custom">Personalizado</option>
                    </select>
                    <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                        <option value="all">Todos os status</option>
                        <option value="pending">Agendado</option>
                        <option value="processing">Enviando</option>
                        <option value="completed">Enviado</option>
                        <option value="failed">Falha</option>
                        <option value="cancelled">Cancelado</option>
                    </select>
                    
                    {onNavigateToBulk && (
                        <button
                            onClick={onNavigateToBulk}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all duration-200"
                            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: '2px solid transparent' }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.borderColor = '#a78bfa'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.borderColor = 'transparent'; }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                            Disparo em Massa
                        </button>
                    )}
                    {dateRange === 'custom' && (<><input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /><span className="text-gray-400">-</span><input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /></>)}
                </div>
            </div>

            <div className="overflow-x-auto">
                {loading && (Array.isArray(triggers) && triggers.length === 0) ? (
                    <div className="p-8 text-center text-gray-400 animate-pulse">Carregando histórico...</div>
                ) : (Array.isArray(triggers) ? triggers : []).filter(t => {
                    if (triggerType === 'funnel') return !t?.is_bulk;
                    if (triggerType === 'bulk') return t?.is_bulk;
                    return true;
                }).length === 0 ? (
                    <div className="p-8 text-center text-gray-400">Nenhum disparo registrado.</div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                <th className="p-4 w-8">
                                    <input
                                        type="checkbox"
                                        onChange={handleSelectAll}
                                        checked={(Array.isArray(triggers) ? triggers : []).length > 0 && selectedIds.length === (Array.isArray(triggers) ? triggers : []).length}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                </th>
                                <th className="p-4 font-semibold">Processamento</th>
                                <th className="p-4 font-semibold">Funil</th>
                                <th className="p-4 font-semibold text-center">Status</th>
                                <th className="p-4 font-semibold text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                            {(Array.isArray(triggers) ? triggers : [])
                                .filter(t => {
                                    if (triggerType === 'funnel') return !t?.is_bulk;
                                    if (triggerType === 'bulk') return t?.is_bulk;
                                    return true;
                                })
                                .map((trigger) => (
                                    <tr key={trigger?.id || Math.random()} className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 transition ${selectedIds.includes(trigger?.id) ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}>
                                        <td className="p-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(trigger.id)}
                                                onChange={() => handleSelectOne(trigger.id)}
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                        </td>
                                        <td className="p-4 text-[11px] text-gray-600 dark:text-gray-300 leading-tight">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-1.5 whitespace-nowrap">
                                                    <span className="text-gray-400 font-bold uppercase tracking-tighter text-[9px]">Chegada:</span>
                                                    <span className="font-mono">{formatDate(trigger.created_at)}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 whitespace-nowrap">
                                                    <span className="text-blue-500 font-bold uppercase tracking-tighter text-[9px]">Disparo:</span>
                                                    <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">{formatDate(trigger.scheduled_time)}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm font-medium text-gray-800 dark:text-gray-200">
                                            {trigger.is_bulk ? (
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-blue-600 dark:text-blue-400">📤 {trigger.template_name?.split('|').pop() || trigger.funnel?.name || 'Disparo em Massa'}</span>
                                                        <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">Bulk</span>
                                                    </div>
                                                    {(trigger.template_name) && (
                                                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex flex-wrap gap-3">
                                                            <button
                                                                onClick={() => handleViewContacts(trigger, 'sent')}
                                                                className="flex items-center gap-1 hover:bg-gray-100 dark:hover:bg-gray-700/50 px-1.5 py-0.5 rounded transition cursor-pointer group"
                                                                title="Ver Enviados"
                                                            >
                                                                <span>✅</span>
                                                                <span className="font-medium group-hover:underline">{trigger.total_sent}</span>
                                                            </button>

                                                            {trigger.total_delivered > 0 && (
                                                                <button
                                                                    onClick={() => handleViewContacts(trigger, 'delivered')}
                                                                    className="flex items-center gap-1 hover:bg-green-50 dark:hover:bg-green-900/20 px-1.5 py-0.5 rounded transition cursor-pointer group"
                                                                    title="Ver Entregues"
                                                                >
                                                                    <span>📬</span>
                                                                    <span className="font-semibold text-green-600 group-hover:underline">{trigger.total_delivered}</span>
                                                                </button>
                                                            )}

                                                            {trigger.total_read > 0 && (
                                                                <button
                                                                    onClick={() => handleViewContacts(trigger, 'read')}
                                                                    className="flex items-center gap-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-1.5 py-0.5 rounded transition cursor-pointer group"
                                                                    title="Ver Lidos"
                                                                >
                                                                    <span>👀</span>
                                                                    <span className="font-semibold text-blue-500 group-hover:underline">{trigger.total_read}</span>
                                                                </button>
                                                            )}



                                                            {(trigger.child_count > 0) && (
                                                                <button
                                                                    onClick={() => fetchChildren(trigger)}
                                                                    className="flex items-center gap-1 hover:bg-orange-50 dark:hover:bg-orange-900/20 px-1.5 py-0.5 rounded transition cursor-pointer group/rocket"
                                                                    title="Ver Funis Iniciados por este disparo"
                                                                >
                                                                    <FiNavigation size={12} className="rotate-45 text-orange-600 group-hover/rocket:scale-110 transition-transform" />
                                                                    <span className="font-bold text-orange-600 group-hover/rocket:underline">{trigger.child_count}</span>
                                                                </button>
                                                            )}

                                                            {trigger.total_interactions > 0 && (
                                                                <button
                                                                    onClick={() => handleViewContacts(trigger, 'interaction')}
                                                                    className="flex items-center gap-1 hover:bg-purple-50 dark:hover:bg-purple-900/20 px-1.5 py-0.5 rounded transition cursor-pointer group"
                                                                    title="Ver Cliques/Respostas"
                                                                >
                                                                    <span>👆</span>
                                                                    <span className="font-bold text-purple-600 group-hover:underline">{trigger.total_interactions}</span>
                                                                </button>
                                                            )}

                                                            {trigger.total_blocked > 0 && (
                                                                <button
                                                                    onClick={() => handleViewContacts(trigger, 'blocked')}
                                                                    className="flex items-center gap-1 hover:bg-orange-50 dark:hover:bg-orange-900/20 px-1.5 py-0.5 rounded transition cursor-pointer group"
                                                                    title="Ver Desserções (Bloqueios)"
                                                                >
                                                                    <span>🚫</span>
                                                                    <span className="font-bold text-orange-600 group-hover:underline">{trigger.total_blocked}</span>
                                                                </button>
                                                            )}

                                                            {trigger.total_failed > 0 && (
                                                                <button
                                                                    onClick={() => handleViewContacts(trigger, 'failed')}
                                                                    className="flex items-center gap-1 hover:bg-red-50 dark:hover:bg-red-900/20 px-1.5 py-0.5 rounded transition cursor-pointer group"
                                                                    title="Ver Falhas"
                                                                >
                                                                    <span>❌</span>
                                                                    <span className="font-semibold text-red-500 group-hover:underline">{trigger.total_failed}</span>
                                                                </button>
                                                            )}


                                                        </div>
                                                    )}
                                                    {trigger.total_failed > 0 && (
                                                        <button
                                                            onClick={() => fetchErrors(trigger.id)}
                                                            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 mt-1 font-semibold"
                                                        >
                                                            📋 Ver Relatório de Falhas ({trigger.total_failed})
                                                        </button>
                                                    )}
                                                    {trigger.total_delivered > 0 && (
                                                        <div className={`text-xs font-semibold mt-2 flex flex-wrap gap-2 items-center ${trigger.total_cost > 0 ? 'text-green-600 dark:text-green-400' : 'text-blue-500'}`}>
                                                            <span>{trigger.total_cost > 0 ? `💰 R$ ${trigger.total_cost.toFixed(2)}` : '🆓 de graça'}</span>

                                                            {trigger.total_cost > 0 && trigger.total_interactions > 0 && (
                                                                <span className="text-[10px] bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded border border-green-200 dark:border-green-800" title="Custo por Interação (CPI)">
                                                                    R$ {(trigger.total_cost / trigger.total_interactions).toFixed(2)} / interação
                                                                </span>
                                                            )}

                                                            <span className="opacity-60 text-[10px]">
                                                                ({trigger.total_paid_templates || 0} {trigger.total_paid_templates === 1 ? 'template pago' : 'templates pagos'})
                                                                {trigger.total_delivered > trigger.total_paid_templates && ` - ${trigger.total_delivered} entregues no total`}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="uppercase text-xs font-black tracking-wider text-gray-500 mr-1">{trigger.event_type?.replace('_', ' ') || 'WEBHOOK'}:</span>
                                                        {trigger.funnel?.name || <span className="text-gray-400 italic">Funil Apagado (ID: {trigger.funnel_id})</span>}

                                                    </div>
                                                    {trigger.total_delivered > 0 && (
                                                        <div className={`text-[10px] font-bold mt-0.5 ${trigger.total_cost > 0 ? 'text-green-600 dark:text-green-400' : 'text-blue-500'}`}>
                                                            {trigger.total_cost > 0 ? `💰 R$ ${trigger.total_cost.toFixed(2)}` : '🆓 de graça'}
                                                            <span className="opacity-60 font-medium ml-1">
                                                                ({trigger.total_paid_templates || 0} {trigger.total_paid_templates === 1 ? 'template' : 'templates'})
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-3 mt-2 border-t border-gray-100 dark:border-gray-800/50 pt-2">
                                                        <button
                                                            onClick={() => handleViewPipeline(trigger.id)}
                                                            className="flex items-center gap-1 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 px-1.5 py-0.5 rounded transition cursor-pointer group/rocket"
                                                            title="Ver Pipeline de Execução"
                                                        >
                                                            <FiNavigation size={12} className="rotate-45 text-indigo-500 group-hover/rocket:text-indigo-600 transition-colors" />
                                                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-tighter group-hover/rocket:underline">Pipeline</span>
                                                        </button>
                                                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-purple-600 dark:text-purple-400" title="Interações (Cliques/Respostas)">
                                                            <FiMousePointer size={10} />
                                                            <span className="text-[10px] font-bold">{trigger.total_interactions || 0}</span>
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4 text-center">
                                            {getStatusBadge(trigger)}
                                            {!trigger.is_bulk && (trigger.status === 'failed' || trigger.status === 'cancelled') && trigger.failure_reason && (
                                                <div className={`text-[10px] mt-1.5 leading-tight max-w-[150px] mx-auto break-words italic font-medium ${trigger.status === 'failed' ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                                                    {trigger.failure_reason}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4 text-right flex justify-end gap-2">
                                            {(trigger.status === 'pending' || trigger.status === 'processing') ? (
                                                <>
                                                    {trigger.is_bulk && trigger.status === 'pending' && (<button onClick={() => handleEditParams(trigger)} className="p-1 text-blue-500 hover:bg-blue-50 rounded" title="Editar Parâmetros (Delay/Concorrência)"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>)}
                                                    <button onClick={() => handleStartNow(trigger.id)} className="p-1 text-green-500 hover:bg-green-50 rounded" title="Iniciar Agora (Ignorar Agendamento)"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></button>
                                                    <button onClick={() => handleCancel(trigger.id)} className="p-1 text-red-500 hover:bg-red-50 rounded" title="Cancelar Envio"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                                                </>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    {trigger.status === 'failed' && (
                                                        <button
                                                            onClick={() => handleRetry(trigger.id)}
                                                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                                            title="Tentar Novamente (Reenviar)"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                    {user?.role === 'super_admin' && (
                                                        <button onClick={() => handleDelete(trigger.id)} className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded" title="Excluir Histórico">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                )}

                {/* Paginação */}
                {triggers.length > 0 && (
                    <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 flex justify-between items-center">
                        <div className="flex flex-col">
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                Página <strong>{page}</strong> de <strong>{totalPages}</strong>
                            </div>
                            <div className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">
                                Total de {totalItems} registros
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition shadow-sm font-medium"
                            >
                                Anterior
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages || totalPages === 0}
                                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition shadow-sm font-medium"
                            >
                                Próxima
                            </button>
                        </div>
                    </div>
                )}

                {/* BARRA DE RESUMO ACUMULADO (FLOATING) */}
                {selectedIds.length > 0 && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-blue-200 dark:border-blue-900 shadow-[0_20px_50px_rgba(0,0,0,0.2)] rounded-2xl p-4 flex items-center gap-8 min-w-[600px]">
                            {/* Seleção */}
                            <div className="flex flex-col border-r border-gray-200 dark:border-gray-700 pr-6">
                                <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Selecionados</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl font-black text-gray-800 dark:text-white">{selectedIds.length}</span>
                                    <button
                                        onClick={() => setSelectedIds([])}
                                        className="text-[10px] font-bold bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-500 px-2 py-1 rounded-md transition"
                                    >
                                        LIMPAR
                                    </button>
                                </div>
                            </div>

                            {/* Totais Acumulados */}
                            <div className="flex flex-1 justify-around gap-6">
                                {(() => {
                                    const selectedTriggers = (Array.isArray(triggers) ? triggers : []).filter(t => selectedIds.includes(t.id));
                                    const totals = selectedTriggers.reduce((acc, curr) => ({
                                        sent: acc.sent + (curr.total_sent || 0),
                                        delivered: acc.delivered + (curr.total_delivered || 0),
                                        read: acc.read + (curr.total_read || 0),
                                        interactions: acc.interactions + (curr.total_interactions || 0),
                                        blocked: acc.blocked + (curr.total_blocked || 0),
                                        failed: acc.failed + (curr.total_failed || 0),
                                        cost: acc.cost + (curr.total_cost || 0)
                                    }), { sent: 0, delivered: 0, read: 0, interactions: 0, blocked: 0, failed: 0, cost: 0 });

                                    return (
                                        <>
                                            <div className="flex flex-col items-center">
                                                <span className="text-xl">✅</span>
                                                <span className="text-sm font-bold text-gray-800 dark:text-gray-100">{totals.sent}</span>
                                                <span className="text-[9px] font-bold text-gray-400 uppercase">Enviados</span>
                                            </div>
                                            <div className="flex flex-col items-center">
                                                <span className="text-xl">📬</span>
                                                <span className="text-sm font-bold text-green-600">{totals.delivered}</span>
                                                <span className="text-[9px] font-bold text-gray-400 uppercase">Entregues</span>
                                            </div>
                                            <div className="flex flex-col items-center">
                                                <span className="text-xl">👀</span>
                                                <span className="text-sm font-bold text-blue-500">{totals.read}</span>
                                                <span className="text-[9px] font-bold text-gray-400 uppercase">Lidos</span>
                                            </div>
                                            <div className="flex flex-col items-center">
                                                <span className="text-xl">👆</span>
                                                <span className="text-sm font-bold text-purple-600">{totals.interactions}</span>
                                                <span className="text-[9px] font-bold text-gray-400 uppercase">Cliques</span>
                                            </div>
                                            <div className="flex flex-col items-center">
                                                <span className="text-xl">🚫</span>
                                                <span className="text-sm font-bold text-orange-600">{totals.blocked}</span>
                                                <span className="text-[9px] font-bold text-gray-400 uppercase">Bloqueios</span>
                                            </div>
                                            <div className="flex flex-col items-center">
                                                <span className="text-xl">❌</span>
                                                <span className="text-sm font-bold text-red-500">{totals.failed}</span>
                                                <span className="text-[9px] font-bold text-gray-400 uppercase">Falhas</span>
                                            </div>

                                            {/* Custo Total */}
                                            <div className="flex flex-col items-end border-l border-gray-200 dark:border-gray-700 pl-6 min-w-[150px]">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-green-500">Investimento Total</span>
                                                <span className="text-2xl font-black text-green-600 dark:text-green-400">
                                                    R$ {totals.cost.toFixed(2)}
                                                </span>

                                                {totals.interactions > 0 && (
                                                    <div className="mt-1 flex flex-col items-end">
                                                        <div className="flex items-center gap-2">
                                                            <div className="bg-green-100 dark:bg-green-900/40 border border-green-200 dark:border-green-800 px-2 py-0.5 rounded text-[10px] font-bold text-green-700 dark:text-green-300">
                                                                R$ {(totals.cost / totals.interactions).toFixed(2)} / interação
                                                            </div>
                                                            <span className="text-[10px] text-gray-400 font-medium">({totals.delivered} entregues)</span>
                                                        </div>
                                                        <span className="text-[9px] font-bold text-gray-400 mt-1 uppercase tracking-tighter">
                                                            Taxa de Conversão: {((totals.interactions / totals.delivered) * 100).toFixed(1)}%
                                                        </span>
                                                    </div>
                                                )}
                                                {totals.interactions === 0 && totals.delivered > 0 && (
                                                    <span className="text-[10px] text-gray-400 font-medium mt-1">({totals.delivered} entregues, 0 interações)</span>
                                                )}
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                )}

                {/* --- Children Funnels Modal --- */}
                {childrenModal.isOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-800 animate-in zoom-in-95 duration-200">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/30">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center text-2xl">
                                        🚀
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-gray-900 dark:text-gray-100 leading-tight">
                                            Funis Iniciados
                                        </h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                                            A partir de: <span className="text-orange-600 dark:text-orange-400 font-bold">{childrenModal.triggerName}</span>
                                        </p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setChildrenModal(prev => ({ ...prev, isOpen: false }))}
                                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors group"
                                >
                                    <span className="text-2xl group-hover:rotate-90 transition-transform inline-block">✕</span>
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6">
                                {childrenModal.isLoading ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                                        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                                        <p className="text-gray-500 font-bold animate-pulse uppercase tracking-widest text-xs">Carregando execuções...</p>
                                    </div>
                                ) : childrenModal.children.length === 0 ? (
                                    <div className="text-center py-20 flex flex-col items-center gap-4">
                                        <span className="text-5xl">🏜️</span>
                                        <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">Nenhum funil iniciado ainda.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {childrenModal.children.map(child => (
                                            <div 
                                                key={child.id}
                                                className="bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 rounded-xl p-4 flex items-center justify-between group hover:border-orange-200 dark:hover:border-orange-900/50 transition-all hover:shadow-lg"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="flex flex-col">
                                                         <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">
                                                            {(() => {
                                                                try {
                                                                    const date = new Date(child.updated_at || child.created_at);
                                                                    return isNaN(date.getTime()) ? 'Data inválida' : date.toLocaleString('pt-BR');
                                                                } catch (e) {
                                                                    return 'Sem data';
                                                                }
                                                            })()}
                                                        </span>
                                                        <span className="font-bold text-gray-800 dark:text-gray-200 transition-colors">
                                                            {child.template_name || child.funnel?.name || 'Sem nome'}
                                                        </span>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                                                Para: {child.contact_name || child.contact_phone}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col items-end gap-2">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex flex-col items-center px-3 py-1 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-lg shadow-sm">
                                                            <span className="text-[10px] font-bold text-gray-400 uppercase leading-none mb-1">Status Funil</span>
                                                            <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                                                                child.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                                child.status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                                child.status === 'processing' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 animate-pulse' :
                                                                'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                                                            }`}>
                                                                {child.status === 'completed' ? 'CONCLUÍDO' : 
                                                                 child.status === 'failed' ? 'FALHA' :
                                                                 child.status === 'processing' ? 'EM EXECUÇÃO...' : 
                                                                 child.status.toUpperCase()}
                                                            </span>
                                                        </div>
                                                        
                                                        {(child.total_delivered > 0 || child.total_sent > 0) && (
                                                            <div className="flex flex-col items-center px-3 py-1 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-lg shadow-sm">
                                                                <span className="text-[10px] font-bold text-gray-400 uppercase leading-none mb-1">Envios</span>
                                                                <div className="flex items-center gap-1">
                                                                    <span className="text-xs font-black text-green-600">{child.total_sent} env</span>
                                                                    {child.total_delivered > 0 && <span className="text-[10px] font-bold text-blue-500">({child.total_delivered} ent)</span>}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-2 mt-3">
                                                        <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                                                            child.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                            child.status === 'processing' ? 'bg-blue-100 text-blue-700 animate-pulse' :
                                                            child.status === 'failed' ? 'bg-red-100 text-red-700' :
                                                            'bg-gray-100 text-gray-700'
                                                        }`}>
                                                            Status: {child.status === 'processing' ? 'Em Execução' : 
                                                                    child.status === 'completed' ? 'Concluído' :
                                                                    child.status === 'failed' ? 'Falhou' : 'Aguardando'}
                                                        </div>

                                                        {/* PERSISTENT MONITOR BUTTON */}
                                                        <button
                                                            onClick={() => setMonitoringTrigger(child)}
                                                            className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 rounded text-[10px] font-black text-gray-600 dark:text-gray-300 transition-all shadow-sm active:scale-95"
                                                        >
                                                            <FiActivity className="text-blue-500" /> MONITORAR AO VIVO
                                                        </button>

                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex justify-end">
                                <button 
                                    onClick={() => setChildrenModal(prev => ({ ...prev, isOpen: false }))}
                                    className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-black rounded-xl transition-all uppercase tracking-widest"
                                >
                                    Fechar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* SEGURANÇA: Só renderiza o modal se houver um trigger de fato */}
            {monitoringTrigger && (
                <AutomationPipelineModal 
                    trigger={monitoringTrigger} 
                    onClose={() => setMonitoringTrigger(null)} 
                    onStop={(id) => {
                        setModalConfig({
                            isOpen: true,
                            type: 'cancel',
                            id: id,
                            title: 'Parar Automação?',
                            message: 'Isso interromperá imediatamente o envio das próximas mensagens deste contato.',
                            confirmText: 'Sim, Parar',
                            isDangerous: true
                        });
                    }}
                    onDelete={(id) => {
                        setModalConfig({
                            isOpen: true,
                            type: 'delete',
                            id: id,
                            title: 'Apagar Histórico?',
                            message: 'Esta ação removerá permanentemente o registro deste disparo e suas estatísticas. Deseja continuar?',
                            confirmText: 'Sim, Apagar',
                            isDangerous: true
                        });
                        // Removido setMonitoringTrigger(null) para não fechar o modal prematuramente
                    }}
                />
            )}

        </div>
    );
};

export default TriggerHistory;
