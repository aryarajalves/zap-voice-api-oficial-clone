import React from 'react';
import { createPortal } from 'react-dom';
import { FiMousePointer } from 'react-icons/fi';

// Botão de ação para mover o disparo para uma pasta — abre um popover simples com a lista de pastas.
function MoveFolderButton({ trigger, folders, moveTriggerToFolder }) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [coords, setCoords] = React.useState({ top: 0, bottom: 0, left: 0, right: 0 });
    const btnRef = React.useRef(null);

    const updateCoords = () => {
        if (btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            setCoords({ top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right });
        }
    };

    return (
        <span className="relative inline-flex" ref={btnRef}>
            <button
                onClick={() => { if (!isOpen) updateCoords(); setIsOpen(!isOpen); }}
                className={`p-1 rounded transition-colors ${trigger.folder ? '' : 'text-gray-300 hover:text-indigo-400 hover:bg-indigo-50 dark:text-gray-600 dark:hover:bg-indigo-900/20'}`}
                style={trigger.folder ? { color: trigger.folder.color } : undefined}
                title={trigger.folder ? `Pasta: ${trigger.folder.name}` : 'Mover para uma pasta'}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill={trigger.folder ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                </svg>
            </button>

            {isOpen && createPortal(
                <>
                    <div className="fixed inset-0 z-[99999]" onClick={() => setIsOpen(false)}></div>
                    <div
                        className="fixed bg-white dark:bg-[#0f172a] border border-gray-100 dark:border-white/5 rounded-xl shadow-2xl z-[100000] overflow-y-auto p-1.5"
                        style={{
                            right: window.innerWidth - coords.right,
                            top: coords.bottom + 4,
                            minWidth: 180,
                            maxWidth: 260,
                            maxHeight: 260
                        }}
                    >
                        {(!folders || folders.length === 0) ? (
                            <div className="p-3 text-center text-gray-400 text-xs italic">Nenhuma pasta criada ainda</div>
                        ) : (
                            folders.map(folder => (
                                <div
                                    key={folder.id}
                                    onClick={() => { moveTriggerToFolder(trigger.id, folder.id); setIsOpen(false); }}
                                    className={`px-2.5 py-1.5 text-xs rounded-lg cursor-pointer flex items-center gap-2 ${trigger.folder_id === folder.id ? 'bg-indigo-50 dark:bg-indigo-900/30' : 'hover:bg-gray-100 dark:hover:bg-white/5'}`}
                                >
                                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: folder.color || '#6366f1' }}></span>
                                    <span className="truncate text-gray-800 dark:text-gray-200">{folder.name}</span>
                                </div>
                            ))
                        )}
                        {trigger.folder_id && (
                            <div
                                onClick={() => { moveTriggerToFolder(trigger.id, null); setIsOpen(false); }}
                                className="px-2.5 py-1.5 text-xs rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 italic border-t border-gray-100 dark:border-white/5 mt-1"
                            >
                                Remover da pasta
                            </div>
                        )}
                    </div>
                </>,
                document.body
            )}
        </span>
    );
}

// Tooltip com explicação — aparece abaixo, alinhado para não sair da tela
function Tip({ text, children }) {
    const [show, setShow] = React.useState(false);
    const ref = React.useRef(null);
    const [align, setAlign] = React.useState('center'); // 'center' | 'right'

    const handleEnter = () => {
        if (ref.current) {
            const rect = ref.current.getBoundingClientRect();
            const spaceRight = window.innerWidth - rect.right;
            if (spaceRight < 120) setAlign('right');
            else setAlign('center');
        }
        setShow(true);
    };

    const posClass = align === 'right'
        ? 'right-0'
        : 'left-1/2 -translate-x-1/2';

    const arrowClass = align === 'right'
        ? 'right-3'
        : 'left-1/2 -translate-x-1/2';

    return (
        <span ref={ref} className="relative inline-flex" onMouseEnter={handleEnter} onMouseLeave={() => setShow(false)}>
            {children}
            {show && (
                <span className={`absolute top-full ${posClass} mt-2 z-[9999] w-56 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl leading-relaxed pointer-events-none text-center`}>
                    {text}
                    <span className={`absolute bottom-full ${arrowClass} border-4 border-transparent border-b-gray-900`} />
                </span>
            )}
        </span>
    );
}
import { 
    formatDate, 
    DurationTimer, 
    getStatusBadge, 
    getFollowupConfig, 
    translateError 
} from './TriggerTableUtils';

