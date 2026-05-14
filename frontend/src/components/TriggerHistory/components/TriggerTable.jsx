import React from 'react';
import { FiNavigation, FiMousePointer } from 'react-icons/fi';

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

const getStatusBadge = (trigger) => {
    const { status, failure_reason } = trigger;
    switch (status) {
        case 'completed':
            return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">Enviado</span>;
        case 'pending':
        case 'queued':
            return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700">Fila</span>;
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

const TriggerTableRow = ({ 
    trigger, selectedIds, handleSelectOne, handleViewContacts, 
    fetchChildren, fetchErrors, handleViewPipeline, handleEditParams, 
    handleStartNow, handleCancel, handleRetry, handleDelete, user 
}) => {
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
                            <div className="flex flex-wrap gap-4 mt-2">
                                <button 
                                    onClick={() => handleViewContacts(trigger, 'total')}
                                    className="flex items-center gap-1.5 hover:opacity-80 transition" 
                                    title="Ver Total na Lista"
                                >
                                    <span className="text-sm">🚀</span>
                                    <span className="text-xs font-black text-gray-500">{trigger.total_contacts || (trigger.contacts_list?.length) || 0}</span>
                                </button>

                                <button onClick={() => handleViewContacts(trigger, 'sent')} className="flex items-center gap-1.5 hover:opacity-80 transition" title="Ver Enviados">
                                    <span className="text-sm">✅</span>
                                    <span className="text-xs font-black text-gray-500">{trigger.total_sent || 0}</span>
                                </button>
                                
                                <button onClick={() => handleViewContacts(trigger, 'delivered')} className="flex items-center gap-1.5 hover:opacity-80 transition" title="Ver Entregues">
                                    <span className="text-sm">📬</span>
                                    <span className="text-xs font-black text-emerald-500">{trigger.total_delivered || 0}</span>
                                </button>
                                
                                <button onClick={() => handleViewContacts(trigger, 'read')} className="flex items-center gap-1.5 hover:opacity-80 transition" title="Ver Lidos">
                                    <span className="text-sm">👀</span>
                                    <span className="text-xs font-black text-indigo-500">{trigger.total_read || 0}</span>
                                </button>

                                <button onClick={() => handleViewContacts(trigger, 'interaction')} className="flex items-center gap-1.5 hover:opacity-80 transition" title="Ver Cliques">
                                    <span className="text-sm">👆</span>
                                    <span className="text-xs font-black text-amber-500">{trigger.total_interactions || 0}</span>
                                </button>

                                <button onClick={() => handleViewContacts(trigger, 'blocked')} className="flex items-center gap-1.5 hover:opacity-80 transition" title="Ver Bloqueios">
                                    <span className="text-sm">🚫</span>
                                    <span className="text-xs font-black text-rose-500">{trigger.total_blocked || 0}</span>
                                </button>

                                <button onClick={() => handleViewContacts(trigger, 'failed')} className="flex items-center gap-1.5 hover:opacity-80 transition" title="Ver Falhas">
                                    <span className="text-sm">❌</span>
                                    <span className="text-xs font-black text-red-500">{trigger.total_failed || 0}</span>
                                </button>
                            </div>
                        )}
                        {trigger.child_count > 0 && (
                            <div className="flex items-center gap-3 mt-2 border-t border-gray-100 dark:border-gray-800/50 pt-2">
                                <button onClick={() => fetchChildren(trigger)} className="flex items-center gap-1 hover:bg-orange-50 dark:hover:bg-orange-900/20 px-1.5 py-0.5 rounded transition cursor-pointer group/rocket">
                                    <span className="text-sm">🔄</span>
                                    <span className="text-[10px] font-black text-orange-600 uppercase tracking-tighter">Funis Ativados</span>
                                </button>
                            </div>
                        )}
                        {trigger.total_failed > 0 && (
                            <button onClick={() => fetchErrors(trigger.id)} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 mt-1 font-semibold">
                                📋 Ver Relatório de Falhas ({trigger.total_failed})
                            </button>
                        )}
                        {trigger.total_delivered > 0 && (
                            <div className={`text-xs font-semibold mt-2 flex flex-wrap gap-2 items-center ${trigger.total_cost > 0 ? 'text-green-600 dark:text-green-400' : 'text-blue-500'}`}>
                                {(() => {
                                    const totalPaid = trigger.total_paid_templates || 0;
                                    const totalFree = Math.max(0, trigger.total_delivered - totalPaid);
                                    const hasCost = trigger.total_cost > 0;
                                    
                                    return (
                                        <>
                                            {totalFree > 0 && <span>🆓 {totalFree} {totalFree === 1 ? 'de graça' : 'disparos grátis'}</span>}
                                            {hasCost && (
                                                <span className={totalFree > 0 ? 'ml-1' : ''}>
                                                    💰 R$ {trigger.total_cost.toFixed(2)} ({totalPaid} {totalPaid === 1 ? 'pago' : 'pagos'})
                                                </span>
                                            )}
                                        </>
                                    );
                                })()}
                                {trigger.total_cost > 0 && trigger.total_interactions > 0 && (
                                    <span className="text-[10px] bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded border border-green-200 dark:border-green-800" title="Custo por Interação (CPI)">
                                        R$ {(trigger.total_cost / trigger.total_interactions).toFixed(2)} / interação
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="uppercase text-xs font-black tracking-wider text-gray-500 mr-1">{trigger.event_type?.replace('_', ' ') || 'WEBHOOK'}:</span>
                            {trigger.funnel?.name || <span className="text-gray-400 italic">Funil Apagado</span>}
                        </div>
                        {trigger.total_delivered > 0 && (
                            <div className={`text-[10px] font-bold mt-0.5 ${trigger.total_cost > 0 ? 'text-green-600 dark:text-green-400' : 'text-blue-500'}`}>
                                {trigger.total_cost > 0 ? `💰 R$ ${trigger.total_cost.toFixed(2)}` : '🆓 de graça'}
                            </div>
                        )}
                        <div className="flex items-center gap-3 mt-2 border-t border-gray-100 dark:border-gray-800/50 pt-2">
                            {trigger.child_count > 0 && (
                                <button onClick={() => fetchChildren(trigger)} className="flex items-center gap-1 hover:bg-orange-50 dark:hover:bg-orange-900/20 px-1.5 py-0.5 rounded transition cursor-pointer group/rocket">
                                    <span className="text-sm">🔄</span>
                                    <span className="text-[10px] font-black text-orange-600 uppercase tracking-tighter">Funis Ativados</span>
                                </button>
                            )}
                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-purple-600 dark:text-purple-400">
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
                    <div className="text-[10px] mt-1.5 leading-tight max-w-[150px] mx-auto break-words italic font-medium text-red-500">
                        {trigger.failure_reason}
                    </div>
                )}
            </td>
            <td className="p-4 text-right flex justify-end gap-2">
                {/* 1. DISPAROS EM ANDAMENTO (Pode Pausar ou Cancelar) */}
                {trigger.status === 'processing' && (
                    <>
                        <button onClick={() => handleCancel(trigger.id)} className="p-1 text-red-500 hover:bg-red-50 rounded" title="Cancelar"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        {trigger.is_bulk && (
                            <button onClick={() => handleStartNow(trigger.id)} className="p-1 text-orange-500 hover:bg-orange-50 rounded" title="Forçar Retomada / Reiniciar Slot"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg></button>
                        )}
                    </>
                )}

                {/* 2. DISPAROS PENDENTES (Pode Iniciar ou Editar) */}
                {trigger.status === 'pending' && (
                    <>
                        {trigger.is_bulk && (<button onClick={() => handleEditParams(trigger)} className="p-1 text-blue-500 hover:bg-blue-50 rounded" title="Editar"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>)}
                        <button onClick={() => handleStartNow(trigger.id)} className="p-1 text-green-500 hover:bg-green-50 rounded" title="Iniciar Agora"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></button>
                        <button onClick={() => handleCancel(trigger.id)} className="p-1 text-red-500 hover:bg-red-50 rounded" title="Cancelar"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </>
                )}

                {/* 3. DISPAROS FINALIZADOS OU COM ERRO (Pode Reenviar ou Excluir) */}
                {(trigger.status === 'failed' || trigger.status === 'cancelled' || trigger.status === 'paused') && (
                    <div className="flex items-center gap-2">
                        <button onClick={() => handleStartNow(trigger.id)} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Retomar de onde parou"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></button>
                        {trigger.status === 'failed' && (
                            <button onClick={() => handleRetry(trigger.id)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Repetir apenas Falhas"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg></button>
                        )}
                    </div>
                )}

                {/* 4. OPÇÕES ADMINISTRATIVAS */}
                {user?.role === 'super_admin' && (
                    <button onClick={() => handleDelete(trigger.id)} className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded" title="Excluir Histórico"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                )}
            </td>
        </tr>
    );
};

const TriggerTable = ({ 
    triggers, loading, triggerType, selectedIds, handleSelectAll, 
    handleSelectOne, handleViewContacts, fetchChildren, fetchErrors, 
    handleViewPipeline, handleEditParams, handleStartNow, handleCancel, 
    handleRetry, handleDelete, user, confirmBulkDelete 
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
                        />
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default TriggerTable;
