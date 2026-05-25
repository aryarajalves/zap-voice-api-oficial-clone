import React from 'react';
import { Handle, Position } from 'reactflow';
import { 
    FiMessageSquare, FiMusic, FiImage, FiClock, FiGitMerge, 
    FiZap, FiLayers, FiAlertCircle, FiCheck, FiPlay, FiUser 
} from 'react-icons/fi';

const getNodeConfig = (type, data) => {
    switch (type) {
        case 'messageNode':
        case 'message':
            return {
                icon: FiMessageSquare,
                color: 'text-blue-500',
                bgColor: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200/50 dark:border-blue-800/30',
                title: 'Mensagem de Texto'
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
                borderClass: 'border-green-500 dark:border-green-600 ring-2 ring-green-500/20 shadow-lg shadow-green-500/10',
                badgeBg: 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400 border-green-200 dark:border-green-800/30',
                badgeText: 'Concluído',
                icon: FiCheck
            };
        case 'processing':
        case 'started':
            return {
                borderClass: 'border-blue-500 dark:border-blue-600 ring-2 ring-blue-500/40 shadow-lg shadow-blue-500/30 animate-pulse',
                badgeBg: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border-blue-200 dark:border-blue-800/30 animate-pulse',
                badgeText: 'Enviando',
                icon: FiPlay
            };
        case 'waiting':
        case 'suspended':
            return {
                borderClass: 'border-orange-500 dark:border-orange-600 ring-2 ring-orange-500/40 shadow-lg shadow-orange-500/30 animate-pulse',
                badgeBg: 'bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400 border-orange-200 dark:border-orange-800/30',
                badgeText: status === 'waiting' ? 'Aguardando' : 'Suspenso',
                icon: FiClock
            };
        case 'failed':
            return {
                borderClass: 'border-red-500 dark:border-red-600 ring-2 ring-red-500/20 shadow-lg shadow-red-500/10',
                badgeBg: 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400 border-red-200 dark:border-red-800/30',
                badgeText: 'Falhou',
                icon: FiAlertCircle
            };
        default:
            return {
                borderClass: 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700',
                badgeBg: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 border-gray-200/50 dark:border-gray-700/50',
                badgeText: 'Pendente',
                icon: null
            };
    }
};

const PipelineNode = ({ id, data }) => {
    const type = data.type || 'message';
    const config = getNodeConfig(type, data);
    const status = data.status || 'pending';
    const statusStyles = getStatusStyles(status);
    const IconComponent = config.icon;
    const StatusIcon = statusStyles.icon;
    
    // Contadores para disparos em massa
    const showCounters = data.bulkStats && typeof data.bulkStats === 'object';
    const stats = data.bulkStats || {};

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
            <div className="p-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
                <div className={`p-1.5 rounded-lg border ${config.bgColor} flex items-center justify-center shrink-0`}>
                    <IconComponent className={config.color} size={16} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none mb-0.5">
                        {config.title}
                    </p>
                    <p className="text-xs font-black text-gray-800 dark:text-white truncate">
                        {data.label || data.name || 'Passo'}
                    </p>
                </div>
                
                {/* Badge de Status */}
                <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border shrink-0 flex items-center gap-1 ${statusStyles.badgeBg}`}>
                    {StatusIcon && <StatusIcon size={8} />}
                    {statusStyles.badgeText}
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

                {/* Exibição específica para Condições */}
                {type === 'conditionNode' && (
                    <div className="text-[10px] font-bold text-gray-400 space-y-1">
                        <p>Variável: <span className="text-gray-700 dark:text-gray-300 font-black">{data.variable || 'N/A'}</span></p>
                        <p>Operação: <span className="text-gray-700 dark:text-gray-300 font-black">{data.operator || 'N/A'}</span></p>
                    </div>
                )}

                {/* Estatísticas Agregadas para Envio em Massa */}
                {showCounters && (
                    <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-wider">
                        <div className="flex flex-col items-center flex-1 border-r border-gray-100 dark:border-gray-800">
                            <span className="text-green-500 text-xs font-black">{stats.sent || 0}</span>
                            <span>Enviados</span>
                        </div>
                        <div className="flex flex-col items-center flex-1 border-r border-gray-100 dark:border-gray-800">
                            <span className="text-orange-500 text-xs font-black">{stats.waiting || 0}</span>
                            <span>Fila</span>
                        </div>
                        <div className="flex flex-col items-center flex-1">
                            <span className="text-red-500 text-xs font-black">{stats.failed || 0}</span>
                            <span>Falhas</span>
                        </div>
                    </div>
                )}

                {/* Indicador de Contato Ativo (Pulse neon) */}
                {data.isActive && (
                    <div className="mt-2 flex items-center justify-center gap-2 py-1 px-3 bg-blue-500/10 border border-blue-500/20 rounded-xl animate-pulse text-blue-500 text-[10px] font-black uppercase tracking-wider">
                        <FiUser size={12} className="animate-bounce" />
                        <span>Contato ativo aqui</span>
                        <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </span>
                    </div>
                )}
            </div>

            {/* Source handle para conexões de saída */}
            <Handle 
                type="source" 
                position={Position.Bottom} 
                className="w-3 h-3 bg-blue-500 border-2 border-white dark:border-gray-900" 
                style={{ bottom: -6 }}
            />
        </div>
    );
};

export default PipelineNode;
