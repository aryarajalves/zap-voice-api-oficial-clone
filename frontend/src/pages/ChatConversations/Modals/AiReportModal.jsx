import React from 'react';
import { FiX, FiFileText } from 'react-icons/fi';
import { BsStars } from 'react-icons/bs';
import { toast } from 'react-hot-toast';

export default function AiReportModal({
    isOpen,
    onClose,
    aiReportData,
    onExportHtml
}) {
    if (!isOpen || !aiReportData) return null;

    return (
        <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
        >
            <div
                className="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header do Modal */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-white/10 bg-purple-500/10 dark:bg-purple-900/20">
                    <div className="flex items-center gap-2 font-bold text-purple-900 dark:text-purple-200 text-sm">
                        <BsStars className="text-purple-500" size={18} />
                        <span>{aiReportData.title}</span>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 transition"
                        title="Fechar modal"
                    >
                        <FiX size={18} />
                    </button>
                </div>

                {/* Corpo do Relatório com Scroll */}
                <div className="p-6 space-y-4 overflow-y-auto flex-1 font-sans">
                    {!aiReportData.has_unanswered_doubts && (
                        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
                            <span>✅ Nenhuma dúvida não respondida encontrada! Todas as perguntas foram devidamente atendidas.</span>
                        </div>
                    )}

                    <div className="bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl p-5 text-xs leading-relaxed text-gray-800 dark:text-gray-100 whitespace-pre-wrap">
                        {aiReportData.raw_report}
                    </div>
                </div>

                {/* Rodapé com Ações */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0f172a]/60">
                    <span className="text-[11px] text-gray-400">
                        Relatório gerado via OpenAI GPT
                    </span>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                navigator.clipboard.writeText(aiReportData.raw_report);
                                toast.success('Relatório copiado para a área de transferência!');
                            }}
                            className="px-4 py-2 rounded-xl border border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-300 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-white/5 transition flex items-center gap-1.5"
                        >
                            <span>📋 Copiar Texto</span>
                        </button>
                        <button
                            type="button"
                            onClick={onExportHtml}
                            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-md hover:shadow-purple-500/20"
                        >
                            <FiFileText size={14} />
                            <span>Exportar Relatório (HTML / PDF)</span>
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl border border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-300 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-white/5 transition"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
