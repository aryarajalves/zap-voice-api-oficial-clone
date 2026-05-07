import React from 'react';

const TriggerFilters = ({
    filterName, setFilterName, dateRange, setDateRange, filterStatus, setFilterStatus,
    triggerType, setTriggerType, customStart, setCustomStart, customEnd, setCustomEnd,
    itemsPerPage, setItemsPerPage, fetchHistory, onNavigateToBulk, setPage
}) => {
    return (
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex flex-col gap-4">
            <div className="flex gap-2 items-center">
                <div className="flex items-center gap-2">
                    <select
                        value={itemsPerPage}
                        onChange={(e) => { setItemsPerPage(Number(e.target.value)); setPage(1); }}
                        className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-xs text-gray-600 dark:text-gray-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700"
                    >
                        <option value={10}>10 itens</option>
                        <option value={25}>25 itens</option>
                        <option value={50}>50 itens</option>
                        <option value={100}>100 itens</option>
                    </select>
                    <button
                        onClick={fetchHistory}
                        className="p-2 text-gray-400 hover:text-blue-600 transition"
                        title="Atualizar"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                </div>
            </div>

            <div className="flex flex-wrap gap-3 items-center">
                <input type="text" placeholder="Buscar por funil..." value={filterName} onChange={(e) => { setFilterName(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm w-48 focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                <select value={dateRange} onChange={(e) => { setDateRange(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                    <option value="all">Todo o período</option>
                    <option value="today">Hoje</option>
                    <option value="7days">Últimos 7 dias</option>
                    <option value="14days">Últimos 14 dias</option>
                    <option value="month">Este mês</option>
                    <option value="custom">Personalizado</option>
                </select>
                <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                    <option value="all">Todos os status</option>
                    <option value="pending">Agendado</option>
                    <option value="processing">Enviando</option>
                    <option value="completed">Enviado</option>
                    <option value="failed">Falha</option>
                    <option value="cancelled">Cancelado</option>
                </select>
                
                {onNavigateToBulk && (
                    <button
                        onClick={onNavigateToBulk}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all duration-200"
                        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: '2px solid transparent' }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.borderColor = '#a78bfa'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.borderColor = 'transparent'; }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        Disparo em Massa
                    </button>
                )}
                {dateRange === 'custom' && (
                    <div className="flex gap-2 items-center">
                        <input type="date" value={customStart} onChange={(e) => { setCustomStart(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                        <span className="text-gray-400">-</span>
                        <input type="date" value={customEnd} onChange={(e) => { setCustomEnd(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                    </div>
                )}
            </div>
        </div>
    );
};

export const Pagination = ({ page, totalPages, totalItems, setPage }) => {
    return (
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 flex justify-between items-center">
            <div className="flex flex-col">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                    Página <strong>{page}</strong> de <strong>{totalPages}</strong>
                </div>
                <div className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">
                    Total de {totalItems} registros
                </div>
            </div>
            <div className="flex gap-2">
                <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition shadow-sm font-medium"
                >
                    Anterior
                </button>
                <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages || totalPages === 0}
                    className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition shadow-sm font-medium"
                >
                    Próxima
                </button>
            </div>
        </div>
    );
};

export default TriggerFilters;
