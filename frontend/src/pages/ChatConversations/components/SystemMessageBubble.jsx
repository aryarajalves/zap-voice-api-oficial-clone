import React from 'react';
import { FiTag, FiMaximize2, FiEdit2, FiCheck, FiTrash2, FiRefreshCw } from 'react-icons/fi';
import { BsJournalText } from 'react-icons/bs';
import { renderConvoMentions } from '../utils/convoMentionUtils';
import MentionTextarea from './MentionTextarea';

export default function SystemMessageBubble({
    msg,
    isHighlighted,
    editingNoteId,
    setEditingNoteId,
    editingNoteText,
    setEditingNoteText,
    isSavingNoteMsg,
    handleSaveEditedNote,
    setIsNoteModalMaximized,
    setDeleteNoteConfirmMsgId,
    formatMessageTimestamp,
    engine,
    selectedConvo
}) {
    const isPrivateNote = msg.content && msg.content.startsWith("🔒 Anotação Privada:");

    if (isPrivateNote) {
        const isEditingThisNote = editingNoteId === msg.id;
        const noteText = msg.content.replace("🔒 Anotação Privada: ", "");

        return (
            <div id={`msg-${msg.id}`} key={msg.id} className="flex justify-center my-2">
                <div className={`border rounded-xl px-4 py-2.5 shadow-sm text-xs max-w-lg w-full transition-all duration-300 ${
                    isHighlighted ? 'ring-2 ring-emerald-500 bg-amber-500/20 shadow-lg text-amber-800 dark:text-amber-300' : 'bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-300'
                }`}>
                    <div className="flex items-center justify-between font-bold mb-1.5 uppercase tracking-wider text-[10px] text-amber-600 dark:text-amber-400">
                        <div className="flex items-center gap-1.5">
                            <BsJournalText size={12} />
                            <span>Anotação Interna / Nota Privada</span>
                        </div>
                        {!isEditingThisNote && (
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditingNoteId(msg.id);
                                        setEditingNoteText(noteText);
                                    }}
                                    className="p-1 rounded hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 transition-all flex items-center gap-1 text-[10px] font-semibold"
                                    title="Editar esta anotação privada"
                                >
                                    <FiEdit2 size={11} />
                                    <span>Editar</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDeleteNoteConfirmMsgId(msg.id)}
                                    className="p-1 rounded hover:bg-red-500/20 text-red-600 dark:text-red-400 transition-all flex items-center gap-1 text-[10px] font-semibold"
                                    title="Excluir esta anotação privada"
                                >
                                    <FiTrash2 size={11} />
                                    <span>Deletar</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {isEditingThisNote ? (
                        <div className="space-y-2 mt-1">
                            <MentionTextarea
                                value={editingNoteText}
                                onChange={(e) => setEditingNoteText(e.target.value)}
                                className="w-full px-3 py-2 bg-white/10 dark:bg-black/30 border border-amber-500/30 rounded-lg text-amber-900 dark:text-amber-100 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 font-sans"
                                conversations={engine?.conversations || []}
                                activeClientId={engine?.activeClient?.id || selectedConvo?.client_id}
                                rows={3}
                                autoFocus
                            />
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsNoteModalMaximized(true)}
                                    className="px-2.5 py-1 rounded-lg border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[10px] font-semibold hover:bg-amber-500/20 transition flex items-center gap-1"
                                    title="Maximizar em um popup para digitar com mais espaço"
                                >
                                    <FiMaximize2 size={10} />
                                    <span>Maximizar</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEditingNoteId(null)}
                                    className="px-2.5 py-1 rounded-lg border border-amber-500/30 text-amber-700 dark:text-amber-400 text-[10px] font-semibold hover:bg-amber-500/10 transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    disabled={isSavingNoteMsg || !editingNoteText || !editingNoteText.trim()}
                                    onClick={() => handleSaveEditedNote(msg.id)}
                                    className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-semibold transition flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSavingNoteMsg ? <FiRefreshCw className="animate-spin" size={10} /> : <FiCheck size={11} />}
                                    <span>Salvar</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="whitespace-pre-wrap leading-relaxed font-sans">
                                {renderConvoMentions(noteText, engine?.openConversationById)}
                            </div>
                            <div className="flex justify-end mt-1 text-[9px] opacity-75 font-medium tracking-wide">
                                {formatMessageTimestamp(msg.timestamp)}
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    }

    const isLabelNotice = msg.content && (msg.content.includes("Etiqueta") || msg.content.includes("etiqueta") || msg.content.includes("Marcador") || msg.content.includes("marcador"));
    return (
        <div key={msg.id} className="flex justify-center my-2 animate-in fade-in duration-300">
            <div className={`border rounded-lg px-3.5 py-1.5 shadow-sm text-[11px] max-w-md text-center flex items-center justify-center gap-2 ${
                isLabelNotice 
                ? 'bg-blue-500/10 border-blue-500/25 text-blue-800 dark:text-blue-300' 
                : 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/5 text-gray-600 dark:text-gray-400'
            }`}>
                {isLabelNotice && <FiTag size={13} className="text-blue-500 shrink-0" />}
                <div>
                    <p className="font-medium font-sans leading-relaxed">{msg.content}</p>
                    <div className="text-[9px] opacity-60 mt-0.5">
                        {formatMessageTimestamp(msg.timestamp)}
                    </div>
                </div>
            </div>
        </div>
    );
}
