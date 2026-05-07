import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FiZap, FiActivity, FiCheckCircle, FiAlertCircle, FiX, FiUser, FiMessageSquare, FiCpu, FiClock, FiMusic, FiVideo, FiImage, FiFile, FiLayers } from 'react-icons/fi';
import { API_URL } from '../../../config';
import { fetchWithAuth } from '../../../AuthContext';
import { useClient } from '../../../contexts/ClientContext';
import { toast } from 'react-hot-toast';
import useScrollLock from '../../../hooks/useScrollLock';
import CountdownTimer from './CountdownTimer';

const resolveUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const baseUrl = API_URL.replace(/\/api\/*$/, '');
    return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
};

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
            <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 md:p-8 animate-in fade-in duration-300">
                <div className="bg-white dark:bg-gray-900 w-full max-w-2xl max-h-[90vh] rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                    
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

                        <div className="flex flex-col gap-2">
                            {trigger.is_interaction && (
                                <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-2 text-emerald-500">
                                    <FiZap size={16} className="animate-pulse" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Janela 24h Ativa</span>
                                </div>
                            )}

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
                    </div>

                    <div className="px-8 pb-6">
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-3xl p-5 flex items-center justify-between">
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
                                                    
                                                    {(log.node_id === 'DISCOVERY' || log.extra?.account_id) && (
                                                        <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold">
                                                            <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-lg border border-blue-200/50 flex items-center gap-1.5">
                                                                <FiCpu size={12} /> ID CONTA: {log.extra?.account_id || 'N/A'}
                                                            </span>
                                                            {log.extra?.conversation_id && activeClient?.chatwoot_url ? (
                                                                <a 
                                                                    href={`${activeClient.chatwoot_url}/app/accounts/${log.extra.account_id}/conversations/${log.extra.conversation_id}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg border border-indigo-700 flex items-center gap-1.5 hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20 active:scale-95"
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
                                                    
                                                    {log.extra?.memory_status && (
                                                        <div className="mt-2 flex">
                                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border transition-all flex items-center gap-1 ${
                                                                log.extra.memory_status === 'success' || log.extra.memory_status === 'sent'
                                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' 
                                                                    : log.extra.memory_status === 'failed'
                                                                        ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
                                                                        : 'bg-indigo-50 text-indigo-700 border-indigo-200 animate-pulse'
                                                            }`}>
                                                                🧠 Memória: {
                                                                    log.extra.memory_status === 'success' || log.extra.memory_status === 'sent' ? 'Sincronizado' :
                                                                    log.extra.memory_status === 'failed' ? 'Falha no Sync' : 'Sincronizando...'
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

                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex flex-col md:flex-row gap-3">
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
                    <p className="text-gray-600 text-sm mb-6">Ocorreu um erro ao carregar os detalhes do funil.</p>
                    <button onClick={onClose} className="mt-6 w-full py-4 bg-gray-900 text-white font-black rounded-2xl">Fechar</button>
                </div>
            </div>,
            document.body
        );
    }
};

export default AutomationPipelineModal;
