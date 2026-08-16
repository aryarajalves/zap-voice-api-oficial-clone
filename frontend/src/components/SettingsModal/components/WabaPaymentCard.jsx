import React, { useState, useEffect, useCallback } from 'react';
import { FiCreditCard, FiRefreshCw, FiCheckCircle, FiAlertCircle, FiAlertTriangle, FiClock, FiList } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../../config';
import { useClient } from '../../../contexts/ClientContext';
import WabaPaymentHistoryModal from './WabaPaymentHistoryModal';

const WabaPaymentCard = () => {
    const { activeClient } = useClient();
    const [statusData, setStatusData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const [history, setHistory] = useState([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    const fetchPaymentStatus = useCallback(async () => {
        if (!activeClient?.id) return;
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/waba-payment/status`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-Client-ID': String(activeClient.id)
                }
            });
            if (res.ok) {
                const data = await res.json();
                setStatusData(data);
            }
        } catch (err) {
            console.error("Erro ao buscar status de pagamento WABA:", err);
        } finally {
            setIsLoading(false);
        }
    }, [activeClient?.id]);

    const fetchHistory = useCallback(async () => {
        if (!activeClient?.id) return;
        setIsLoadingHistory(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/waba-payment/history?limit=30`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-Client-ID': String(activeClient.id)
                }
            });
            if (res.ok) {
                const data = await res.json();
                setHistory(data || []);
            }
        } catch (err) {
            console.error("Erro ao buscar histórico de pagamentos WABA:", err);
        } finally {
            setIsLoadingHistory(false);
        }
    }, [activeClient?.id]);

    useEffect(() => {
        fetchPaymentStatus();
    }, [fetchPaymentStatus]);

    const handleCheckNow = async () => {
        if (!activeClient?.id) return;
        setIsChecking(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/waba-payment/check-now`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-Client-ID': String(activeClient.id)
                }
            });
            if (res.ok) {
                const data = await res.json();
                setStatusData(data);
                if (data.status === 'HEALTHY' && !data.has_error) {
                    toast.success("Conta Meta e pagamentos verificados: Situação regular!");
                } else if (data.status === 'PAYMENT_ISSUE' || data.has_error) {
                    toast.error(`Atenção: ${data.details || 'Falha de pagamento detectada na Meta.'}`);
                } else {
                    toast(data.details || "Verificação concluída.", { icon: 'ℹ️' });
                }
                if (isHistoryOpen) {
                    fetchHistory();
                }
            } else {
                toast.error("Não foi possível verificar o status da WABA no momento.");
            }
        } catch (err) {
            console.error("Erro ao executar checagem manual de pagamento:", err);
            toast.error("Erro de conexão ao verificar pagamento da Meta.");
        } finally {
            setIsChecking(false);
        }
    };

    const handleOpenHistory = () => {
        setIsHistoryOpen(true);
        fetchHistory();
    };

    const formatCheckedAt = (isoStr) => {
        if (!isoStr) return 'Nunca verificado';
        try {
            const date = new Date(isoStr);
            return date.toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return isoStr;
        }
    };

    const isHealthy = statusData?.status === 'HEALTHY' && !statusData?.has_error;
    const isIssue = statusData?.status === 'PAYMENT_ISSUE' || statusData?.has_error;

    return (
        <>
            <div className="p-4 sm:p-5 bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-white/10 rounded-2xl shadow-xl space-y-4 relative overflow-hidden">
                {/* Background Accent Glow */}
                <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 opacity-20 ${
                    isIssue ? 'bg-rose-500' : isHealthy ? 'bg-emerald-500' : 'bg-blue-500'
                }`} />

                {/* Top Row: Title + Status Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl border ${
                            isIssue 
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                : isHealthy 
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        }`}>
                            <FiCreditCard size={20} />
                        </div>
                        <div>
                            <h4 className="text-sm font-black text-white flex items-center gap-2">
                                Saúde de Pagamento e Faturamento (Meta WABA)
                            </h4>
                            <p className="text-xs text-slate-400">
                                Monitoramento automático a cada 2 horas de falhas de cartão, saldo devedor e restrições.
                            </p>
                        </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                        {isLoading ? (
                            <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                                <FiRefreshCw className="animate-spin text-emerald-400" size={14} />
                                Consultando...
                            </span>
                        ) : isHealthy ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                <FiCheckCircle size={14} />
                                Pagamento Regular
                            </span>
                        ) : isIssue ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-rose-500/15 text-rose-400 border border-rose-500/40 shadow-lg shadow-rose-500/10">
                                <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
                                <FiAlertCircle size={14} />
                                Pendência de Pagamento
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                <FiAlertTriangle size={14} />
                                {statusData?.status === 'UNAVAILABLE' ? 'Não Configurado' : 'Atenção'}
                            </span>
                        )}
                    </div>
                </div>

                {/* Details Section */}
                <div className="p-3.5 bg-black/30 border border-white/5 rounded-xl space-y-2 relative z-10 text-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-slate-400">
                        <div className="flex items-center gap-2">
                            <FiClock size={13} className="text-slate-500" />
                            <span>Última verificação: <strong className="text-white">{formatCheckedAt(statusData?.checked_at)}</strong></span>
                            {statusData?.check_type && (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-slate-300 font-bold">
                                    {statusData.check_type === 'MANUAL' ? '⚡ Manual' : '⏰ Automático'}
                                </span>
                            )}
                        </div>
                        {statusData?.payment_method_status && (
                            <span className="text-slate-400">
                                Método: <strong className="text-slate-200">{statusData.payment_method_status}</strong>
                            </span>
                        )}
                    </div>
                    {statusData?.details && (
                        <p className={`text-xs font-medium leading-relaxed ${
                            isIssue ? 'text-rose-300' : isHealthy ? 'text-slate-300' : 'text-slate-400'
                        }`}>
                            {statusData.details}
                        </p>
                    )}
                </div>

                {/* Bottom Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1 relative z-10">
                    <button
                        type="button"
                        onClick={handleCheckNow}
                        disabled={isChecking || isLoading}
                        className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-emerald-950/40 flex items-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <FiRefreshCw className={isChecking ? "animate-spin" : ""} size={14} />
                        {isChecking ? "Verificando na Meta..." : "Verificar Agora (Manual)"}
                    </button>

                    <button
                        type="button"
                        onClick={handleOpenHistory}
                        className="px-4 py-2.5 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold rounded-xl transition-all border border-white/5 flex items-center gap-2"
                    >
                        <FiList size={14} className="text-slate-400" />
                        Histórico de Auditoria
                    </button>
                </div>
            </div>

            {/* Audit History Modal */}
            <WabaPaymentHistoryModal
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
                history={history}
                isLoading={isLoadingHistory}
                onRefresh={fetchHistory}
            />
        </>
    );
};

export default WabaPaymentCard;