const TriggerTableRow = ({
    trigger, selectedIds, handleSelectOne, handleViewContacts,
    fetchChildren, fetchErrors, handleViewPipeline, handleEditParams,
    handleStartNow, handleCancel, handleRetry, handleDelete, handleSyncStats, user,
    onManualInteraction, handleTogglePin, folders, moveTriggerToFolder
}) => {
    const triggerWithActions = { ...trigger, onManualInteraction };

    // Só existe "interação" de verdade quando há um funil de interação configurado
    // (seja o funil geral do disparo, seja vinculado a algum botão). Sem isso, o botão
    // "Cancelar recebimento → Sem ação vinculada" não conta como interação.
    // NOTA: Botões com type === 'interaction' contam como interação mesmo sem funil vinculado,
    // pois o próprio clique no botão já é um evento de interação rastreável.
    const hasInteractionTracking = Boolean(
        triggerWithActions.interaction_funnel_id ||
        triggerWithActions.interaction_funnel ||
        (triggerWithActions.button_actions && Object.values(triggerWithActions.button_actions).some(
            action => action && (
                (action.type === 'interaction') ||
                (action.funnel_id && action.type !== 'block')
            )
        ))
    );

    // Auto-sync a cada 10s enquanto o trigger bulk está ativo E Restam > 0.
    // Quando Restam chega a 0 com o trigger ainda ativo, dispara um sync final.
    const finalSyncDoneRef = React.useRef(false);
    React.useEffect(() => {
        if (!handleSyncStats || !trigger.is_bulk) return;
        const ACTIVE = ['processing', 'queued'];
        const isActive = ACTIVE.includes(trigger.status);
        if (!isActive) { finalSyncDoneRef.current = false; return; }

        const total = trigger.total_contacts || trigger.contacts_list?.length || 0;
        const processedNum = (trigger.total_sent || 0) + (trigger.total_failed || 0);
        const processedArr = trigger.processed_contacts?.length || 0;
        const remaining = Math.max(0, total - Math.max(processedArr, processedNum));

        if (remaining > 0) {
            finalSyncDoneRef.current = false;
            const interval = setInterval(() => handleSyncStats(trigger.id, { silent: true }), 10000);
            return () => clearInterval(interval);
        } else if (!finalSyncDoneRef.current) {
            // Restam chegou a 0 — sync final silencioso
            finalSyncDoneRef.current = true;
            handleSyncStats(trigger.id, { silent: true });
        }
    }, [
        trigger.id, trigger.status, trigger.is_bulk,
        trigger.total_sent, trigger.total_failed,
        trigger.processed_contacts?.length, trigger.total_contacts,
        handleSyncStats
    ]);

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
                        const isFinishedStatus = ['completed', 'failed', 'aborted', 'cancelled', 'cancelling'].includes(triggerWithActions.status);
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
                            {(() => {
                                const cat = String(triggerWithActions.template_category || '').toUpperCase();
                                if (cat === 'UTILITY' || cat === 'UTILIDADE') {
                                    return (
                                        <span className="text-[10px] bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300/40 dark:border-amber-800/40 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1" title="Categoria Meta: Utilidade">
                                            🛠️ Utilidade
                                        </span>
                                    );
                                }
                                if (cat === 'AUTHENTICATION' || cat === 'AUTENTICACAO' || cat === 'AUTENTICAÇÃO') {
                                    return (
                                        <span className="text-[10px] bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-300/40 dark:border-purple-800/40 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1" title="Categoria Meta: Autenticação">
                                            🔐 Autenticação
                                        </span>
                                    );
                                }
                                if (cat === 'MARKETING' || triggerWithActions.template_name) {
                                    return (
                                        <span className="text-[10px] bg-sky-100 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-300/40 dark:border-sky-800/40 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1" title="Categoria Meta: Marketing">
                                            📢 Marketing
                                        </span>
                                    );
                                }
                                return null;
                            })()}
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
                            {triggerWithActions.waba_card_last4 && String(triggerWithActions.waba_card_last4).trim() !== "" && (
                                <span className="text-[10px] bg-blue-500/10 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border border-blue-500/20 px-2 py-0.5 rounded-full font-bold flex items-center gap-1" title="Últimos 4 dígitos do Cartão WABA vinculado">
                                    💳 Final {String(triggerWithActions.waba_card_last4).trim()}
                                </span>
                            )}
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
                                
                                <button 
                                    onClick={() => handleViewContacts(triggerWithActions, 'queue')} 
                                    className="flex items-center gap-1.5 hover:opacity-80 transition" 
                                    title="Ver Fila de Envio (Meta)"
                                >
                                    <span className="text-sm">⏳</span>
                                    <span className="text-xs font-black text-blue-500">
                                        {triggerWithActions.queue_count !== undefined && triggerWithActions.queue_count !== null
                                            ? triggerWithActions.queue_count
                                            : Math.max(0, (triggerWithActions.total_sent || 0) - (triggerWithActions.total_delivered || 0) - (triggerWithActions.total_failed || 0))}
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

                                {hasInteractionTracking && (
                                    <button onClick={() => handleViewContacts(triggerWithActions, 'interaction')} className="flex items-center gap-1.5 hover:opacity-80 transition" title="Ver Cliques">
                                        <span className="text-sm">👆</span>
                                        <span className="text-xs font-black text-amber-500">{triggerWithActions.total_interactions || 0}</span>
                                    </button>
                                )}

                                <button onClick={() => handleViewContacts(triggerWithActions, 'blocked')} className="flex items-center gap-1.5 hover:opacity-80 transition" title="Ver Bloqueios">
                                    <span className="text-sm">🚫</span>
                                    <span className="text-xs font-black text-rose-500">{triggerWithActions.total_blocked || 0}</span>
                                </button>

                                <button onClick={() => handleViewContacts(triggerWithActions, 'failed')} className="flex items-center gap-1.5 hover:opacity-80 transition" title="Ver Falhas">
                                    <span className="text-sm">❌</span>
                                    <span className="text-xs font-black text-red-500">{triggerWithActions.total_failed || 0}</span>
                                </button>

                                {(() => {
                                     const total = triggerWithActions.total_contacts || (triggerWithActions.contacts_list?.length) || 0;
                                     const processedNum = (triggerWithActions.total_sent || 0) + (triggerWithActions.total_failed || 0);
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

                                {handleSyncStats && (
                                    <Tip text="Recalcular os contadores (enviados, entregues, lidos, interações) a partir dos registros reais. Use quando os números da linha não batem com os da lista de contatos.">
                                        <button
                                            onClick={() => handleSyncStats(triggerWithActions.id)}
                                            className="flex items-center gap-1 hover:opacity-80 transition"
                                            title="Sincronizar contadores"
                                        >
                                            <span className="text-sm">🔄</span>
                                            <span className="text-[10px] font-black text-slate-400 hover:text-blue-500">Sync</span>
                                        </button>
                                    </Tip>
                                )}
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
                        {triggerWithActions.total_delivered > 0 && (
                            <div className={`text-xs font-semibold mt-2 flex flex-wrap gap-2 items-center ${triggerWithActions.total_cost > 0 ? 'text-green-600 dark:text-green-400' : 'text-blue-500'}`}>
                                {(() => {
                                    const totalDelivered = triggerWithActions.total_delivered || 0;
                                    const totalPaid = triggerWithActions.total_paid_templates || 0;
                                    const totalFree = Math.max(0, totalDelivered - totalPaid);
                                    const hasCost = triggerWithActions.total_cost > 0;
                                    
                                    // Calculados de forma independente (não como complemento um do outro),
                                    // senão arredondamentos como 99.6% pago / 0.4% grátis viravam "100% / 0%".
                                    const formatPct = (value) => {
                                        if (value <= 0) return '0';
                                        if (value >= 100) return '100';
                                        const rounded = Math.round(value);
                                        // Se arredondar para 0% ou 100% sem realmente ser exatamente isso,
                                        // mostra 1 casa decimal para refletir o valor real.
                                        if (rounded === 0 || rounded === 100) return value.toFixed(1);
                                        return String(rounded);
                                    };
                                    const paidPct = formatPct(totalDelivered > 0 ? (totalPaid / totalDelivered) * 100 : 0);
                                    const freePct = formatPct(totalDelivered > 0 ? (totalFree / totalDelivered) * 100 : 0);
                                    
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
                                {triggerWithActions.total_cost > 0 && triggerWithActions.total_interactions > 0 && hasInteractionTracking && (
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
                            {hasInteractionTracking && (
                                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-purple-600 dark:text-purple-400 ml-auto">
                                    <FiMousePointer size={10} />
                                    <span className="text-[10px] font-bold">{triggerWithActions.total_interactions || 0}</span>
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </td>
            <td className="p-4 text-center">
                {getStatusBadge(triggerWithActions)}
                {triggerWithActions.folder && (
                    <div
                        className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border"
                        style={{
                            backgroundColor: `${triggerWithActions.folder.color}1a`,
                            borderColor: `${triggerWithActions.folder.color}4d`,
                            color: triggerWithActions.folder.color
                        }}
                    >
                        📁 {triggerWithActions.folder.name}
                    </div>
                )}
                {triggerWithActions.is_stress_test && (
                    <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-400 text-[10px] font-black uppercase tracking-wider">
                        🧪 Teste de Escala
                    </div>
                )}
                {!triggerWithActions.is_bulk && (triggerWithActions.status === 'failed' || triggerWithActions.status === 'cancelled') && triggerWithActions.failure_reason && (
                    <div className="text-[10px] mt-1.5 leading-tight max-w-[150px] mx-auto break-words italic font-medium text-red-500">
                        {translateError(triggerWithActions.failure_reason)}
                    </div>
                )}
            </td>
            <td className="p-4 text-right flex justify-end gap-2">
                {/* 0. VISUALIZAR FLUXO */}
                {(triggerWithActions.funnel_id || triggerWithActions.product_name === 'SCALE_TEST' || (triggerWithActions.button_actions && Object.keys(triggerWithActions.button_actions).length > 0)) && 
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

                {/* 1. DISPAROS EM ANDAMENTO */}
                {triggerWithActions.status === 'processing' && (
                    <>
                        <Tip text="Cancelar o disparo. O batch atual será concluído e o envio para antes do próximo grupo de contatos.">
                            <button onClick={() => handleCancel(triggerWithActions.id)} className="p-1 text-red-500 hover:bg-red-50 rounded"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </Tip>
                        {triggerWithActions.is_bulk && (
                            <Tip text="Forçar retomada do disparo. Use quando o disparo parece travado — o sistema verifica se o worker ainda está ativo e reinicia o envio a partir dos contatos pendentes.">
                                <button onClick={() => handleStartNow(triggerWithActions.id)} className="p-1 text-orange-500 hover:bg-orange-50 rounded"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg></button>
                            </Tip>
                        )}
                    </>
                )}

                {/* 2. DISPAROS PENDENTES */}
                {triggerWithActions.status === 'pending' && (
                    <>
                        {triggerWithActions.is_bulk && (
                            <Tip text="Editar os parâmetros do disparo antes de iniciá-lo (delay, concorrência, template).">
                                <button onClick={() => handleEditParams(triggerWithActions)} className="p-1 text-blue-500 hover:bg-blue-50 rounded"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                            </Tip>
                        )}
                        <Tip text="Iniciar o disparo agora, sem esperar o horário agendado.">
                            <button onClick={() => handleStartNow(triggerWithActions.id)} className="p-1 text-green-500 hover:bg-green-50 rounded"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></button>
                        </Tip>
                        <Tip text="Cancelar o disparo. Ele será removido da fila e não será enviado.">
                            <button onClick={() => handleCancel(triggerWithActions.id)} className="p-1 text-red-500 hover:bg-red-50 rounded"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </Tip>
                    </>
                )}

                {/* 3. DISPAROS FINALIZADOS, PAUSADOS, CANCELADOS OU EM ENCERRAMENTO */}
                {(triggerWithActions.status === 'failed' || triggerWithActions.status === 'cancelled' || triggerWithActions.status === 'paused' || triggerWithActions.status === 'cancelling') && (
                    <div className="flex items-center gap-2">
                        {triggerWithActions.is_bulk && (
                            <Tip text="Ajustar o delay entre disparos e o limite de concorrência antes de retomar.">
                                <button onClick={() => handleEditParams(triggerWithActions)} className="p-1 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                </button>
                            </Tip>
                        )}
                        <Tip text="Retomar o disparo a partir do último contato enviado.">
                            <button onClick={() => handleStartNow(triggerWithActions.id)} className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </button>
                        </Tip>
                        {triggerWithActions.status === 'failed' && (
                            <Tip text="Repetir o disparo apenas para os contatos que falharam, sem reenviar para quem já recebeu.">
                                <button onClick={() => handleRetry(triggerWithActions.id)} className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                </button>
                            </Tip>
                        )}
                    </div>
                )}

                {/* 4. FIXAR */}
                {handleTogglePin && (
                    <Tip text={triggerWithActions.is_pinned ? "Desafixar do topo" : "Fixar no topo do histórico"}>
                        <button
                            onClick={() => handleTogglePin(triggerWithActions.id)}
                            className={`p-1 rounded transition-colors ${triggerWithActions.is_pinned ? 'text-amber-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20' : 'text-gray-300 hover:text-amber-400 hover:bg-amber-50 dark:text-gray-600 dark:hover:bg-amber-900/20'}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill={triggerWithActions.is_pinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                            </svg>
                        </button>
                    </Tip>
                )}

                {/* 4b. MOVER PARA PASTA */}
                {moveTriggerToFolder && (
                    <MoveFolderButton
                        trigger={triggerWithActions}
                        folders={folders}
                        moveTriggerToFolder={moveTriggerToFolder}
                    />
                )}

                {/* 5. OPÇÕES ADMINISTRATIVAS */}
                {user?.role === 'super_admin' && (
                    <Tip text="Excluir este registro do histórico permanentemente. Os dados de envio serão perdidos.">
                        <button onClick={() => handleDelete(triggerWithActions.id)} className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </Tip>
                )}
            </td>
        </tr>
    );
};

export default TriggerTableRow;
