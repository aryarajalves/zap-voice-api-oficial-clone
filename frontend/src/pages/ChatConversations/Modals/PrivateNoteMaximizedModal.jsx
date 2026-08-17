import React from 'react';
import { FiX, FiRefreshCw, FiCheck } from 'react-icons/fi';
import { BsJournalText } from 'react-icons/bs';

export default function PrivateNoteMaximizedModal({
    isOpen,
    onClose,
    contactName,
    editingNoteText,
    setEditingNoteText,
    onSave,
    isSaving
}) {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
        >
            <div
                className="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0f172a]/60">
                    <div className="flex items-center gap-2 font-bold text-gray-800 dark:text-white text-sm">
                        <BsJournalText className="text-amber-500" size={18} />
                        <span>Anotação Privada — {contactName}</span>
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

                <div className="p-6 space-y-3">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Digite o conteúdo da anotação privada abaixo:
                    </label>
                    <textarea
                        value={editingNoteText}
                        onChange={(e) => setEditingNoteText(e.target.value)}
                        placeholder="Escreva os detalhes da anotação privada..."
                        className="w-full h-72 px-4 py-3 bg-gray-50 dark:bg-black/30 text-gray-800 dark:text-gray-100 text-xs rounded-xl border border-gray-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-amber-500 font-sans resize-y leading-relaxed"
                        autoFocus
                    />
                    <div className="flex justify-between items-center text-[11px] text-gray-400 font-medium">
                        <span>{editingNoteText ? editingNoteText.length : 0} caracteres digitados</span>
                        <span>🔒 Anotação visível apenas para sua equipe</span>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0f172a]/60">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl border border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-300 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-white/5 transition"
                    >
                        Fechar
                    </button>
                    <button
                        type="button"
                        disabled={isSaving}
                        onClick={onSave}
                        className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-semibold transition-all flex items-center gap-2 shadow-md"
                    >
                        {isSaving ? <FiRefreshCw className="animate-spin" size={14} /> : <FiCheck size={14} />}
                        <span>Salvar Anotação</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
