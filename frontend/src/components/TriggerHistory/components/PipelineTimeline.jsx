import React from 'react';
import { FiActivity, FiCheckCircle, FiAlertCircle, FiClock, FiCpu, FiMessageSquare, FiMusic, FiFile, FiLayers } from 'react-icons/fi';
import CountdownTimer from './CountdownTimer';
import { API_URL } from '../../../config';

const resolveUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const baseUrl = API_URL.replace(/\/api\/*$/, '');
    return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
};

const PipelineTimeline = ({ history, trigger, activeClient, isProcessing }) => {
    if (history.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <FiActivity size={48} className="animate-pulse mb-4 text-blue-500/50 dark:text-blue-400/50" />
                <p className="font-black uppercase tracking-widest text-sm text-gray-500 dark:text-gray-400">Aguardando início do fluxo...</p>
            </div>
        );
    }

    return (
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
                                            <div className="p-3 border-t border-gray-100 dark:border-gray-800 bg-gray-55/30 dark:bg-gray-900/40 italic text-xs text-gray-600 dark:text-gray-400">
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
    );
};

export default PipelineTimeline;
export { resolveUrl };
