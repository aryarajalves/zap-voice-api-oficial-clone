import React from 'react';
import { Handle, Position } from 'reactflow';
import { FiUser } from 'react-icons/fi';
import { getNodeConfig, getStatusStyles, resolveUrl, getDisplayName } from './pipelineNodeUtils';

const PipelineNode = ({ id, data }) => {
    const type = data.type || 'message';
    const config = getNodeConfig(type, data);
    const status = data.status || 'pending';
    const statusStyles = getStatusStyles(status);
    const IconComponent = config.icon;
    
    // Contadores para disparos em massa
    const showCounters = data.bulkStats && typeof data.bulkStats === 'object';
    const stats = data.bulkStats || {};

    const displayName = getDisplayName(type, data);

    return (
        <div className={`w-64 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-2xl border transition-all duration-300 ${statusStyles.borderClass}`}>
            
            {/* Target handle para conexão de entrada (Horizontal - Esquerda) */}
            <Handle 
                type="target" 
                position={Position.Left} 
                className="w-3 h-3 bg-blue-500 border-2 border-white dark:border-gray-900" 
                style={{ left: -6 }}
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
                        &quot;{data.content}&quot;
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
                                if (mode === 'date') return `Agendado: ${data.dateValue || 'Não configurada'}`;
                                if (mode === 'time') return `Horário: ${data.timeValue || '12:00'}`;
                                return `${data.dateValue || 'Sem data'} às ${data.timeValue || '12:00'}`;
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
                {(type === 'conditionNode' || type === 'condition') && (() => {
                    const conditionType = data.conditionType || 'text';
                    const tags = Array.isArray(data.tags) ? data.tags : (data.tag ? [data.tag] : []);
                    const tagOperator = data.tagOperator || 'any';

                    return (
                        <div className="space-y-2 text-xs bg-gray-50 dark:bg-gray-950/30 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800">
                            {/* Header interno de Validação */}
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                    Validação
                                </span>
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800/40">
                                    {conditionType === 'tag' ? '🏷️ Etiquetas' :
                                     conditionType === 'text' ? '💬 Busca por Texto' :
                                     conditionType === 'ai_question' ? '🧠 Análise IA' :
                                     conditionType === 'datetime_range' ? '🕒 Período Data/Hora' :
                                     conditionType === 'weekday' ? '📅 Dias da Semana' : 'Condição'}
                                </span>
                            </div>

                            {/* Validação por Etiquetas */}
                            {conditionType === 'tag' && (
                                <div className="space-y-1.5">
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {tags.length > 0 ? (
                                            tags.map((t, idx) => (
                                                <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-bold border border-blue-200 dark:border-blue-800/50">
                                                    <span>🏷️</span> {t}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-[10px] text-gray-400 italic">Nenhuma etiqueta configurada</span>
                                        )}
                                    </div>
                                    <div className="text-[9px] font-bold text-gray-500 dark:text-gray-400 flex items-center justify-between pt-1 border-t border-gray-200/50 dark:border-gray-800/50">
                                        <span>Critério:</span>
                                        <span className="text-purple-600 dark:text-purple-400 uppercase font-black">
                                            {tagOperator === 'all' ? 'Possui Todas (E)' : 'Possui Qualquer Uma (OU)'}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Validação por Texto */}
                            {conditionType === 'text' && (
                                <div className="space-y-1">
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                                        Buscar termo: <strong className="text-gray-800 dark:text-gray-200 font-bold">&quot;{data.condition || ''}&quot;</strong>
                                    </p>
                                </div>
                            )}

                            {/* Validação por Pergunta IA */}
                            {conditionType === 'ai_question' && (
                                <div className="space-y-1">
                                    <p className="text-[10px] text-gray-600 dark:text-gray-300 font-semibold line-clamp-2">
                                        ❓ {data.aiQuestion || 'Pergunta não configurada'}
                                    </p>
                                    {data.aiInstructions && (
                                        <p className="text-[9px] text-gray-400 italic line-clamp-2">
                                            Critério: &quot;{data.aiInstructions}&quot;
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Validação por Período */}
                            {conditionType === 'datetime_range' && (
                                <div className="space-y-1 text-[10px]">
                                    <p className="text-gray-600 dark:text-gray-300 font-semibold">
                                        Início: <span className="font-mono text-gray-800 dark:text-gray-100">{data.startDateTime || 'N/A'}</span>
                                    </p>
                                    <p className="text-gray-600 dark:text-gray-300 font-semibold">
                                        Fim: <span className="font-mono text-gray-800 dark:text-gray-100">{data.endDateTime || 'N/A'}</span>
                                    </p>
                                </div>
                            )}

                            {/* Validação por Dias da Semana */}
                            {conditionType === 'weekday' && (
                                <div className="space-y-1">
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold">
                                        Dias: <span className="text-gray-800 dark:text-gray-200 font-bold">{Array.isArray(data.allowedDays) ? data.allowedDays.join(', ') : 'Todos'}</span>
                                    </p>
                                </div>
                            )}
                        </div>
                    );
                })()}

                {/* Exibição específica para Requisição HTTP */}
                {(type === 'httpRequestNode' || type === 'http_request') && (() => {
                    const displayUrl = data.resolvedUrl || data.url;
                    let displayPayload = data.resolvedPayload || data.payload;
                    if (!displayPayload && data.payloadFields && Array.isArray(data.payloadFields)) {
                        const obj = {};
                        data.payloadFields.forEach(f => { if (f.key) obj[f.key] = f.value; });
                        if (Object.keys(obj).length > 0) displayPayload = JSON.stringify(obj, null, 2);
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
                {type !== 'httpRequestNode' && type !== 'http_request' && (type === 'media' || type === 'mediaNode' || type === 'audio' || type === 'audioNode' || data.mediaUrl || data.media_url || data.url) && (() => {
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
                                        <span className="text-[9px] text-white font-black uppercase tracking-wider bg-black/60 px-2 py-0.5 rounded flex items-center gap-1">🎥 Vídeo</span>
                                    </div>
                                </div>
                            ) : isAud ? (
                                <div className="p-2 text-[10px] text-purple-500 font-black uppercase tracking-wider flex items-center gap-1.5">🎵 Áudio de Automação</div>
                            ) : (
                                <div className="p-2 text-[10px] text-blue-500 font-black uppercase tracking-wider flex items-center gap-1.5">📁 Arquivo de Mídia</div>
                            )}
                            {data.caption && (
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 italic px-2 py-1.5 border-t border-gray-100 dark:border-gray-800 leading-snug line-clamp-2">
                                    💬 {data.caption}
                                </p>
                            )}
                        </div>
                    );
                })()}

                {/* Estatísticas Agregadas para Envio em Massa */}
                {showCounters && (
                    <div 
                        className="nodrag nopan mt-2 pt-2 border-t border-gray-100 dark:border-gray-800 grid grid-cols-3 gap-1.5 text-[9px] font-black text-gray-400 uppercase tracking-wider text-center"
                        onMouseDown={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                    >
                        {[
                            { key: 'completed', label: 'Aprovados', value: stats.sent || 0, color: 'text-green-500', subColor: 'text-green-600/70 dark:text-green-500/70', hover: 'hover:bg-green-50 dark:hover:bg-green-900/20', title: 'Ver contatos enviados', colSpan: '' },
                            { key: 'waiting', label: 'Fila', value: stats.waiting || 0, color: 'text-orange-500', subColor: 'text-orange-600/70 dark:text-orange-500/70', hover: 'hover:bg-orange-50 dark:hover:bg-orange-900/20', title: 'Ver contatos na fila', colSpan: '' },
                            { key: 'suspended', label: 'Aguardando', value: stats.suspended || 0, color: 'text-amber-500', subColor: 'text-amber-600/70 dark:text-amber-500/70', hover: 'hover:bg-amber-50 dark:hover:bg-amber-900/20', title: 'Ver contatos aguardando', colSpan: '' },
                            { key: 'failed', label: 'Falhas', value: stats.failed || 0, color: 'text-red-500', subColor: 'text-red-600/70 dark:text-red-500/70', hover: 'hover:bg-red-50 dark:hover:bg-red-900/20', title: 'Ver contatos com falhas', colSpan: 'col-span-1' },
                            { key: 'cancelled', label: 'Parados', value: stats.cancelled || 0, color: 'text-gray-450 dark:text-gray-400', subColor: 'text-gray-500/75 dark:text-gray-400/75', hover: 'hover:bg-gray-55 dark:hover:bg-gray-800', title: 'Ver contatos parados', colSpan: 'col-span-2' },
                        ].map(({ key, label, value, color, subColor, hover, title, colSpan }) => (
                            <div
                                key={key}
                                className={`flex flex-col items-center cursor-pointer ${hover} py-1 rounded-xl transition-all border border-gray-100 dark:border-gray-800 group/${key} ${colSpan}`}
                                onClick={(e) => { e.stopPropagation(); e.preventDefault(); data.onStatClick && data.onStatClick(key); }}
                                onMouseDown={(e) => e.stopPropagation()}
                                onPointerDown={(e) => e.stopPropagation()}
                                title={title}
                            >
                                <span className={`${color} text-xs font-black group-hover/${key}:scale-110 transition-transform`}>{value}</span>
                                <span className={`text-[8px] ${subColor}`}>{label}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Indicador de Contato Ativo */}
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

            {/* Source handles para conexões de saída (Horizontal - Direita) */}
            {((type === 'dateNode' || type === 'date') && data.enableLateBypass) ? (
                <>
                    <Handle type="source" position={Position.Right} id="default" className="w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900" style={{ right: -6, top: '35%' }} title="No Horário" />
                    <Handle type="source" position={Position.Right} id="late" className="w-3 h-3 bg-red-500 border-2 border-white dark:border-gray-900" style={{ right: -6, top: '65%' }} title="Atrasado" />
                </>
            ) : type === 'businessHoursNode' || type === 'business_hours' ? (
                <>
                    <Handle type="source" position={Position.Right} id="aberto" className="w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900" style={{ right: -6, top: '35%' }} title="Aberto" />
                    <Handle type="source" position={Position.Right} id="fechado" className="w-3 h-3 bg-red-500 border-2 border-white dark:border-gray-900" style={{ right: -6, top: '65%' }} title="Fechado" />
                </>
            ) : type === 'httpRequestNode' || type === 'http_request' ? (
                <>
                    <Handle type="source" position={Position.Right} id="success" className="w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900" style={{ right: -6, top: '35%' }} title="Sucesso" />
                    <Handle type="source" position={Position.Right} id="fail" className="w-3 h-3 bg-red-500 border-2 border-white dark:border-gray-900" style={{ right: -6, top: '65%' }} title="Falha" />
                </>
            ) : type === 'conditionNode' || type === 'condition' ? (
                data.conditionType === 'datetime_range' ? (
                    <>
                        <Handle type="source" position={Position.Right} id="before" className="w-3 h-3 bg-blue-500 border-2 border-white dark:border-gray-900" style={{ right: -6, top: '25%' }} title="Antes" />
                        <Handle type="source" position={Position.Right} id="between" className="w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900" style={{ right: -6, top: '50%' }} title="Durante" />
                        <Handle type="source" position={Position.Right} id="after" className="w-3 h-3 bg-red-500 border-2 border-white dark:border-gray-900" style={{ right: -6, top: '75%' }} title="Depois" />
                        <Handle type="source" position={Position.Right} id="default" className="w-3 h-3 bg-gray-400 border-2 border-white dark:border-gray-900" style={{ display: 'none' }} />
                    </>
                ) : (
                    <>
                        <Handle type="source" position={Position.Right} id="yes" className="w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900" style={{ right: -6, top: '35%' }} title="Sim / Válido" />
                        <Handle type="source" position={Position.Right} id="no" className="w-3 h-3 bg-red-500 border-2 border-white dark:border-gray-900" style={{ right: -6, top: '65%' }} title="Não / Inválido" />
                        {data.conditionType === 'ai_question' && (
                            <Handle type="source" position={Position.Right} id="error" className="w-3 h-3 bg-orange-500 border-2 border-white dark:border-gray-900" style={{ right: -6, top: '85%' }} title="Erro / Falha" />
                        )}
                        <Handle type="source" position={Position.Right} id="default" className="w-3 h-3 bg-gray-400 border-2 border-white dark:border-gray-900" style={{ display: 'none' }} />
                    </>
                )
            ) : (
                <>
                    <Handle type="source" position={Position.Right} id="default" className="w-3 h-3 bg-blue-500 border-2 border-white dark:border-gray-900" style={{ right: -6 }} />
                    {Array.isArray(data.buttons) && data.buttons.map((_, btnIdx) => (
                        <Handle
                            key={btnIdx}
                            type="source"
                            position={Position.Right}
                            id={`button_${btnIdx}`}
                            className="w-3 h-3 bg-blue-600 border-2 border-white dark:border-gray-900"
                            style={{ right: -6, top: `${45 + (btnIdx + 1) * 15}%` }}
                            title={`Botão ${btnIdx + 1}`}
                        />
                    ))}
                </>
            )}
        </div>
    );
};

export default PipelineNode;
