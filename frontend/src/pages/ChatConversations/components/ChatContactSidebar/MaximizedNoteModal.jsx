import React from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiRefreshCw } from 'react-icons/fi';
import { BsJournalText } from 'react-icons/bs';
import MentionTextarea from '../MentionTextarea';

export default function MaximizedNoteModal({
    isOpen,
    onClose,
    contactName,
    phone,
    privateNote,
    setPrivateNote,
    isSavingNote,
    handleSaveNote,
    conversations = [],
    activeClientId
}) {
    if (!isOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[99999] flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
        >
            <div
                className="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header do Modal */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0f172a]/60">
                    <div className="flex items-center gap-2 font-bold text-gray-800 dark:text-white text-sm">
                        <BsJournalText className="text-amber-500" size={18} />
                        <span>Anotação Privada — {contactName || phone}</span>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 transition cursor-pointer"
                        title="Fechar modal"
                    >
                        <FiX size={18} />
                    </button>
                </div>

                {/* Corpo do Modal com Textarea Ampliado */}
                <div className="p-6 space-y-3">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Digite os detalhes da anotação privada abaixo:
                    </label>
                    <MentionTextarea
                        value={privateNote}
                        onChange={(e) => setPrivateNote(e.target.value)}
                        placeholder="Escreva detalhes importantes sobre este cliente, instruções para a IA, regras de atendimento ou anotações internas... Use @ para vincular conversas"
                        className="w-full h-72 px-4 py-3 bg-gray-50 dark:bg-black/30 text-gray-800 dark:text-gray-100 text-xs rounded-xl border border-gray-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 font-sans resize-y leading-relaxed"
                        conversations={conversations}
                        activeClientId={activeClientId}
                        rows={10}
                        autoFocus
                    />
                    <div className="flex justify-between items-center text-[11px] text-gray-400 font-medium">
                        <span>{privateNote ? privateNote.length : 0} caracteres digitados</span>
                        <span>🔒 Visível apenas para a sua equipe</span>
                    </div>
                </div>

                {/* Rodapé do Modal */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0f172a]/60">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl border border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-300 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-white/5 transition cursor-pointer"
                    >
                        Fechar
                    </button>
                    <button
                        type="button"
                        disabled={isSavingNote || !privateNote || !privateNote.trim()}
                        onClick={async () => {
                            if (!privateNote || !privateNote.trim()) return;
                            await handleSaveNote();
                            onClose();
                        }}
                        className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold transition-all flex items-center gap-2 shadow-md hover:shadow-blue-500/20 disabled:cursor-not-allowed cursor-pointer"
                    >
                        {isSavingNote ? <FiRefreshCw className="animate-spin" size={14} /> : null}
                        <span>Salvar Anotação</span>
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
