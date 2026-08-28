import React from 'react';
import { FiFileText, FiCheckCircle, FiRefreshCw, FiAlertTriangle } from 'react-icons/fi';

/**
 * Modal de Exportação de Conversa
 * Exibe feedback visual centralizado durante a exportação e aviso detalhado de conclusão.
 */
export default function ExportConversationModal({
    isOpen,
    status = 'exporting', // 'exporting' | 'completed' | 'error'
    contactName = '',
    phone = '',
    totalMessages = 0,
    fileName = '',
    errorMessage = '',
    onClose
}) {
    if (!isOpen) return null;

    const isExporting = status === 'exporting';
    const isCompleted = status === 'completed';
    const isError = status === 'error';

    return (
        <div 
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none"
            data-testid="export-conversation-modal"
        >
            <div 
                className="bg-[#1e293b] border border-white/10 rounded-2xl shadow-2xl max-w-md w-full p-6 text-center text-white relative overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Efeito Glow no Topo */}
                <div className={`absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-24 rounded-full blur-3xl opacity-30 pointer-events-none ${
                    isCompleted ? 'bg-emerald-500' : isError ? 'bg-red-500' : 'bg-blue-500'
                }`} />

                {/* 1. Estado: Processando / Exportando */}
                {isExporting && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        <div className="relative mx-auto w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-[0_0_25px_rgba(59,130,246,0.2)]">
                            <FiFileText size={28} className="animate-pulse" />
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-blue-600 border-2 border-[#1e293b] flex items-center justify-center shadow">
                                <FiRefreshCw className="animate-spin text-white" size={11} />
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-bold tracking-tight text-white mb-1">
                                Exportando Conversa...
                            </h3>
                            <p className="text-xs text-gray-400 leading-relaxed max-w-xs mx-auto">
                                Processando histórico, agrupando datas, mídias e formatando documento para HTML / PDF.
                            </p>
                        </div>

                        {/* Card Informativo do Contato */}
                        <div className="bg-white/5 border border-white/5 rounded-xl p-3 text-left space-y-1 text-xs">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Contato:</span>
                                <span className="font-semibold text-gray-200 truncate max-w-[200px]">{contactName || 'Contato'}</span>
                            </div>
                            {phone && (
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400">WhatsApp:</span>
                                    <span className="font-mono text-gray-300">{phone}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Mensagens:</span>
                                <span className="font-bold text-blue-400">{totalMessages} carregadas</span>
                            </div>
                        </div>

                        {/* Barra de Progresso */}
                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 animate-pulse w-full rounded-full" />
                        </div>

                        <p className="text-[11px] text-gray-500 italic">
                            Por favor, aguarde alguns instantes...
                        </p>
                    </div>
                )}

                {/* 2. Estado: Concluído com Sucesso */}
                {isCompleted && (
                    <div className="space-y-4 animate-in zoom-in-95 duration-300">
                        <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.25)]">
                            <FiCheckCircle size={32} />
                        </div>

                        <div>
                            <h3 className="text-lg font-bold tracking-tight text-white mb-1">
                                Conversa Exportada com Sucesso!
                            </h3>
                            <p className="text-xs text-gray-400 leading-relaxed max-w-xs mx-auto">
                                O arquivo do histórico completo foi gerado e o download já começou no seu navegador.
                            </p>
                        </div>

                        {/* Resumo do Arquivo */}
                        <div className="bg-white/5 border border-emerald-500/20 rounded-xl p-3 text-left space-y-1.5 text-xs">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-400">Arquivo:</span>
                                <span className="font-mono text-[11px] text-emerald-300 truncate max-w-[220px]" title={fileName}>
                                    {fileName || 'historico_conversa.html'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-400">Total Mensagens:</span>
                                <span className="font-bold text-gray-200">{totalMessages} mensagens</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-400">Formato:</span>
                                <span className="font-semibold text-blue-400">HTML Interativo / PDF</span>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
                        >
                            <FiCheckCircle size={16} />
                            <span>Concluir</span>
                        </button>
                    </div>
                )}

                {/* 3. Estado: Erro */}
                {isError && (
                    <div className="space-y-4 animate-in zoom-in-95 duration-300">
                        <div className="mx-auto w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shadow-[0_0_25px_rgba(239,68,68,0.25)]">
                            <FiAlertTriangle size={32} />
                        </div>

                        <div>
                            <h3 className="text-lg font-bold tracking-tight text-white mb-1">
                                Falha ao Exportar
                            </h3>
                            <p className="text-xs text-red-400 leading-relaxed max-w-xs mx-auto">
                                {errorMessage || 'Ocorreu um erro ao compilar o histórico da conversa.'}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full py-2.5 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-bold text-sm transition-all cursor-pointer"
                        >
                            Fechar
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
