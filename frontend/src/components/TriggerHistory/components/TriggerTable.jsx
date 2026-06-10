import React from 'react';
import { FiNavigation, FiMousePointer } from 'react-icons/fi';

const translateError = (msg) => {
  if (!msg) return "";
  let text = String(msg);
  
  const translations = [
    { regex: /No mapping found for event:/gi, replacement: "Nenhum mapeamento encontrado para o evento:" },
    { regex: /Parameter value is not valid/gi, replacement: "O valor do parâmetro é inválido (ex: número de telefone incompleto/incorreto)" },
    { regex: /Template name does not exist/gi, replacement: "O nome do template não existe" },
    { regex: /Invalid parameter/gi, replacement: "Parâmetro inválido" },
    { regex: /Phone field not found in payload/gi, replacement: "Campo de telefone não encontrado no payload" },
    { regex: /Configuração do WhatsApp ausente/gi, replacement: "Configuração do WhatsApp ausente" },
    { regex: /Duplicidade evitada/gi, replacement: "Duplicidade evitada" }
  ];

  for (const item of translations) {
    text = text.replace(item.regex, item.replacement);
  }
  return text;
};

const formatDate = (dateString) => {
    if (!dateString) return '-';
    let date = new Date(dateString);
    if (!dateString.endsWith('Z') && !dateString.includes('+') && dateString.slice(19).indexOf('-') === -1) {
        date = new Date(dateString + 'Z');
    }
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit', month: '2-digit', year: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }).format(date);
};

