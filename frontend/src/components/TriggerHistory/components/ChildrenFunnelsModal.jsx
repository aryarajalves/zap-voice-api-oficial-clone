import React, { useState } from 'react';
import { FiActivity, FiHelpCircle, FiChevronLeft, FiChevronRight, FiRefreshCw } from 'react-icons/fi';
import { createPortal } from 'react-dom';

const ChildrenFunnelsModal = ({ childrenModal, setChildrenModal, setMonitoringTrigger, fetchChildren }) => {
    if (!childrenModal.isOpen) return null;

    const filterType = childrenModal.filterType || 'all';
    let displayChildren = childrenModal.children;
    let modalTitle = 'Funis Iniciados';
    let modalIcon = '🚀';

    if (filterType === 'followup') {
        displayChildren = childrenModal.children.filter(child => child.is_followup);
        modalTitle = 'Follow-up Ativado';
        modalIcon = '⏳';
    } else if (filterType === 'interaction') {
        displayChildren = childrenModal.children.filter(child => child.is_interaction && !child.skip_block_check);
        modalTitle = 'Funis de Interação Iniciados';
        modalIcon = '🔄';
    } else if (filterType === 'block') {
        displayChildren = childrenModal.children.filter(child => child.skip_block_check);
        modalTitle = 'Funis de Bloqueio Iniciados';
        modalIcon = '🚫';
    }
    
    // Status Filter State
    const [statusFilter, setStatusFilter] = useState('all');

    // Filter by status if selected
    if (statusFilter !== 'all') {
        displayChildren = displayChildren.filter(child => {
            const childStatus = (child.status || '').toLowerCase();
            if (statusFilter === 'cancelled') {
                return childStatus === 'cancelled' || childStatus === 'canceled';
            }
            return childStatus === statusFilter;
        });
    }

    // Pagination & Limit States
    const [pageSize, setPageSize] = useState(20);
    const [currentPage, setCurrentPage] = useState(1);
    const [statusExplain, setStatusExplain] = useState(null);

    const STATUS_EXPLANATIONS = {
        'COMPLETED': {
            titulo: 'Concluído / Disparado',
            descricao: 'A automação terminou de enviar todas as etapas e mensagens configuradas no funil para este contato com sucesso.'
        },
        'FAILED': {
            titulo: 'Falha',
            descricao: 'Ocorreu um erro no processamento das mensagens. Isso pode ser causado por repetição rápida de disparos, número inválido ou instabilidade momentânea.'
        },
        'PROCESSING': {
            titulo: 'Em Execução / Disparando...',
            descricao: 'O funil está ativo neste momento e processando o envio das mensagens ou aguardando intervalos de tempo configurados.'
        },
        'QUEUED': {
            titulo: 'Agendado / Em Fila',
            descricao: 'O funil ou follow-up está agendado e aguardando o horário correto configurado para iniciar os envios.'
        },
        'CANCELLED': {
            titulo: 'Cancelado',
            descricao: 'A execução do funil foi cancelada manualmente por um administrador ou de forma automática devido a uma nova interação do contato.'
        },
        'SUSPENDED': {
            titulo: 'Suspenso (Suspended)',
            descricao: 'O funil foi temporariamente suspenso devido a alguma instabilidade com o número do destinatário ou para respeitar a janela de atendimento da Meta.'
        }
    };

    // Calculate pagination data
    const totalItems = displayChildren.length;
    const isShowAll = pageSize === 'all';
    const totalPages = isShowAll ? 1 : Math.ceil(totalItems / pageSize);
    const startIndex = isShowAll ? 0 : (currentPage - 1) * pageSize;
    const paginatedChildren = isShowAll ? displayChildren : displayChildren.slice(startIndex, startIndex + pageSize);

    const handlePageChange = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const handleLimitChange = (e) => {
        const val = e.target.value;
        setPageSize(val === 'all' ? 'all' : parseInt(val));
        setCurrentPage(1);
    };

    // Atualização automática a cada 3 segundos
    React.useEffect(() => {
        if (!childrenModal.isOpen || !fetchChildren) return;
        const interval = setInterval(() => {
            fetchChildren(
                { id: childrenModal.triggerId, template_name: childrenModal.triggerName },
                childrenModal.filterType,
                true // silent reload
            );
        }, 3000);
        return () => clearInterval(interval);
    }, [childrenModal.isOpen, childrenModal.triggerId, childrenModal.triggerName, childrenModal.filterType, fetchChildren]);

    return (
        <div className="fixed inset-0 z-[15000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-800 animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50 dark:bg-gray-800/30">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center text-2xl shrink-0">
                            {modalIcon}
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-gray-900 dark:text-gray-100 leading-tight">
                                {modalTitle}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                                A partir de: <span className="text-orange-600 dark:text-orange-400 font-bold">{childrenModal.triggerName}</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {fetchChildren && (
                            <button
                                onClick={() => fetchChildren({ id: childrenModal.triggerId, template_name: childrenModal.triggerName }, childrenModal.filterType)}
                                disabled={childrenModal.isLoading}
                                className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 font-bold text-xs rounded-xl transition cursor-pointer disabled:opacity-50 border border-gray-200 dark:border-gray-700"
                                title="Atualizar dados"
                            >
                                <FiRefreshCw className={`w-3.5 h-3.5 ${childrenModal.isLoading ? 'animate-spin text-blue-500' : ''}`} />
                                <span className="hidden sm:inline">ATUALIZAR</span>
                            </button>
                        )}

                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-550 dark:text-gray-400 uppercase">Status:</span>
                            <select
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2 text-xs font-bold text-gray-700 dark:text-gray-300 outline-none focus:border-blue-500/50 transition cursor-pointer"
                            >
                                <option value="all">Todos os Status</option>
                                <option value="completed">Concluído</option>
                                <option value="processing">Em Execução</option>
                                <option value="queued">Agendado</option>
                                <option value="failed">Falha</option>
                                <option value="suspended">Suspenso</option>
                                <option value="cancelled">Cancelado</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-550 dark:text-gray-400 uppercase">Mostrar:</span>
                            <select
                                value={pageSize}
                                onChange={handleLimitChange}
                                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2 text-xs font-bold text-gray-700 dark:text-gray-300 outline-none focus:border-blue-500/50 transition cursor-pointer"
                            >
                                <option value={20}>20 itens</option>
                                <option value={50}>50 itens</option>
                                <option value={100}>100 itens</option>
                                <option value={500}>500 itens</option>
                                <option value="all">Todos</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {childrenModal.isLoading && paginatedChildren.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-gray-500 font-bold animate-pulse uppercase tracking-widest text-xs">Carregando execuções...</p>
                        </div>
                    ) : paginatedChildren.length === 0 ? (
                        <div className="text-center py-20 flex flex-col items-center gap-4">
                            <span className="text-5xl">🏜️</span>
                            <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">Nenhum funil iniciado ainda.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {paginatedChildren.map(child => {
                                const rawStatus = (child.status || '').toUpperCase();
                                return (
                                    <div key={child.id} className="bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-orange-200 dark:hover:border-orange-900/50 transition-all hover:shadow-lg">
                                        <div className="flex items-center gap-4">
                                            <div className="flex flex-col">
                                                 <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">
                                                    {(() => {
                                                        try {
                                                            const date = new Date(child.updated_at || child.created_at);
                                                            return isNaN(date.getTime()) ? 'Data inválida' : date.toLocaleString('pt-BR');
                                                        } catch (e) { return 'Sem data'; }
                                                    })()}
                                                </span>
                                                <span className="font-bold text-gray-800 dark:text-gray-200 transition-colors">
                                                    {child.funnel?.name || child.template_name || 'Sem nome'}
                                                </span>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                                        Para: {child.contact_name || child.contact_phone}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col sm:items-end gap-2 shrink-0">
                                            <div className="flex flex-wrap items-center gap-3">
                                                <div className="flex items-center px-3 py-1 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-lg shadow-sm">
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase leading-none mb-1">
                                                            {child.is_followup ? 'Status Follow-up' : 'Status Funil'}
                                                        </span>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                                                                child.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                                child.status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                                child.status === 'processing' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 animate-pulse' :
                                                                child.status === 'queued' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                                                                (child.status === 'cancelled' || child.status === 'canceled') ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' :
                                                                'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                                                            }`}>
                                                                {child.is_followup ? (
                                                                    child.status === 'completed' ? 'DISPARADO' :
                                                                    child.status === 'queued' ? 'AGENDADO' :
                                                                    child.status === 'processing' ? 'DISPARANDO...' :
                                                                    child.status === 'failed' ? 'FALHA' :
                                                                    (child.status === 'cancelled' || child.status === 'canceled') ? 'CANCELADO' :
                                                                    child.status.toUpperCase()
                                                                ) : (
                                                                    child.status === 'completed' ? 'CONCLUÍDO' :
                                                                    child.status === 'failed' ? 'FALHA' :
                                                                    child.status === 'processing' ? 'EM EXECUÇÃO...' :
                                                                    (child.status === 'cancelled' || child.status === 'canceled') ? 'CANCELADO' :
                                                                    child.status.toUpperCase()
                                                                )}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => setStatusExplain(rawStatus)}
                                                                className="text-gray-400 hover:text-blue-500 transition cursor-pointer"
                                                                title="Explicar status"
                                                            >
                                                                <FiHelpCircle className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {(child.total_delivered > 0 || child.total_sent > 0) && (
                                                    <div 
                                                        className="flex flex-col items-center px-3 py-1 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-lg shadow-sm"
                                                        title="Quantidade de mensagens enviadas (nós de envio do funil) que já foram disparadas até o momento."
                                                    >
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase leading-none mb-1">Envios</span>
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-xs font-black text-green-600">{child.total_sent} env</span>
                                                            {child.total_delivered > 0 && <span className="text-[10px] font-bold text-blue-500">({child.total_delivered} ent)</span>}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {!child.is_followup ? (
                                                <div className="flex items-center gap-2 mt-2 self-start sm:self-auto">
                                                    <button
                                                        onClick={() => setMonitoringTrigger(child)}
                                                        className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 rounded text-[10px] font-black text-gray-600 dark:text-gray-300 transition-all shadow-sm active:scale-95"
                                                    >
                                                        <FiActivity className="text-blue-500" /> MONITORAR AO VIVO
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-start sm:items-end gap-1 mt-1 text-left sm:text-right">
                                                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">
                                                        {child.status === 'completed' ? 'Horário do Disparo' : 'Agendado para'}
                                                    </span>
                                                    <span className="text-xs font-black text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/20 px-2.5 py-1 rounded-lg border border-orange-200/30 dark:border-orange-900/30 font-mono">
                                                        {(() => {
                                                            try {
                                                                    const date = new Date(child.scheduled_time || child.updated_at || child.created_at);
                                                                    return isNaN(date.getTime()) ? 'Data inválida' : date.toLocaleString('pt-BR');
                                                            } catch (e) { return 'Sem data'; }
                                                        })()}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Pagination indicators */}
                    {!isShowAll && totalPages > 1 ? (
                        <div className="flex items-center justify-center sm:justify-start gap-1.5">
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="p-2 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-600 dark:text-gray-400 disabled:opacity-40 transition"
                            >
                                <FiChevronLeft size={16} />
                            </button>
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 px-3">
                                Página {currentPage} de {totalPages}
                            </span>
                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="p-2 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-600 dark:text-gray-400 disabled:opacity-40 transition"
                            >
                                <FiChevronRight size={16} />
                            </button>
                        </div>
                    ) : (
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 text-center sm:text-left">
                            Total de {totalItems} registros
                        </span>
                    )}

                    <button onClick={() => setChildrenModal(prev => ({ ...prev, isOpen: false }))} className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-black rounded-xl transition-all uppercase tracking-widest border-0">Fechar</button>
                </div>
            </div>

            {/* Explanation Modal Portal */}
            {statusExplain && createPortal(
                <div className="fixed inset-0 z-[16000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 w-screen h-screen">
                    <div className="w-full max-w-sm bg-white dark:bg-[#131722] border border-gray-200 dark:border-white/5 rounded-3xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 text-center">
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xl mx-auto mb-4">
                            ℹ️
                        </div>
                        <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2">
                            {STATUS_EXPLANATIONS[statusExplain]?.titulo || 'Entenda o Status'}
                        </h3>
                        <p className="text-xs text-gray-550 dark:text-gray-400 leading-relaxed mb-6">
                            {STATUS_EXPLANATIONS[statusExplain]?.descricao || 'Este status indica o estágio atual de envio ou agendamento do funil.'}
                        </p>
                        <button
                            onClick={() => setStatusExplain(null)}
                            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-md hover:shadow-blue-500/20 border-0"
                        >
                            Entendido
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default ChildrenFunnelsModal;
