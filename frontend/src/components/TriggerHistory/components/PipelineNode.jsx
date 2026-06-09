import React from 'react';
import { Handle, Position } from 'reactflow';
import { 
    FiMessageSquare, FiMic, FiImage, FiClock, FiCpu, 
    FiShuffle, FiTag, FiCalendar, FiGlobe, FiUser,
    FiFileText, FiLink, FiGift, FiTarget, FiSliders,
    FiZap, FiActivity, FiDatabase, FiLayers
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
                icon: FiMic,
                color: 'text-purple-500',
                bgColor: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200/50 dark:border-purple-800/30',
                title: 'Áudio / Voz'
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
                icon: FiCpu,
                color: 'text-rose-500',
                bgColor: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200/50 dark:border-rose-800/30',
                title: 'Condição Inteligente'
            };
        case 'randomizerNode':
        case 'randomizer':
            return {
                icon: FiShuffle,
                color: 'text-amber-500',
                bgColor: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200/50 dark:border-amber-800/30',
                title: 'Roteamento Dinâmico'
            };
        case 'chatwoot_label':
        case 'labelNode':
            return {
                icon: FiTag,
                color: 'text-emerald-500',
                bgColor: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/50 dark:border-emerald-800/30',
                title: 'Etiquetar Chatwoot'
            };
        case 'dateNode':
        case 'date':
            return {
                icon: FiCalendar,
                color: 'text-violet-500',
                bgColor: 'bg-violet-50 dark:bg-violet-950/30 border-violet-200/50 dark:border-violet-800/30',
                title: 'Agendamento Data'
            };
        case 'businessHoursNode':
        case 'business_hours':
            return {
                icon: FiClock,
                color: 'text-indigo-500',
                bgColor: 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200/50 dark:border-indigo-800/30',
                title: 'Horário Comercial'
            };
        case 'httpRequestNode':
        case 'http_request':
            return {
                icon: FiGlobe,
                color: 'text-emerald-500',
                bgColor: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/50 dark:border-emerald-800/30',
                title: 'Requisição HTTP'
            };
        case 'updateContactNode':
        case 'update_contact':
            return {
                icon: FiUser,
                color: 'text-orange-500',
                bgColor: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200/50 dark:border-orange-800/30',
                title: 'Atualizar Contato'
            };
        case 'templateNode':
        case 'template':
            return {
                icon: FiFileText,
                color: 'text-cyan-500',
                bgColor: 'bg-cyan-50 dark:bg-cyan-950/30 border-cyan-200/50 dark:border-cyan-800/30',
                title: 'Template WhatsApp'
            };
        case 'sendTemplateNode':
        case 'send_template':
            return {
                icon: FiFileText,
                color: 'text-cyan-600',
                bgColor: 'bg-cyan-50 dark:bg-cyan-950/30 border-cyan-200/50 dark:border-cyan-800/30',
                title: 'Disparo de Template'
            };
        case 'linkFunnelNode':
        case 'link_funnel':
            return {
                icon: FiLink,
                color: 'text-teal-500',
                bgColor: 'bg-teal-50 dark:bg-teal-950/30 border-teal-200/50 dark:border-teal-800/30',
                title: 'Conectar Funil'
            };
        case 'rouletteNode':
        case 'roulette':
            return {
                icon: FiGift,
                color: 'text-pink-500',
                bgColor: 'bg-pink-50 dark:bg-pink-950/30 border-pink-200/50 dark:border-pink-800/30',
                title: 'Roleta / Sorteio'
            };
        case 'localSegmentNode':
        case 'local_segment':
            return {
                icon: FiTag,
                color: 'text-rose-600',
                bgColor: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200/50 dark:border-rose-800/30',
                title: 'Segmentação Local'
            };
        case 'pixelNode':
        case 'pixel':
            return {
                icon: FiTarget,
                color: 'text-red-500',
                bgColor: 'bg-red-50 dark:bg-red-950/30 border-red-200/50 dark:border-red-800/30',
                title: 'Disparar Pixel'
            };
        case 'crmActionsNode':
        case 'crm_actions':
            return {
                icon: FiSliders,
                color: 'text-sky-500',
                bgColor: 'bg-sky-50 dark:bg-sky-950/30 border-sky-200/50 dark:border-sky-800/30',
                title: 'Ações de CRM'
            };
        case 'hotLeadsNode':
        case 'hot_leads':
            return {
                icon: FiZap,
                color: 'text-yellow-500',
                bgColor: 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200/50 dark:border-yellow-800/30',
                title: 'Leads Quentes'
            };
        case 'checkWindowNode':
        case 'check_window':
            return {
                icon: FiClock,
                color: 'text-indigo-600',
                bgColor: 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200/50 dark:border-indigo-800/30',
                title: 'Verificar Janela 24h'
            };
        case 'waitEventNode':
        case 'wait_event':
            return {
                icon: FiActivity,
                color: 'text-amber-600',
                bgColor: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200/50 dark:border-amber-800/30',
                title: 'Aguardar Ação'
            };
        case 'inputDataNode':
        case 'input_data':
        case 'await_response':
            return {
                icon: FiDatabase,
                color: 'text-rose-500',
                bgColor: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200/50 dark:border-rose-800/30',
                title: 'Entrada de Dados'
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
        } else if (type === 'httpRequestNode' || type === 'http_request') {
            displayName = 'Requisição HTTP';
        } else if (type === 'businessHoursNode' || type === 'business_hours') {
            displayName = 'Horário Comercial';
        } else if (type === 'updateContactNode' || type === 'update_contact') {
            displayName = 'Atualizar Contato';
        } else if (type === 'templateNode' || type === 'template') {
            displayName = 'Template WhatsApp';
        } else if (type === 'sendTemplateNode' || type === 'send_template') {
            displayName = 'Disparo de Template';
        } else if (type === 'linkFunnelNode' || type === 'link_funnel') {
            displayName = 'Conectar Funil';
        } else if (type === 'rouletteNode' || type === 'roulette') {
            displayName = 'Roleta / Sorteio';
        } else if (type === 'localSegmentNode' || type === 'local_segment') {
            displayName = 'Segmentação Local';
        } else if (type === 'pixelNode' || type === 'pixel') {
            displayName = 'Disparar Pixel';
        } else if (type === 'crmActionsNode' || type === 'crm_actions') {
            displayName = 'Ações de CRM';
        } else if (type === 'hotLeadsNode' || type === 'hot_leads') {
            displayName = 'Leads Quentes';
        } else if (type === 'checkWindowNode' || type === 'check_window') {
            displayName = 'Verificar Janela 24h';
        } else if (type === 'waitEventNode' || type === 'wait_event') {
            displayName = 'Aguardar Ação';
        } else if (type === 'inputDataNode' || type === 'input_data' || type === 'await_response') {
            displayName = 'Entrada de Dados';
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
                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none mb-0.5 flex items-center gap-1.5">
                        {config.title}
                        {(data.isStart || type === 'start') && (
                            <span className="px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400 text-[8px] font-black tracking-wider border border-green-200 dark:border-green-800/40">
                                🏁 INÍCIO
                            </span>
                        )}
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

                {/* Exibição específica para Horário Comercial */}
                {(type === 'businessHoursNode' || type === 'business_hours') && (
                    <div className="space-y-1.5 w-full">
                        <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 bg-indigo-50/50 dark:bg-indigo-950/10 p-2 rounded-xl border border-indigo-100/30 dark:border-indigo-800/20 w-full justify-center">
                            ⏰ Validação de Horário Comercial
                        </p>
                        {data.waitUntilOpen && (
                            <div className="flex justify-between items-center px-2.5 py-1 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-950/20 rounded-xl border border-gray-100/50 dark:border-gray-800/30">
                                <span>Ação se Fechado:</span>
                                <span className="text-indigo-550 dark:text-indigo-400 font-black">Aguardar Aberto</span>
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

                {/* Exibição específica para Requisição HTTP */}
                {(type === 'httpRequestNode' || type === 'http_request') && (() => {
                    const displayUrl = data.resolvedUrl || data.url;
                    let displayPayload = data.resolvedPayload || data.payload;
                    if (!displayPayload && data.payloadFields && Array.isArray(data.payloadFields)) {
                        const obj = {};
                        data.payloadFields.forEach(f => {
                            if (f.key) obj[f.key] = f.value;
                        });
                        if (Object.keys(obj).length > 0) {
                            displayPayload = JSON.stringify(obj, null, 2);
                        }
                    }

                    return (
                        <div className="space-y-1 text-[10px] font-bold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-950/20 p-2 rounded-xl border border-gray-100/50 dark:border-gray-800/30">
                            <p>Método: <span className="text-emerald-600 dark:text-emerald-400 font-black">{data.method || 'POST'}</span></p>
                            <p className="truncate">URL: <span className="text-gray-700 dark:text-gray-300 font-medium" title={displayUrl}>{displayUrl || 'Não configurada'}</span></p>
                            {displayPayload && (
                                <div className="mt-1">
                                    <p className="mb-0.5">{data.resolvedPayload ? 'Payload Enviado:' : 'Payload:'}</p>
                                    <pre className="text-[9px] bg-white dark:bg-gray-900 p-1.5 rounded border border-gray-100 dark:border-gray-800 overflow-x-auto max-h-16 font-mono text-gray-600 dark:text-gray-400 leading-normal custom-scrollbar">
                                        {displayPayload}
                                    </pre>
                                </div>
                            )}
                        </div>
                    );
                })()}

                {/* Exibição específica para Entrada de Dados */}
                {(type === 'inputDataNode' || type === 'input_data' || type === 'await_response') && (
                    <div className="space-y-1 text-[10px] font-bold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-950/20 p-2 rounded-xl border border-gray-100/50 dark:border-gray-800/30">
                        <p>Variável: <span className="text-rose-600 dark:text-rose-400 font-mono font-black">{data.varName || 'Não definida'}</span></p>
                        <p>Método: <span className="text-gray-700 dark:text-gray-300 font-black">{data.collectionType === 'ai' ? '🧠 Inteligente (IA)' : '📋 Tradicional (Regex)'}</span></p>
                    </div>
                )}

                {/* Último Status da Execução (Log) */}
                {data.latestLogMessage && (
                    <div className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 p-2 rounded-xl border border-blue-500/20 leading-relaxed font-semibold">
                        ℹ️ {data.latestLogMessage}
                    </div>
                )}

                {/* Pré-visualização de Mídia no Passo */}
                {type !== 'httpRequestNode' && type !== 'http_request' && (type === 'media' || type === 'mediaNode' || type === 'audio' || type === 'audioNode' || data.mediaUrl || data.media_url || data.url) && (
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
                        className="nodrag nopan mt-2 pt-2 border-t border-gray-100 dark:border-gray-800 grid grid-cols-3 gap-1.5 text-[9px] font-black text-gray-400 uppercase tracking-wider text-center"
                        onMouseDown={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                    >
                        <div 
                            className="flex flex-col items-center cursor-pointer hover:bg-green-50 dark:hover:bg-green-900/20 py-1 rounded-xl transition-all border border-gray-100 dark:border-gray-800 group/sent" 
                            onClick={(e) => { e.stopPropagation(); e.preventDefault(); data.onStatClick && data.onStatClick('completed'); }}
                            onMouseDown={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                            title="Ver contatos enviados"
                        >
                            <span className="text-green-500 text-xs font-black group-hover/sent:scale-110 transition-transform">{stats.sent || 0}</span>
                            <span className="text-[8px] text-green-600/70 dark:text-green-500/70">Aprovados</span>
                        </div>
                        <div 
                            className="flex flex-col items-center cursor-pointer hover:bg-orange-50 dark:hover:bg-orange-900/20 py-1 transition-all border border-gray-100 dark:border-gray-800 group/queue" 
                            onClick={(e) => { e.stopPropagation(); e.preventDefault(); data.onStatClick && data.onStatClick('waiting'); }}
                            onMouseDown={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                            title="Ver contatos na fila"
                        >
                            <span className="text-orange-500 text-xs font-black group-hover/queue:scale-110 transition-transform">{stats.waiting || 0}</span>
                            <span className="text-[8px] text-orange-600/70 dark:text-orange-500/70">Fila</span>
                        </div>
                        <div 
                            className="flex flex-col items-center cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-900/20 py-1 transition-all border border-gray-100 dark:border-gray-800 group/suspended" 
                            onClick={(e) => { e.stopPropagation(); e.preventDefault(); data.onStatClick && data.onStatClick('suspended'); }}
                            onMouseDown={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                            title="Ver contatos aguardando"
                        >
                            <span className="text-amber-500 text-xs font-black group-hover/suspended:scale-110 transition-transform">{stats.suspended || 0}</span>
                            <span className="text-[8px] text-amber-600/70 dark:text-amber-500/70">Aguardando</span>
                        </div>
                        <div 
                            className="flex flex-col items-center cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20 py-1 transition-all border border-gray-100 dark:border-gray-800 group/fail col-span-1" 
                            onClick={(e) => { e.stopPropagation(); e.preventDefault(); data.onStatClick && data.onStatClick('failed'); }}
                            onMouseDown={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                            title="Ver contatos com falhas"
                        >
                            <span className="text-red-500 text-xs font-black group-hover/fail:scale-110 transition-transform">{stats.failed || 0}</span>
                            <span className="text-[8px] text-red-600/70 dark:text-red-500/70">Falhas</span>
                        </div>
                        <div 
                            className="flex flex-col items-center cursor-pointer hover:bg-gray-55 dark:hover:bg-gray-800 py-1 transition-all border border-gray-100 dark:border-gray-800 group/cancel col-span-2" 
                            onClick={(e) => { e.stopPropagation(); e.preventDefault(); data.onStatClick && data.onStatClick('cancelled'); }}
                            onMouseDown={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                            title="Ver contatos parados"
                        >
                            <span className="text-gray-450 dark:text-gray-400 text-xs font-black group-hover/cancel:scale-110 transition-transform">{stats.cancelled || 0}</span>
                            <span className="text-[8px] text-gray-500/75 dark:text-gray-400/75">Parados</span>
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
            ) : type === 'businessHoursNode' || type === 'business_hours' ? (
                <>
                    <Handle 
                        type="source" 
                        position={Position.Bottom} 
                        id="aberto"
                        className="w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900" 
                        style={{ bottom: -6, left: '30%' }}
                        title="Aberto"
                    />
                    <Handle 
                        type="source" 
                        position={Position.Bottom} 
                        id="fechado"
                        className="w-3 h-3 bg-red-500 border-2 border-white dark:border-gray-900" 
                        style={{ bottom: -6, left: '70%' }}
                        title="Fechado"
                    />
                </>
            ) : type === 'httpRequestNode' || type === 'http_request' ? (
                <>
                    <Handle 
                        type="source" 
                        position={Position.Bottom} 
                        id="success"
                        className="w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900" 
                        style={{ bottom: -6, left: '30%' }}
                        title="Sucesso"
                    />
                    <Handle 
                        type="source" 
                        position={Position.Bottom} 
                        id="fail"
                        className="w-3 h-3 bg-red-500 border-2 border-white dark:border-gray-900" 
                        style={{ bottom: -6, left: '70%' }}
                        title="Falha"
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
