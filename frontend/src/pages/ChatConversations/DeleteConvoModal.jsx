import React, { useState, useEffect } from 'react';
import { FiTrash2, FiRefreshCw, FiCheckCircle, FiAlertTriangle } from 'react-icons/fi';

export default function DeleteConvoModal({
    isOpen,
    isBulk,
    selectedCount,
    selectAllPages,
    contactName,
    onClose,
    onConfirm
}) {
    const [status, setStatus] = useState('idle'); // 'idle' | 'deleting' | 'success' | 'error'
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (isOpen) {
            setStatus('idle');
            setErrorMessage('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    let defaultTitle = 'Deletar conversa?';
    let defaultText = 'Esta ação é irreversível. Todas as mensagens da conversa serão apagadas permanentemente.';

    if (isBulk) {
        if (selectAllPages) {
            defaultTitle = `Deletar todas as ${selectedCount} conversas?`;
            defaultText = 'Esta ação é irreversível. Todas as mensagens de todas as conversas de todas as páginas filtradas serão apagadas permanentemente.';
        } else {
            defaultTitle = `Deletar ${selectedCount} conversa(s)?`;
            defaultText = 'Esta ação é irreversível. Todas as mensagens da(s) conversa(s) selecionada(s) serão apagadas permanentemente.';
        }
    } else if (contactName) {
        defaultTitle = `Deletar conversa de ${contactName}?`;
    }

    const handleConfirmClick = async () => {
        setStatus('deleting');
        try {
            const success = await onConfirm();
            if (success === false) {
                setStatus('error');
                setErrorMessage('Não foi possível excluir a conversa. Tente novamente.');
            } else {
                setStatus('success');
            }
        } catch (err) {
            setStatus('error');
            setErrorMessage(err?.message || 'Ocorreu um erro ao excluir.');
        }
    };

    return (
        <div 
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none"
            data-testid="delete-convo-modal"
            onClick={(e) => e.stopPropagation()}
        >
            <div 
                className="bg-[#1e293b] border border-white/10 rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center text-white relative overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Efeito Glow Dinâmico no Topo */}
                <div className={`absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-24 rounded-full blur-3xl opacity-30 pointer-events-none ${
                    status === 'success' ? 'bg-emerald-500' : status === 'deleting' ? 'bg-amber-500' : 'bg-red-500'
                }`} />

                {/* 1. Estado: Confirmação Inicial (Idle) */}
                {status === 'idle' && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                        <div className="mx-auto w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                            <FiTrash2 size={26} />
                        </div>

                        <div>
                            <h3 className="text-base font-bold text-white mb-1.5 leading-snug">
                                {defaultTitle}
                            </h3>
                            <p className="text-xs text-gray-400 leading-relaxed max-w-xs mx-auto">
                                {defaultText}
                            </p>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-300 text-xs font-semibold hover:bg-white/5 transition active:scale-98 cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmClick}
                                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/30 transition active:scale-98 cursor-pointer"
                            >
                                Deletar
                            </button>
                        </div>
                    </div>
                )}

                {/* 2. Estado: Deletando (Loading) */}
                {status === 'deleting' && (
                    <div className="space-y-4 animate-in fade-in duration-300 py-1" data-testid="delete-loading-state">
                        <div className="relative mx-auto w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                            <FiTrash2 size={24} className="opacity-40" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <FiRefreshCw className="animate-spin text-amber-400" size={24} />
                            </div>
                        </div>

                        <div>
                            <h3 className="text-base font-bold text-white mb-1">
                                {isBulk ? 'Deletando conversas...' : 'Deletando contato...'}
                            </h3>
                            <p className="text-xs text-gray-400 leading-relaxed max-w-xs mx-auto">
                                Aguarde enquanto os dados e mensagens estão sendo removidos permanentemente.
                            </p>
                        </div>

                        {/* Barra de Progresso */}
                        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-amber-500 via-red-500 to-amber-500 animate-pulse w-full rounded-full" />
                        </div>

                        <p className="text-[11px] text-gray-500 italic">
                            Processando remoção segura...
                        </p>
                    </div>
                )}

                {/* 3. Estado: Concluído com Sucesso */}
                {status === 'success' && (
                    <div className="space-y-4 animate-in zoom-in-95 duration-300 py-1" data-testid="delete-success-state">
                        <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.25)]">
                            <FiCheckCircle size={28} />
                        </div>

                        <div>
                            <h3 className="text-base font-bold text-white mb-1">
                                {isBulk ? 'Conversas deletadas com sucesso!' : 'Contato deletado com sucesso!'}
                            </h3>
                            <p className="text-xs text-gray-400 leading-relaxed max-w-xs mx-auto">
                                O contato e todo o histórico de mensagens foram excluídos permanentemente.
                            </p>
                        </div>

                        <div className="pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-600/30 transition active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                            >
                                <FiCheckCircle size={15} />
                                <span>Fechar</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* 4. Estado: Erro */}
                {status === 'error' && (
                    <div className="space-y-4 animate-in zoom-in-95 duration-300 py-1" data-testid="delete-error-state">
                        <div className="mx-auto w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.25)]">
                            <FiAlertTriangle size={28} />
                        </div>

                        <div>
                            <h3 className="text-base font-bold text-white mb-1">
                                Falha ao deletar
                            </h3>
                            <p className="text-xs text-red-400 leading-relaxed max-w-xs mx-auto">
                                {errorMessage || 'Ocorreu um erro ao excluir a conversa.'}
                            </p>
                        </div>

                        <div className="pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="w-full py-2.5 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-bold text-xs transition active:scale-98 cursor-pointer"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
