import React from 'react';

export const translateError = (msg) => {
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

export const parseDateToUTC = (dateString) => {
    if (!dateString) return null;
    let date = new Date(dateString);
    if (typeof dateString === 'string' && !dateString.endsWith('Z') && !dateString.includes('+') && dateString.slice(19).indexOf('-') === -1) {
        date = new Date(dateString + 'Z');
    }
    return date;
};

export const formatDate = (dateString) => {
    const date = parseDateToUTC(dateString);
    if (!date) return '-';
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit', month: '2-digit', year: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }).format(date);
};

export const CountdownBadge = ({ untilTime, reason, onZero }) => {
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

export const DurationTimer = ({ started, finished, triggerWithActions, isFinishedStatus }) => {
    const [elapsed, setElapsed] = React.useState(0);
    
    const calculateElapsed = () => {
        const pausedAt = triggerWithActions.processed_data?.paused_at;
        const pausedDuration = triggerWithActions.processed_data?.paused_duration || 0; // em segundos
        
        const startedDate = parseDateToUTC(started);
        const finishedDate = parseDateToUTC(finished);
        const pausedAtDate = parseDateToUTC(pausedAt);
        
        if (pausedAtDate && startedDate) {
            const diff = pausedAtDate.getTime() - startedDate.getTime();
            return Math.max(0, Math.floor(diff / 1000) - pausedDuration);
        }
        
        if (finishedDate && startedDate) {
            const diff = finishedDate.getTime() - startedDate.getTime();
            return Math.max(0, Math.floor(diff / 1000) - pausedDuration);
        }
        
        if (startedDate) {
            const diff = new Date().getTime() - startedDate.getTime();
            return Math.max(0, Math.floor(diff / 1000) - pausedDuration);
        }
        
        return 0;
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

export const getStatusBadge = (trigger) => {
    const { status, failure_reason, processed_data } = trigger;
    const isTempPaused = processed_data?.temp_paused === true;
    
    const [forceNormal, setForceNormal] = React.useState(false);
    
    React.useEffect(() => {
        setForceNormal(false);
    }, [processed_data?.temp_paused, processed_data?.temp_paused_until]);

    if (isTempPaused && !forceNormal) {
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

export const getFollowupConfig = (status, scheduledTime) => {
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
