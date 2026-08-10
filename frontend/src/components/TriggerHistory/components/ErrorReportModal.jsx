import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

const ErrorReportModal = ({ errorModal, setErrorModal }) => {
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(20);

    // Resetar para página 1 e 20 itens por página ao abrir o modal
    useEffect(() => {
        if (errorModal.isOpen) {
            setPage(1);
            setPerPage(20);
        }
    }, [errorModal.isOpen]);

    if (!errorModal.isOpen) return null;

    const formatDateTime = (dateString) => {
        if (!dateString) return '–';
        try {
            const d = new Date(dateString);
            // Rejeita epoch zero (null/undefined vira 1969 ou 1970 no horário de Brasília)
            if (isNaN(d.getTime()) || d.getFullYear() < 2000) return '–';
            return d.toLocaleString('pt-BR', {
                timeZone: 'America/Sao_Paulo',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
            });
        } catch {
            return '–';
        }
    };

    const errorsList = errorModal.errors || [];
    const totalCount = errorsList.length;
    const totalPages = Math.ceil(totalCount / perPage) || 1;
    const displayErrors = errorsList.slice((page - 1) * perPage, page * perPage);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm animated-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh]">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-red-50 dark:bg-red-900/30">
                    <h3 className="font-bold text-red-800 dark:text-red-300 text-lg flex items-center gap-2">
                        ❌ Relatório de Falhas
                    </h3>
                    <button onClick={() => setErrorModal({ ...errorModal, isOpen: false })} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-0 overflow-y-auto flex-1 bg-white dark:bg-gray-800 min-h-[300px]">
                    {errorModal.isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                            {displayErrors.map((err, i) => (
                                <div key={i} className="p-3 hover:bg-red-50 dark:hover:bg-red-900/10 transition">
                                    <div className="flex justify-between items-start">
                                        <div className="font-mono text-sm font-bold text-gray-800 dark:text-gray-200">
                                            {err.phone || 'Número não disponível'}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {formatDateTime(err.time)}
                                        </div>
                                    </div>
                                    <div className="mt-1 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-100 dark:border-red-900/50">
                                        {err.reason || 'Sem motivo detalhado'}
                                    </div>
                                </div>
                            ))}
                            {totalCount === 0 && (
                                <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                                    <p className="text-sm">Nenhuma falha registrada.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Barra de Paginação */}
                {totalCount > 0 && (
                    <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40 flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">Itens por página:</span>
                            <select
                                id="errors-per-page"
                                value={perPage}
                                onChange={(e) => {
                                    setPerPage(Number(e.target.value));
                                    setPage(1);
                                }}
                                className="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 outline-none font-bold text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
                            >
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                                <option value={500}>500</option>
                                <option value={totalCount}>Todos ({totalCount})</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                {((page - 1) * perPage) + 1}–{Math.min(page * perPage, totalCount)} de {totalCount}
                            </span>
                            <button
                                id="errors-prev-page"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                className="px-2 py-1 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs font-bold flex items-center gap-1"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
                                Ant.
                            </button>
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-200 min-w-[60px] text-center">
                                Pág. {page}/{totalPages}
                            </span>
                            <button
                                id="errors-next-page"
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages}
                                className="px-2 py-1 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs font-bold flex items-center gap-1"
                            >
                                Próx.
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
                            </button>
                        </div>
                    </div>
                )}

                <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex justify-end gap-3">
                    <button onClick={() => {
                        if (!errorModal.errors || errorModal.errors.length === 0) {
                            toast.error('A lista está vazia. Nenhuma falha para copiar.');
                            return;
                        }
                        const text = errorModal.errors.map(e => `${e.phone || 'N/A'};${e.reason || 'N/A'};${e.time || 'N/A'}`).join('\n');
                        navigator.clipboard.writeText(text);
                        toast.success('Relatório copiado!');
                    }} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition font-medium text-xs">Copiar Tudo</button>
                    <button onClick={() => setErrorModal({ ...errorModal, isOpen: false })} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium">Fechar</button>
                </div>
            </div>
        </div>
    );
};

export default ErrorReportModal;
