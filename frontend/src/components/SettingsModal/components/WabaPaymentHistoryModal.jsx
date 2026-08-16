import React from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiCheckCircle, FiAlertCircle, FiAlertTriangle, FiClock, FiActivity, FiRefreshCw } from 'react-icons/fi';

const WabaPaymentHistoryModal = ({ isOpen, onClose, history, isLoading, onRefresh }) => {
    if (!isOpen) return null;

    const formatDate = (isoStr) => {
        if (!isoStr) return '-';
        try {
            const date = new Date(isoStr);
            return date.toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        } catch {
            return isoStr;
        }
    };

    const getStatusBadge = (status, hasError) => {
        if (status === 'HEALTHY' && !hasError) {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <FiCheckCircle className="text-emerald-400" size={12} />
                    Regular
                </span>
            );
        }
        if (status === 'PAYMENT_ISSUE' || hasError) {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    <FiAlertCircle className="text-rose-400" size={12} />
                    Falha de Pagamento
                </span>
            );
        }
        if (status === 'WARNING') {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <FiAlertTriangle className="text-amber-400" size={12} />
                    Atenção
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">
                Não Configurado
            </span>
        );
    };

    const modalContent = (
        <div className="fixed inset-0 z-[9999] w-screen h-screen bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
            <div 
                className="relative w-full max-w-4xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 sm:p-6 border-b border-white/10 bg-slate-950/40">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                            <FiActivity size={20} />
                        </div>
                        <div>
                            <h3 className="text-base sm:text-lg font-black text-white">Histórico de Auditoria de Pagamentos (WABA)</h3>
                            <p className="text-xs text-slate-400">Verificações automáticas a cada 2 horas e checagens manuais da conta Meta.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onRefresh}
                            disabled={isLoading}
                            className="p-2 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-xl border border-white/5 transition-all disabled:opacity-50"
                            title="Atualizar lista"
                        >
                            <FiRefreshCw className={isLoading ? "animate-spin" : ""} size={16} />
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-xl border border-white/5 transition-all"
                            title="Fechar"
                        >
                            <FiX size={18} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
                    {isLoading && (!history || history.length === 0) ? (
                        <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                            <FiRefreshCw className="animate-spin text-emerald-400" size={24} />
                            <span className="text-xs font-medium">Carregando histórico de verificações...</span>
                        </div>
                    ) : !history || history.length === 0 ? (
                        <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-500">
                            <FiClock size={32} className="text-slate-600" />
                            <p className="text-sm font-semibold">Nenhuma verificação registrada ainda.</p>
                            <p className="text-xs">Clique em "Verificar Agora" para realizar a primeira checagem.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-slate-300 border-collapse">
                                <thead>
                                    <tr className="border-b border-white/10 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                                        <th className="pb-3 px-3">Data / Hora</th>
                                        <th className="pb-3 px-3">Origem</th>
                                        <th className="pb-3 px-3">Status</th>
                                        <th className="pb-3 px-3">Diagnóstico / Detalhes</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 font-medium">
                                    {history.map((item) => (
                                        <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="py-3.5 px-3 text-slate-300 whitespace-nowrap">
                                                {formatDate(item.checked_at)}
                                            </td>
                                            <td className="py-3.5 px-3 whitespace-nowrap">
                                                {item.check_type === 'MANUAL' ? (
                                                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                                                        ⚡ Manual
                                                    </span>
                                                ) : (
                                                    <span className="text-blue-400 font-bold flex items-center gap-1">
                                                        ⏰ Automático (2h)
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-3 whitespace-nowrap">
                                                {getStatusBadge(item.status, item.has_error)}
                                            </td>
                                            <td className="py-3.5 px-3 text-slate-300 max-w-md">
                                                <p className="text-xs leading-relaxed">{item.details || '-'}</p>
                                                {item.payment_method_status && (
                                                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                                                        Método: {item.payment_method_status} {item.currency ? `(${item.currency})` : ''}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10 bg-slate-950/40 flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2 bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold rounded-xl transition-all border border-white/5"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default WabaPaymentHistoryModal;