const CountdownBadge = ({ untilTime, reason, onZero }) => {
    const calculateSeconds = () => {
        if (!untilTime) return 0;
        const diff = new Date(untilTime).getTime() - new Date().getTime();
        return Math.max(0, Math.ceil(diff / 1000));
    };

    const [secondsLeft, setSecondsLeft] = React.useState(calculateSeconds);

    React.useEffect(() => {
        const leftNow = calculateSeconds();
        setSecondsLeft(leftNow);
        if (leftNow <= 0 && onZero) {
            onZero();
        }
    }, [untilTime]);

    React.useEffect(() => {
        const interval = setInterval(() => {
            const left = calculateSeconds();
            setSecondsLeft(left);
            if (left <= 0) {
                clearInterval(interval);
                if (onZero) onZero();
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [untilTime, onZero]);

    if (secondsLeft <= 0) return null;

    return (
        <div className="flex flex-col items-center gap-1">
            <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-300/30 dark:border-amber-700/30 animate-pulse flex items-center gap-1">
                ⏳ Pausado por {secondsLeft}s
            </span>
            {reason && (
                <span className="text-[9px] text-amber-600 dark:text-amber-500 font-medium max-w-[150px] text-center mt-0.5 leading-tight" title={reason}>
                    Meta Instável
                </span>
            )}
        </div>
    );
};

const DurationTimer = ({ started, finished, triggerWithActions, isFinishedStatus }) => {
    const [elapsed, setElapsed] = React.useState(0);
    
    const calculateElapsed = () => {
        const pausedAt = triggerWithActions.processed_data?.paused_at;
        const pausedDuration = triggerWithActions.processed_data?.paused_duration || 0; // em segundos
        
        if (pausedAt) {
            const diff = new Date(pausedAt).getTime() - new Date(started).getTime();
            return Math.max(0, Math.floor(diff / 1000) - pausedDuration);
        }
        
        if (finished) {
            const diff = new Date(finished).getTime() - new Date(started).getTime();
            return Math.max(0, Math.floor(diff / 1000) - pausedDuration);
        }
        
        const diff = new Date().getTime() - new Date(started).getTime();
        return Math.max(0, Math.floor(diff / 1000) - pausedDuration);
    };
    
    React.useEffect(() => {
        setElapsed(calculateElapsed());
        
        const pausedAt = triggerWithActions.processed_data?.paused_at;
        if (finished || pausedAt || isFinishedStatus) {
            return;
        }
        
        const interval = setInterval(() => {
            setElapsed(calculateElapsed());
        }, 1000);
        
        return () => clearInterval(interval);
    }, [started, finished, triggerWithActions.processed_data?.paused_at, triggerWithActions.processed_data?.paused_duration, isFinishedStatus]);
    
    const formatDuration = (sec) => {
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = sec % 60;
        return [
            h > 0 ? `${h}h` : '',
            m > 0 || h > 0 ? `${m}m` : '',
            `${s}s`
        ].filter(Boolean).join(' ');
    };
    
    return (
        <div className="flex items-center gap-1.5 whitespace-nowrap mt-0.5 text-slate-500 dark:text-slate-400">
            <span className="text-emerald-500 font-bold uppercase tracking-tighter text-[9px]">{isFinishedStatus ? "Duração:" : "Executando:"}</span>
            <span className="font-mono font-bold">{formatDuration(elapsed)}</span>
        </div>
    );
};

const getStatusBadge = (trigger) => {
    const { status, failure_reason, processed_data } = trigger;
    const isTempPaused = processed_data?.temp_paused === true;
    
    // Forçar re-renderização quando o countdown zerar
    const [forceNormal, setForceNormal] = React.useState(false);
    
    // Sincronizar estado forceNormal quando processed_data/temp_paused mudarem
    React.useEffect(() => {
        setForceNormal(false);
    }, [processed_data?.temp_paused, processed_data?.temp_paused_until]);

    if (isTempPaused && !forceNormal) {
        // Se já tiver expirado no momento da renderização
        const untilTime = processed_data?.temp_paused_until;
        const secondsLeft = untilTime ? Math.max(0, Math.ceil((new Date(untilTime).getTime() - new Date().getTime()) / 1000)) : 0;
        if (secondsLeft > 0) {
            return (
                <CountdownBadge 
                    untilTime={untilTime} 
                    reason={processed_data?.temp_paused_reason} 
                    onZero={() => setForceNormal(true)} 
                />
            );
        }
    }

    switch (status) {
        case 'completed':
            return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">Enviado</span>;
        case 'pending':
        case 'queued':
            return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700">Fila</span>;
        case 'processing':
            return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">Enviando...</span>;
        case 'paused':
            return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">Pausado</span>;
        case 'failed':
            return (
                <div className="flex flex-col items-center gap-1">
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">Falha no Envio</span>
                    {failure_reason && <span className="text-[10px] text-red-500 font-medium max-w-[150px] truncate" title={translateError(failure_reason)}>{translateError(failure_reason)}</span>}
                </div>
            );
        case 'aborted':
            return (
                <div className="flex flex-col items-center gap-1">
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400">Abortado</span>
                    {failure_reason && <span className="text-[10px] text-orange-500 font-medium max-w-[150px] truncate" title={translateError(failure_reason)}>{translateError(failure_reason)}</span>}
                </div>
            );
        case 'cancelled':
            return (
                <div className="flex flex-col items-center gap-1">
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-200 text-gray-700">Cancelado</span>
                    {failure_reason && <span className="text-[10px] text-gray-400 font-medium italic max-w-[150px] truncate" title={translateError(failure_reason)}>{translateError(failure_reason)}</span>}
                </div>
            );
        default:
            return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">{status}</span>;
    }
};

const getFollowupConfig = (status, scheduledTime) => {
    const timeStr = scheduledTime 
        ? new Date(scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
        : '';
    switch (status) {
        case 'completed':
            return {
                text: 'Follow-up Disparado',
                className: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-900/20 border border-green-200 dark:border-green-800/30',
                icon: '✅'
            };
        case 'cancelled':
        case 'canceled':
            return {
                text: 'Follow-up Cancelado',
                className: 'text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/30 hover:bg-gray-100 dark:hover:bg-gray-700/20 border border-gray-200 dark:border-gray-700/30',
                icon: '🚫'
            };
        case 'failed':
            return {
                text: 'Follow-up Falhou',
                className: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800/30',
                icon: '⚠️'
            };
        default:
            return {
                text: `Follow-up Ativo (${timeStr})`,
                className: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 hover:bg-orange-100 dark:hover:bg-orange-900/20 border border-orange-200 dark:border-orange-800/30 animate-pulse',
                icon: '⏳'
            };
    }
};

const TriggerTableRow = ({ 
    trigger, selectedIds, handleSelectOne, handleViewContacts, 
    fetchChildren, fetchErrors, handleViewPipeline, handleEditParams, 
    handleStartNow, handleCancel, handleRetry, handleDelete, user,
    onManualInteraction
}) => {
    // Injetar onManualInteraction diretamente no objeto trigger para que os botões internos possam acessá-la.
    const triggerWithActions = { ...trigger, onManualInteraction };
    return (
        <tr className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 transition ${selectedIds.includes(trigger?.id) ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}>
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
                        <span className="font-mono">{formatDate(triggerWithActions.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <span className="text-blue-500 font-bold uppercase tracking-tighter text-[9px]">Disparo:</span>
                        <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">{formatDate(triggerWithActions.scheduled_time)}</span>
                    </div>
                    {(() => {
                        const started = triggerWithActions.processed_data?.started_at || triggerWithActions.scheduled_time || triggerWithActions.created_at;
                        const isFinishedStatus = ['completed', 'failed', 'aborted', 'cancelled'].includes(triggerWithActions.status);
                        const finished = triggerWithActions.processed_data?.finished_at || (isFinishedStatus ? triggerWithActions.updated_at : null);
                        
                        if (!started) return null;
                        
                        return (
                            <DurationTimer 
                                started={started}
                                finished={finished}
                                triggerWithActions={triggerWithActions}
                                isFinishedStatus={isFinishedStatus}
                            />
                        );
                    })()}
                </div>
            </td>
            <td className="p-4 text-sm font-medium text-gray-800 dark:text-gray-200">
                {triggerWithActions.is_bulk ? (
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-blue-600 dark:text-blue-400 font-bold">
                                {triggerWithActions.product_name === 'SCALE_TEST' ? '⚡ Teste de Escala: ' : '📤 '}
                                {triggerWithActions.template_name?.split('|').pop() || triggerWithActions.funnel?.name || 'Disparo em Massa'}
                            </span>
                            {triggerWithActions.product_name === 'SCALE_TEST' ? (
                                <span className="text-xs bg-purple-100 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded-full font-bold">⚡ Simulação</span>
                            ) : triggerWithActions.is_recurring ? (
                                <span className="text-xs bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold">🔄 Recorrente</span>
                            ) : (
                                <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">Bulk</span>
                            )}
                            <span className="text-[10px] bg-slate-105/10 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1" title="Delay entre envios">
                                ⏱️ {triggerWithActions.delay_seconds ?? 5}s
                            </span>
                            <span className="text-[10px] bg-slate-105/10 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1" title="Limite de concorrência">
                                👥 {triggerWithActions.concurrency_limit ?? 1}
                            </span>
                        </div>
                        {triggerWithActions.is_bulk && (triggerWithActions.interaction_funnel || triggerWithActions.block_funnel) && (
                            <div className="flex flex-col gap-0.5 mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                                {triggerWithActions.interaction_funnel && (
                                    <div className="flex items-center gap-1">
                                        <span className="text-amber-500 font-bold">🔥 Interação:</span>
                                        <span className="font-semibold text-gray-700 dark:text-gray-300">{triggerWithActions.interaction_funnel.name}</span>
                                    </div>
                                )}
                                {triggerWithActions.block_funnel && (
                                    <div className="flex items-center gap-1">
                                        <span className="text-red-500 font-bold">🚫 Bloqueio:</span>
                                        <span className="font-semibold text-gray-700 dark:text-gray-300">{triggerWithActions.block_funnel.name}</span>
                                    </div>
                                )}
                            </div>
                        )}
                        {(triggerWithActions.template_name || triggerWithActions.is_bulk) && (
                            <div className="flex flex-wrap gap-4 mt-2">
                                <button 
                                    onClick={() => handleViewContacts(triggerWithActions, 'total')}
                                    className="flex items-center gap-1.5 hover:opacity-80 transition" 
                                    title="Ver Total na Lista"
                                >
                                    <span className="text-sm">🚀</span>
                                    <span className="text-xs font-black text-gray-500">{triggerWithActions.total_contacts || (triggerWithActions.contacts_list?.length) || 0}</span>
                                </button>

                                <button onClick={() => handleViewContacts(triggerWithActions, 'sent')} className="flex items-center gap-1.5 hover:opacity-80 transition" title="Ver Enviados">
                                    <span className="text-sm">✅</span>
                                    <span className="text-xs font-black text-gray-500">{triggerWithActions.total_sent || 0}</span>
                                </button>
                                
                                {!triggerWithActions.funnel_id && (
                                    <>
                                        <button 
                                            onClick={() => handleViewContacts(triggerWithActions, 'queue')} 
                                            className="flex items-center gap-1.5 hover:opacity-80 transition" 
                                            title="Ver Fila de Envio (Meta)"
                                        >
                                            <span className="text-sm">⏳</span>
                                            <span className="text-xs font-black text-blue-500">
                                                {Math.max(0, (triggerWithActions.total_sent || 0) - (triggerWithActions.total_delivered || 0) - (triggerWithActions.total_failed || 0))}
                                            </span>
                                        </button>

                                        <button onClick={() => handleViewContacts(triggerWithActions, 'delivered')} className="flex items-center gap-1.5 hover:opacity-80 transition" title="Ver Entregues">
                                            <span className="text-sm">📬</span>
                                            <span className="text-xs font-black text-emerald-500">{triggerWithActions.total_delivered || 0}</span>
                                        </button>
                                        
                                        <button onClick={() => handleViewContacts(triggerWithActions, 'read')} className="flex items-center gap-1.5 hover:opacity-80 transition" title="Ver Lidos">
                                            <span className="text-sm">👀</span>
                                            <span className="text-xs font-black text-indigo-500">{triggerWithActions.total_read || 0}</span>
                                        </button>

                                        <button onClick={() => handleViewContacts(triggerWithActions, 'interaction')} className="flex items-center gap-1.5 hover:opacity-80 transition" title="Ver Cliques">
                                            <span className="text-sm">👆</span>
                                            <span className="text-xs font-black text-amber-500">{triggerWithActions.total_interactions || 0}</span>
                                        </button>

                                        <button onClick={() => handleViewContacts(triggerWithActions, 'blocked')} className="flex items-center gap-1.5 hover:opacity-80 transition" title="Ver Bloqueios">
                                            <span className="text-sm">🚫</span>
                                            <span className="text-xs font-black text-rose-500">{triggerWithActions.total_blocked || 0}</span>
                                        </button>
                                    </>
                                )}

                                <button onClick={() => handleViewContacts(triggerWithActions, 'failed')} className="flex items-center gap-1.5 hover:opacity-80 transition" title="Ver Falhas">
                                    <span className="text-sm">❌</span>
                                    <span className="text-xs font-black text-red-500">{triggerWithActions.total_failed || 0}</span>
                                </button>

                                {/* Novo ícone mostrando a quantidade restante de contatos a serem disparados */}
                                {(() => {
                                     const total = triggerWithActions.total_contacts || (triggerWithActions.contacts_list?.length) || 0;
                                     const processedNum = (triggerWithActions.total_sent || 0) + (triggerWithActions.total_failed || 0) + (triggerWithActions.total_blocked || 0);
                                     const processedArr = triggerWithActions.processed_contacts?.length || 0;
                                     const processed = Math.max(processedArr, processedNum);
                                     const remaining = Math.max(0, total - processed);
                                     return (
                                         <div className="flex items-center gap-1.5 cursor-default select-none" title="Faltam para terminar o lote">
                                             <span className="text-sm">⏳</span>
                                             <span className="text-xs font-black text-slate-500 dark:text-slate-400">Restam {remaining}</span>
                                         </div>
                                     );
                                 })()}
                            </div>
                        )}

                        {(triggerWithActions.interaction_child_count > 0 || triggerWithActions.block_child_count > 0 || triggerWithActions.child_count > 0 || (triggerWithActions.is_bulk && triggerWithActions.interaction_funnel_id)) && (
                            <div className="flex flex-wrap items-center gap-3 mt-2 border-t border-gray-100 dark:border-gray-800/50 pt-2">
                                {triggerWithActions.followup_status && (
                                    (() => {
                                        const config = getFollowupConfig(triggerWithActions.followup_status, triggerWithActions.followup_scheduled_time);
                                        return (
                                            <button 
                                                onClick={() => fetchChildren(triggerWithActions, 'followup')} 
                                                className={`flex items-center gap-1 px-2 py-0.5 rounded transition cursor-pointer ${config.className}`}
                                            >
                                                <span className="text-sm">{config.icon}</span>
                                                <span className="text-[10px] font-black uppercase tracking-tighter">{config.text}</span>
                                            </button>
                                        );
                                    })()
                                )}
                                {triggerWithActions.interaction_child_count > 0 && (
                                    <button 
                                        onClick={() => fetchChildren(triggerWithActions, 'interaction')} 
                                        className="flex items-center gap-1 hover:bg-orange-50 dark:hover:bg-orange-900/20 px-2 py-0.5 rounded transition cursor-pointer group/rocket text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-900/30"
                                    >
                                        <span className="text-sm">🔄</span>
                                        <span className="text-[10px] font-black uppercase tracking-tighter">Funis de Interação</span>
                                    </button>
                                )}
                                {triggerWithActions.is_bulk && triggerWithActions.interaction_funnel_id && (
                                    <button 
                                        onClick={() => triggerWithActions.onManualInteraction && triggerWithActions.onManualInteraction(triggerWithActions.id)} 
                                        className="flex items-center gap-1.5 hover:bg-amber-500/20 bg-amber-500/10 px-2 py-0.5 rounded transition cursor-pointer text-amber-500 border border-amber-500/30 btn-manual-interaction"
                                        title="Subir contatos manualmente e ativar o funil de interação"
                                    >
                                        <span className="text-xs">📤</span>
                                        <span className="text-[10px] font-black uppercase tracking-tighter">Subir Interações</span>
                                    </button>
                                )}
                                {triggerWithActions.block_child_count > 0 && (
                                    <button 
                                        onClick={() => fetchChildren(triggerWithActions, 'block')} 
                                        className="flex items-center gap-1 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-0.5 rounded transition cursor-pointer group/rocket text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/30"
                                    >
                                        <span className="text-sm">🚫</span>
                                        <span className="text-[10px] font-black uppercase tracking-tighter">Funis de Bloqueio</span>
                                    </button>
                                )}
                                {((triggerWithActions.interaction_child_count || 0) === 0 && (triggerWithActions.block_child_count || 0) === 0 && triggerWithActions.child_count > 0 && !triggerWithActions.followup_status && !triggerWithActions.is_bulk) && (
                                    <button 
                                        onClick={() => fetchChildren(triggerWithActions, 'all')} 
                                        className="flex items-center gap-1 hover:bg-orange-50 dark:hover:bg-orange-900/20 px-1.5 py-0.5 rounded transition cursor-pointer group/rocket text-orange-600 dark:text-orange-400"
                                    >
                                        <span className="text-sm">🔄</span>
                                        <span className="text-[10px] font-black uppercase tracking-tighter">Funis Ativados</span>
                                    </button>
                                )}
                            </div>
                        )}

                        {triggerWithActions.total_failed > 0 && (
                            <button onClick={() => fetchErrors(triggerWithActions.id)} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 mt-1 font-semibold">
                                📋 Ver Relatório de Falhas ({triggerWithActions.total_failed})
                            </button>
                        )}
                        {triggerWithActions.total_delivered > 0 && !triggerWithActions.funnel_id && (
                            <div className={`text-xs font-semibold mt-2 flex flex-wrap gap-2 items-center ${triggerWithActions.total_cost > 0 ? 'text-green-600 dark:text-green-400' : 'text-blue-500'}`}>
                                {(() => {
                                    const totalDelivered = triggerWithActions.total_delivered || 0;
                                    const totalPaid = triggerWithActions.total_paid_templates || 0;
                                    const totalFree = Math.max(0, totalDelivered - totalPaid);
                                    const hasCost = triggerWithActions.total_cost > 0;
                                    
                                    const paidPct = totalDelivered > 0 ? Math.round((totalPaid / totalDelivered) * 100) : 0;
                                    const freePct = totalDelivered > 0 ? 100 - paidPct : 0;
                                    
                                    let unitCost = triggerWithActions.cost_per_unit;
                                    if (!unitCost || unitCost <= 0) {
                                        unitCost = totalPaid > 0 ? (triggerWithActions.total_cost / totalPaid) : 0.35;
                                    }
                                    
                                    return (
                                        <>
                                            {totalFree > 0 && (
                                                <span>
                                                    🆓 {totalFree} {totalFree === 1 ? 'de graça' : 'disparos grátis'} ({freePct}%)
                                                    {unitCost > 0 && (
                                                        <span className="text-blue-500 font-bold ml-1">
                                                            (economia de R$ {(totalFree * unitCost).toFixed(2)})
                                                        </span>
                                                    )}
                                                </span>
                                            )}
                                            {hasCost && (
                                                <span className={totalFree > 0 ? 'ml-2 border-l border-gray-300 dark:border-white/10 pl-2' : ''}>
                                                    💰 R$ {triggerWithActions.total_cost.toFixed(2)} ({totalPaid} {totalPaid === 1 ? 'pago' : 'pagos'} - {paidPct}%)
                                                </span>
                                            )}
                                        </>
                                    );
                                })()}
                                {triggerWithActions.total_cost > 0 && triggerWithActions.total_interactions > 0 && (
                                    <span className="text-[10px] bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded border border-green-200 dark:border-green-800" title="Custo por Interação (CPI)">
                                        R$ {(triggerWithActions.total_cost / triggerWithActions.total_interactions).toFixed(2)} / interação
                                    </span>
                                )}
                            </div>
                        )}

                        {triggerWithActions.button_actions && Object.keys(triggerWithActions.button_actions).length > 0 && (
                            <div className="mt-3 flex flex-col gap-1 border-t border-gray-100 dark:border-gray-800/50 pt-2 text-xs">
                                <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Botões e Ações:</span>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {Object.entries(triggerWithActions.button_actions).map(([btnText, action]) => {
                                        const hasFunnel = action && action.funnel_id;
                                        const funnelName = action && action.funnel_name;
                                        const actionType = action && action.type;
                                        
                                        return (
                                            <div 
                                                key={btnText} 
                                                className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50 text-gray-700 dark:text-gray-300 font-semibold"
                                            >
                                                <span className="text-[10px]">🔘</span>
                                                <span className="font-bold text-slate-800 dark:text-slate-200">{btnText}</span>
                                                <span className="text-gray-400">→</span>
                                                {hasFunnel ? (
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter ${actionType === 'block' ? 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200/50 dark:border-red-900/20' : 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/20'}`}>
                                                        {actionType === 'block' ? '🚫 Bloqueio' : '🔥 Interação'}: {funnelName || `Funil #${action.funnel_id}`}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 dark:text-gray-500 text-[10px] font-bold italic">Sem ação vinculada</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="uppercase text-xs font-black tracking-wider text-gray-500 mr-1">{triggerWithActions.event_type?.replace('_', ' ') || 'WEBHOOK'}:</span>
                            {triggerWithActions.funnel?.name || <span className="text-gray-400 italic">Funil Apagado</span>}
                            <span className="text-[10px] bg-slate-105/10 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1" title="Delay entre envios">
                                ⏱️ {triggerWithActions.delay_seconds ?? 5}s
                            </span>
                            <span className="text-[10px] bg-slate-105/10 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1" title="Limite de concorrência">
                                👥 {triggerWithActions.concurrency_limit ?? 1}
                            </span>
                        </div>
                        {triggerWithActions.total_delivered > 0 && (
                            <div className={`text-[10px] font-bold mt-0.5 ${triggerWithActions.total_cost > 0 ? 'text-green-600 dark:text-green-400' : 'text-blue-500'}`}>
                                {triggerWithActions.total_cost > 0 ? `💰 R$ ${triggerWithActions.total_cost.toFixed(2)}` : '🆓 de graça'}
                            </div>
                        )}
                        <div className="flex flex-wrap items-center gap-3 mt-2 border-t border-gray-100 dark:border-gray-800/50 pt-2">
                            {triggerWithActions.followup_status && (
                                (() => {
                                    const config = getFollowupConfig(triggerWithActions.followup_status, triggerWithActions.followup_scheduled_time);
                                    return (
                                        <button 
                                            onClick={() => fetchChildren(triggerWithActions, 'followup')} 
                                            className={`flex items-center gap-1 px-2 py-0.5 rounded transition cursor-pointer ${config.className}`}
                                        >
                                            <span className="text-sm">{config.icon}</span>
                                            <span className="text-[10px] font-black uppercase tracking-tighter">{config.text}</span>
                                        </button>
                                    );
                                })()
                            )}
                            {triggerWithActions.interaction_child_count > 0 && (
                                <button 
                                    onClick={() => fetchChildren(triggerWithActions, 'interaction')} 
                                    className="flex items-center gap-1 hover:bg-orange-50 dark:hover:bg-orange-900/20 px-2 py-0.5 rounded transition cursor-pointer group/rocket text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-900/30"
                                >
                                    <span className="text-sm">🔄</span>
                                    <span className="text-[10px] font-black uppercase tracking-tighter">Funis de Interação</span>
                                </button>
                            )}
                            {triggerWithActions.block_child_count > 0 && (
                                <button 
                                    onClick={() => fetchChildren(triggerWithActions, 'block')} 
                                    className="flex items-center gap-1 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-0.5 rounded transition cursor-pointer group/rocket text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/30"
                                >
                                    <span className="text-sm">🚫</span>
                                    <span className="text-[10px] font-black uppercase tracking-tighter">Funis de Bloqueio</span>
                                </button>
                            )}
                            {((triggerWithActions.interaction_child_count || 0) === 0 && (triggerWithActions.block_child_count || 0) === 0 && triggerWithActions.child_count > 0 && !triggerWithActions.followup_status) && (
                                <button 
                                    onClick={() => fetchChildren(triggerWithActions, 'all')} 
                                    className="flex items-center gap-1 hover:bg-orange-50 dark:hover:bg-orange-900/20 px-1.5 py-0.5 rounded transition cursor-pointer group/rocket text-orange-600 dark:text-orange-400"
                                >
                                    <span className="text-sm">🔄</span>
                                    <span className="text-[10px] font-black uppercase tracking-tighter">Funis Ativados</span>
                                </button>
                            )}
                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-purple-600 dark:text-purple-400 ml-auto">
                                <FiMousePointer size={10} />
                                <span className="text-[10px] font-bold">{triggerWithActions.total_interactions || 0}</span>
                            </span>
                        </div>
                    </div>
                )}
            </td>
            <td className="p-4 text-center">
                {getStatusBadge(triggerWithActions)}
                {!triggerWithActions.is_bulk && (triggerWithActions.status === 'failed' || triggerWithActions.status === 'cancelled') && triggerWithActions.failure_reason && (
                    <div className="text-[10px] mt-1.5 leading-tight max-w-[150px] mx-auto break-words italic font-medium text-red-500">
                        {translateError(triggerWithActions.failure_reason)}
                    </div>
                )}
            </td>
            <td className="p-4 text-right flex justify-end gap-2">
                {/* 0. VISUALIZAR FLUXO (Se houver funil) */}
                {(triggerWithActions.funnel_id || (triggerWithActions.button_actions && Object.keys(triggerWithActions.button_actions).length > 0)) && 
                 Array.isArray(triggerWithActions.execution_history) && triggerWithActions.execution_history.some(log => log.node_id) && (
                    <button 
                        onClick={() => handleViewPipeline(triggerWithActions.id)} 
                        className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition" 
                        title="Ver Fluxo de Automação Visual"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
                        </svg>
                    </button>
                )}



                {/* 1. DISPAROS EM ANDAMENTO (Pode Pausar ou Cancelar) */}
                {triggerWithActions.status === 'processing' && (
                    <>
                        <button onClick={() => handleCancel(triggerWithActions.id)} className="p-1 text-red-500 hover:bg-red-50 rounded" title="Cancelar"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        {triggerWithActions.is_bulk && (
                            <button onClick={() => handleStartNow(triggerWithActions.id)} className="p-1 text-orange-500 hover:bg-orange-50 rounded" title="Forçar Retomada / Reiniciar Slot"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg></button>
                        )}
                    </>
                )}

                {/* 2. DISPAROS PENDENTES (Pode Iniciar ou Editar) */}
                {triggerWithActions.status === 'pending' && (
                    <>
                        {triggerWithActions.is_bulk && (<button onClick={() => handleEditParams(triggerWithActions)} className="p-1 text-blue-500 hover:bg-blue-50 rounded" title="Editar"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>)}
                        <button onClick={() => handleStartNow(triggerWithActions.id)} className="p-1 text-green-500 hover:bg-green-50 rounded" title="Iniciar Agora"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></button>
                        <button onClick={() => handleCancel(triggerWithActions.id)} className="p-1 text-red-500 hover:bg-red-50 rounded" title="Cancelar"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </>
                )}

                {/* 3. DISPAROS FINALIZADOS OU COM ERRO (Pode Reenviar ou Excluir) */}
                {(triggerWithActions.status === 'failed' || triggerWithActions.status === 'cancelled' || triggerWithActions.status === 'paused') && (
                    <div className="flex items-center gap-2">
                        <button onClick={() => handleStartNow(triggerWithActions.id)} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Retomar de onde parou"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></button>
                        {triggerWithActions.status === 'failed' && (
                            <button onClick={() => handleRetry(triggerWithActions.id)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Repetir apenas Falhas"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg></button>
                        )}
                    </div>
                )}

                {/* 4. OPÇÕES ADMINISTRATIVAS */}
                {user?.role === 'super_admin' && (
                    <button onClick={() => handleDelete(triggerWithActions.id)} className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded" title="Excluir Histórico"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                )}
            </td>
        </tr>
    );
};

const TriggerTable = ({ 
    triggers, loading, triggerType, selectedIds, handleSelectAll, 
    handleSelectOne, handleViewContacts, fetchChildren, fetchErrors, 
    handleViewPipeline, handleEditParams, handleStartNow, handleCancel, 
    handleRetry, handleDelete, user, confirmBulkDelete, onManualInteraction
}) => {
    const displayTriggers = Array.isArray(triggers) ? triggers : [];

    if (loading && displayTriggers.length === 0) {
        return <div className="p-8 text-center text-gray-400 animate-pulse">Carregando histórico...</div>;
    }

    if (displayTriggers.length === 0) {
        return <div className="p-8 text-center text-gray-400">Nenhum disparo registrado.</div>;
    }

    return (
        <div className="overflow-x-auto">
            {selectedIds.length > 0 && user?.role === 'super_admin' && (
                <div className="p-2 bg-red-50 dark:bg-red-900/10 flex justify-end px-4">
                    <button
                        onClick={confirmBulkDelete}
                        className="flex items-center gap-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-3 py-1 rounded-full text-sm font-semibold hover:bg-red-200 dark:hover:bg-red-900/50 transition shadow-sm"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        Excluir ({selectedIds.length})
                    </button>
                </div>
            )}
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        <th className="p-4 w-8">
                            <input
                                type="checkbox"
                                onChange={handleSelectAll}
                                checked={displayTriggers.length > 0 && selectedIds.length === displayTriggers.length}
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
                    {displayTriggers.map((trigger) => (
                        <TriggerTableRow 
                            key={trigger.id || Math.random()}
                            trigger={trigger}
                            selectedIds={selectedIds}
                            handleSelectOne={handleSelectOne}
                            handleViewContacts={handleViewContacts}
                            fetchChildren={fetchChildren}
                            fetchErrors={fetchErrors}
                            handleViewPipeline={handleViewPipeline}
                            handleEditParams={handleEditParams}
                            handleStartNow={handleStartNow}
                            handleCancel={handleCancel}
                            handleRetry={handleRetry}
                            handleDelete={handleDelete}
                            user={user}
                            onManualInteraction={onManualInteraction}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    );
};
export default TriggerTable;
