import React from 'react';
import { Handle, Position } from 'reactflow';
import { 
    FiMessageSquare, FiMusic, FiImage, FiClock, FiGitMerge, 
    FiZap, FiLayers, FiUser, FiCalendar 
} from 'react-icons/fi';

const getNodeConfig = (type, data) => {
    switch (type) {
        case 'messageNode':
        case 'message':
            return {
                icon: FiMessageSquare,
                color: 'text-blue-500',
                bgColor: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200/50 dark:border-blue-800/30',
                title: 'Mensagem'
            };
        case 'audioNode':
        case 'audio':
            return {
                icon: FiMusic,
                color: 'text-purple-500',
                bgColor: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200/50 dark:border-purple-800/30',
                title: 'Áudio'
            };
        case 'mediaNode':
        case 'media':
            return {
                icon: FiImage,
                color: 'text-indigo-500',
                bgColor: 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200/50 dark:border-indigo-800/30',
                title: 'Mídia / Arquivo'
            };
        case 'delayNode':
        case 'delay':
            const isRandom = data.useRandom ?? false;
            let titleText = '';
            if (isRandom) {
                titleText = `Aguardar ${data.minTime || data.time || 10}s a ${data.maxTime || data.minTime || data.time || 10}s`;
            } else {
                const timeVal = data.time || data.delay || 10;
                const unitVal = data.unit || 'seconds';
                const unitAbbr = unitVal === 'seconds' ? 's' : unitVal === 'minutes' ? 'm' : unitVal === 'hours' ? 'h' : 'd';
                titleText = `Aguardar ${timeVal}${unitAbbr}`;
            }
            return {
                icon: FiClock,
                color: 'text-orange-500',
                bgColor: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200/50 dark:border-orange-800/30',
                title: titleText
            };
        case 'conditionNode':
        case 'condition':
            return {
                icon: FiGitMerge,
                color: 'text-rose-500',
                bgColor: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200/50 dark:border-rose-800/30',
                title: 'Condição'
            };
        case 'randomizerNode':
        case 'randomizer':
            return {
                icon: FiZap,
                color: 'text-amber-500',
                bgColor: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200/50 dark:border-amber-800/30',
                title: 'Divisor A/B'
            };
        case 'chatwoot_label':
        case 'labelNode':
            return {
                icon: FiLayers,
                color: 'text-emerald-500',
                bgColor: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/50 dark:border-emerald-800/30',
                title: 'Adicionar Etiqueta'
            };
        case 'dateNode':
        case 'date':
            return {
                icon: FiCalendar,
                color: 'text-violet-500',
                bgColor: 'bg-violet-50 dark:bg-violet-950/30 border-violet-200/50 dark:border-violet-800/30',
                title: 'Agendamento Data'
            };
        default:
            return {
                icon: FiZap,
                color: 'text-slate-500',
                bgColor: 'bg-slate-50 dark:bg-slate-900 border-slate-200/50 dark:border-slate-800',
                title: 'Passo do Funil'
            };
    }
};

const getStatusStyles = (status) => {
    switch (status) {
        case 'completed':
            return {
                borderClass: 'border-green-500/60 dark:border-green-600/50',
            };
        case 'processing':
        case 'started':
            return {
                borderClass: 'border-blue-500/60 dark:border-blue-600/50',
            };
        case 'waiting':
        case 'suspended':
            return {
                borderClass: 'border-orange-500/60 dark:border-orange-600/50',
            };
        case 'failed':
            return {
                borderClass: 'border-red-500/60 dark:border-red-600/50',
            };
        default:
            return {
                borderClass: 'border-gray-200 dark:border-gray-800',
            };
    }
};

const resolveUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const baseUrl = (window.API_URL || '').replace(/\/api\/*$/, '') || 'http://localhost:8000';
    return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
};

const PipelineNode = ({ id, data }) => {
    const type = data.type || 'message';
    const config = getNodeConfig(type, data);
    const status = data.status || 'pending';
    const statusStyles = getStatusStyles(status);
    const IconComponent = config.icon;
    
    // Contadores para disparos em massa
    const showCounters = data.bulkStats && typeof data.bulkStats === 'object';
    const stats = data.bulkStats || {};

    // Determina o nome amigável a exibir com base no tipo se o label for genérico
    let displayName = data.label || data.name || '';
    if (!displayName || displayName.toLowerCase() === 'passo') {
        if (type === 'message' || type === 'messageNode') {
            displayName = 'Mensagem';
        } else if (type === 'date' || type === 'dateNode') {
            displayName = 'Agendamento Data';
        } else if (type === 'audio' || type === 'audioNode') {
            displayName = 'Áudio';
        } else if (type === 'media' || type === 'mediaNode') {
            displayName = 'Mídia / Arquivo';
        } else if (type === 'delay' || type === 'delayNode') {
            displayName = 'Agendamento Delay';
        } else if (type === 'condition' || type === 'conditionNode') {
            displayName = 'Condição';
        } else if (type === 'randomizer' || type === 'randomizerNode') {
            displayName = 'Divisor A/B';
        } else if (type === 'labelNode' || type === 'chatwoot_label') {
            displayName = 'Adicionar Etiqueta';
        } else {
            displayName = 'Passo';
        }
    }

    return (
        <div className={`w-64 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-2xl border transition-all duration-300 ${statusStyles.borderClass}`}>
            
            {/* Target handle para conexão de entrada */}
            <Handle 
                type="target" 
                position={Position.Top} 
                className="w-3 h-3 bg-blue-500 border-2 border-white dark:border-gray-900" 
                style={{ top: -6 }}
            />
            
            {/* Header do Nó */}
            <div className="p-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
                <div className={`p-1.5 rounded-lg border ${config.bgColor} flex items-center justify-center shrink-0`}>
                    <IconComponent className={config.color} size={16} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none mb-0.5">
                        {config.title}
                    </p>
                    <p className="text-xs font-black text-gray-800 dark:text-white truncate">
                        {displayName}
                    </p>
                </div>
            </div>

            {/* Corpo do Nó */}
            <div className="p-3.5 space-y-2">
                
                {/* Conteúdo Textual do Passo */}
                {data.content && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-medium leading-relaxed line-clamp-2 italic bg-gray-50 dark:bg-gray-950/20 p-2 rounded-xl border border-gray-100/50 dark:border-gray-800/30">
                        "{data.content}"
                    </p>
                )}

                {/* Exibição específica para Delays */}
                {type === 'delayNode' && (
                    <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 flex items-center gap-1.5">
                        ⏱️ {data.useRandom 
                            ? `Aguardando entre ${data.minTime || data.time || 10} e ${data.maxTime || data.minTime || data.time || 10} ${data.unit === 'seconds' ? 'segundos' : data.unit === 'minutes' ? 'minutos' : data.unit === 'hours' ? 'horas' : 'dias'}`
                            : `Aguardando ${data.time || data.delay || 10} ${data.unit === 'seconds' || !data.unit ? 'segundos' : data.unit === 'minutes' ? 'minutos' : data.unit === 'hours' ? 'horas' : 'dias'}`
                        }
                    </p>
                )}

                {/* Exibição específica para Agendamento Data */}
                {(type === 'dateNode' || type === 'date') && (
                    <div className="space-y-1.5 w-full">
                        <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 flex items-center gap-1.5 bg-violet-50/50 dark:bg-violet-950/10 p-2 rounded-xl border border-violet-100/30 dark:border-violet-800/20 w-full justify-center">
                            📅 {(() => {
                                const mode = data.mode || 'date';
                                if (mode === 'date') {
                                    return `Agendado: ${data.dateValue || 'Não configurada'}`;
                                } else if (mode === 'time') {
                                    return `Horário: ${data.timeValue || '12:00'}`;
                                } else {
                                    return `${data.dateValue || 'Sem data'} às ${data.timeValue || '12:00'}`;
                                }
                            })()}
                        </p>
                        {data.enableLateBypass && (
                            <div className="flex justify-between items-center px-2.5 py-1 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-950/20 rounded-xl border border-gray-100/50 dark:border-gray-800/30">
                                <span>⏱️ Limite Atraso:</span>
                                <span className="text-red-500 dark:text-red-400 font-black">{data.maxDelayValue || 3} {data.maxDelayUnit === 'minutes' ? 'Minutos' : 'Horas'}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Exibição específica para Condições */}
                {type === 'conditionNode' && (
                    <div className="text-[10px] font-bold text-gray-400 space-y-1">
                        <p>Variável: <span className="text-gray-700 dark:text-gray-300 font-black">{data.variable || 'N/A'}</span></p>
                        <p>Operação: <span className="text-gray-700 dark:text-gray-300 font-black">{data.operator || 'N/A'}</span></p>
                    </div>
                )}

                {/* Pré-visualização de Mídia no Passo */}
                {(type === 'media' || type === 'mediaNode' || type === 'audio' || type === 'audioNode' || data.mediaUrl || data.media_url || data.url) && (
                    (() => {
                        const mediaUrl = data.mediaUrl || data.media_url || data.url;
                        if (!mediaUrl) return null;
                        const isImg = mediaUrl.match(/\.(jpeg|jpg|gif|png|webp)/i);
                        const isVid = mediaUrl.match(/\.(mp4|webm|mov|avi|m4v|3gp)/i) || type === 'video' || type === 'videoNode';
                        const isAud = mediaUrl.match(/\.(mp3|ogg|wav|aac)/i) || type === 'audio' || type === 'audioNode';
                        
                        return (
                            <div className="mt-2 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-950/20 flex flex-col">
                                {isImg ? (
                                    <img src={resolveUrl(mediaUrl)} alt="Mídia" className="object-cover w-full max-h-24 rounded-t-lg" />
                                ) : isVid ? (
                                    <div className="relative w-full max-h-24 rounded-t-lg overflow-hidden bg-black flex items-center justify-center">
                                        <video src={resolveUrl(mediaUrl)} className="w-full h-full max-h-24 object-cover" muted playsInline />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                            <span className="text-[9px] text-white font-black uppercase tracking-wider bg-black/60 px-2 py-0.5 rounded flex items-center gap-1">
                                                🎥 Vídeo
                                            </span>
                                        </div>
                                    </div>
                                ) : isAud ? (
                                    <div className="p-2 text-[10px] text-purple-500 font-black uppercase tracking-wider flex items-center gap-1.5">
                                        🎵 Áudio de Automação
                                    </div>
                                ) : (
                                    <div className="p-2 text-[10px] text-blue-500 font-black uppercase tracking-wider flex items-center gap-1.5">
                                        📁 Arquivo de Mídia
                                    </div>
                                )}
                                {data.caption && (
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 italic px-2 py-1.5 border-t border-gray-100 dark:border-gray-800 leading-snug line-clamp-2">
                                        💬 {data.caption}
                                    </p>
                                )}
                            </div>
                        );
                    })()
                )}

                {/* Estatísticas Agregadas para Envio em Massa */}
                {showCounters && (
                    <div 
                        className="nodrag nopan mt-2 pt-2 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-wider"
                        onMouseDown={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                    >
                        <div 
                            className="flex flex-col items-center flex-1 border-r border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-green-50 dark:hover:bg-green-900/20 py-1.5 rounded-l-xl transition-all group/sent" 
                            onClick={(e) => { e.stopPropagation(); e.preventDefault(); data.onStatClick && data.onStatClick('completed'); }}
                            onMouseDown={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                            title="Ver contatos enviados"
                        >
                            <span className="text-green-500 text-sm font-black group-hover/sent:scale-110 transition-transform">{stats.sent || 0}</span>
                            <span className="text-green-600/70 dark:text-green-500/70">Aprovados</span>
                        </div>
                        <div 
                            className="flex flex-col items-center flex-1 border-r border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-orange-50 dark:hover:bg-orange-900/20 py-1.5 transition-all group/queue" 
                            onClick={(e) => { e.stopPropagation(); e.preventDefault(); data.onStatClick && data.onStatClick('waiting'); }}
                            onMouseDown={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                            title="Ver contatos na fila"
                        >
                            <span className="text-orange-500 text-sm font-black group-hover/queue:scale-110 transition-transform">{stats.waiting || 0}</span>
                            <span className="text-orange-600/70 dark:text-orange-500/70">Fila</span>
                        </div>
                        <div 
                            className="flex flex-col items-center flex-1 border-r border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20 py-1.5 transition-all group/fail" 
                            onClick={(e) => { e.stopPropagation(); e.preventDefault(); data.onStatClick && data.onStatClick('failed'); }}
                            onMouseDown={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                            title="Ver contatos com falhas"
                        >
                            <span className="text-red-500 text-sm font-black group-hover/fail:scale-110 transition-transform">{stats.failed || 0}</span>
                            <span className="text-red-600/70 dark:text-red-500/70">Falhas</span>
                        </div>
                        <div 
                            className="flex flex-col items-center flex-1 cursor-pointer hover:bg-gray-55 dark:hover:bg-gray-800 py-1.5 rounded-r-xl transition-all group/cancel" 
                            onClick={(e) => { e.stopPropagation(); e.preventDefault(); data.onStatClick && data.onStatClick('cancelled'); }}
                            onMouseDown={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                            title="Ver contatos parados"
                        >
                            <span className="text-gray-450 dark:text-gray-400 text-sm font-black group-hover/cancel:scale-110 transition-transform">{stats.cancelled || 0}</span>
                            <span className="text-gray-500/75 dark:text-gray-400/75">Parados</span>
                        </div>
                    </div>
                )}


                {/* Indicador de Contato Ativo (Sem Blink) */}
                {data.isActive && (
                    <div className="mt-2 flex items-center justify-center gap-2 py-1 px-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-500 text-[10px] font-black uppercase tracking-wider">
                        <FiUser size={12} />
                        <span>Contato ativo aqui</span>
                        <span className="relative flex h-2 w-2">
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </span>
                    </div>
                )}
            </div>

            {/* Source handle para conexões de saída */}
            {((type === 'dateNode' || type === 'date') && data.enableLateBypass) ? (
                <>
                    <Handle 
                        type="source" 
                        position={Position.Bottom} 
                        id="default"
                        className="w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900" 
                        style={{ bottom: -6, left: '30%' }}
                        title="No Horário"
                    />
                    <Handle 
                        type="source" 
                        position={Position.Bottom} 
                        id="late"
                        className="w-3 h-3 bg-red-500 border-2 border-white dark:border-gray-900" 
                        style={{ bottom: -6, left: '70%' }}
                        title="Atrasado"
                    />
                </>
            ) : (
                <Handle 
                    type="source" 
                    position={Position.Bottom} 
                    className="w-3 h-3 bg-blue-500 border-2 border-white dark:border-gray-900" 
                    style={{ bottom: -6 }}
                />
            )}
        </div>
    );
};

export default PipelineNode;
