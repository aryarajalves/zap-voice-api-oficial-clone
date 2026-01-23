import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import useScrollLock from '../hooks/useScrollLock';
import { API_URL } from '../config';
import { fetchWithAuth } from '../AuthContext';
import { useClient } from '../contexts/ClientContext';

const CancelBulkModal = ({ isOpen, onClose, trigger, onConfirmCancel }) => {
    const { activeClient } = useClient();
    useScrollLock(isOpen);

    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState(null);
    const [copied, setCopied] = useState(false);

    // Reset state when modal opens or trigger changes
    React.useEffect(() => {
        if (isOpen) {
            setReportData(null);
            setLoading(false);
            setCopied(false);
        }
    }, [isOpen, trigger?.id]);

    // Inline styles
    const styles = {
        overlay: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        },
        modal: {
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            userSelect: 'none',
            pointerEvents: 'auto',
            cursor: 'default'
        },
        progressBar: {
            width: '100%',
            height: '8px',
            backgroundColor: '#e5e7eb',
            borderRadius: '4px',
            overflow: 'hidden',
            marginTop: '8px'
        },
        progressFill: {
            height: '100%',
            backgroundColor: '#3b82f6',
            transition: 'width 0.3s ease'
        }
    };

    if (!isOpen) return null;

    const handleCancel = async () => {
        if (!trigger?.id) {
            toast.error('O ID do disparo ainda não foi gerado. Aguarde um momento ou recarregue a página se o problema persistir.');
            return;
        }

        setLoading(true);
        try {
            // Pass current progress to the backend so the report is accurate 
            // for frontend-driven immediate sends.
            const cancelPayload = {
                processed: trigger?.progress?.processed_contacts || [],
                pending: trigger?.progress?.pending_contacts || [],
                sent: trigger?.progress?.sent || 0,
                failed: trigger?.progress?.failed || 0
            };

            const response = await fetchWithAuth(`${API_URL}/triggers/${trigger.id}/cancel-with-report`, {
                method: 'POST',
                body: JSON.stringify(cancelPayload)
            }, activeClient?.id);


            if (response.ok) {
                const data = await response.json();
                setReportData(data);
                if (onConfirmCancel) onConfirmCancel(data);
            } else {
                // Improved error handling with detailed message + CRASH PROTECTION
                let errorMessage = 'Erro ao cancelar disparo';
                try {
                    const errorData = await response.json();
                    // FastAPI 422 errors return a 'detail' array or object. 
                    // Stringify if not a string to avoid React render crash.
                    if (typeof errorData.detail === 'object') {
                        errorMessage = JSON.stringify(errorData.detail);
                    } else {
                        errorMessage = errorData.detail || errorMessage;
                    }
                } catch (e) {
                    errorMessage = `Erro ${response.status}: ${response.statusText}`;
                }

                toast.error(errorMessage, {
                    duration: 5000,
                    style: {
                        background: '#fee2e2',
                        color: '#991b1b',
                        border: '1px solid #fca5a5',
                        fontWeight: '500'
                    },
                    icon: '❌'
                });
            }
        } catch (error) {
            console.error('Error cancelling:', error);
            toast.error('Erro de conexão ao cancelar disparo', {
                duration: 5000,
                style: {
                    background: '#fee2e2',
                    color: '#991b1b',
                    fontWeight: '500'
                }
            });
        } finally {
            setLoading(false);
        }
    };

    const copyPendingContacts = () => {
        if (!reportData?.contacts?.pending) return;

        const text = reportData.contacts.pending.join('\n');
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toast.success('Lista de contatos copiada!');
        });
    };

    // If not yet cancelled, show confirmation
    if (!reportData) {
        const progress = trigger.progress || {};
        const total = progress.total || 0;
        const sent = progress.sent || 0;
        const pending = Math.max(0, total - sent);

        return (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
                <div
                    className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all animate-in zoom-in-95 duration-200"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-full">
                                <span className="text-2xl text-amber-600 dark:text-amber-400">⚠️</span>
                            </div>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Cancelar Disparo?</h2>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Progresso Atual</span>
                                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{sent}/{total} ({Math.round((sent / total) * 100) || 0}%)</span>
                                </div>
                                <div className="w-full h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-out"
                                        style={{ width: `${(sent / total) * 100}%` }}
                                    ></div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800/30">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-emerald-600 dark:text-emerald-400 text-lg">✅</span>
                                        <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-200 uppercase tracking-wider">Enviados</span>
                                    </div>
                                    <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{sent}</div>
                                </div>
                                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-800/30">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-amber-600 dark:text-amber-400 text-lg">⏳</span>
                                        <span className="text-xs font-semibold text-amber-800 dark:text-amber-200 uppercase tracking-wider">Pendentes</span>
                                    </div>
                                    <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">{pending}</div>
                                </div>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-200 dark:border-gray-600">
                                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed italic">
                                    Ao cancelar, você poderá copiar a lista de contatos pendentes
                                    para criar um novo disparo mais tarde.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-200 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm active:scale-95 disabled:opacity-50"
                            disabled={loading}
                        >
                            Continuar Disparo
                        </button>
                        <button
                            onClick={handleCancel}
                            className="flex-1 px-4 py-3 bg-red-600 rounded-xl text-white font-semibold hover:bg-red-700 transition-all shadow-md shadow-red-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>Cancelando...</span>
                                </>
                            ) : (
                                <>
                                    <span className="text-lg">❌</span>
                                    <span>Cancelar Disparo</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // After cancellation, show report
    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-full">
                            <span className="text-2xl text-emerald-600 dark:text-emerald-400">✅</span>
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Disparo Cancelado</h2>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                            <p className="text-emerald-800 font-medium text-center">{reportData.message}</p>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 text-center">
                                <div className="text-xs font-semibold text-emerald-800 uppercase mb-1">Enviados</div>
                                <div className="text-xl font-bold text-emerald-700">{reportData.progress.sent}</div>
                            </div>
                            <div className="bg-red-50 p-3 rounded-lg border border-red-100 text-center">
                                <div className="text-xs font-semibold text-red-800 uppercase mb-1">Erros</div>
                                <div className="text-xl font-bold text-red-700">{reportData.progress.failed}</div>
                            </div>
                            <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 text-center">
                                <div className="text-xs font-semibold text-amber-800 uppercase mb-1">Pendentes</div>
                                <div className="text-xl font-bold text-amber-700">{reportData.progress.pending}</div>
                            </div>
                        </div>

                        {reportData.contacts.pending && reportData.contacts.pending.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                    <span>📋</span> Contatos Pendentes ({reportData.contacts.pending.length})
                                </h3>
                                <div className="relative group">
                                    <textarea
                                        readOnly
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-mono text-gray-600 focus:ring-0 resize-none transition-all scrollbar-hide"
                                        value={reportData.contacts.pending.join('\n')}
                                        rows={Math.min(reportData.contacts.pending.length, 6)}
                                    />
                                    <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-gray-50 to-transparent pointer-events-none rounded-b-xl"></div>
                                </div>

                                <button
                                    onClick={copyPendingContacts}
                                    className={`w-full py-3 rounded-xl font-bold transition-all shadow-sm flex items-center justify-center gap-2 ${copied
                                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                        : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md active:scale-[0.98]'
                                        }`}
                                >
                                    {copied ? (
                                        <><span>✅</span><span>Copiado com Sucesso!</span></>
                                    ) : (
                                        <><span>📋</span><span>Copiar Lista Pendente</span></>
                                    )}
                                </button>
                                <p className="text-[11px] text-gray-400 text-center">
                                    Dica: Cole esta lista ao criar um novo disparo para continuar de onde parou.
                                </p>
                            </div>
                        )}

                        {reportData.contacts.sent && reportData.contacts.sent.length > 0 && (
                            <details className="group border border-gray-100 rounded-lg">
                                <summary className="p-3 text-sm font-medium text-gray-600 cursor-pointer list-none flex justify-between items-center hover:bg-gray-50">
                                    <span>✅ Ver contatos que receberam</span>
                                    <span className="transition-transform group-open:rotate-180">▼</span>
                                </summary>
                                <div className="p-3 text-xs text-gray-500 bg-gray-50 border-t border-gray-100 break-words leading-relaxed max-h-24 overflow-y-auto">
                                    {reportData.contacts.sent.join(', ')}
                                </div>
                            </details>
                        )}
                    </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4">
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-200 font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm active:scale-[0.98]"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CancelBulkModal;
