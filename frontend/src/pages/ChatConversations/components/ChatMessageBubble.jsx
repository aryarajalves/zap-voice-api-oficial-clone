import React from 'react';
import { FiSend, FiTag, FiMaximize2, FiEdit2, FiCheck, FiTrash2, FiCornerUpLeft, FiRefreshCw } from 'react-icons/fi';
import { BsJournalText } from 'react-icons/bs';
import { getFirstName } from '../../../utils/nameFormatter';
import { renderLinkedText } from '../utils/linkifyText';
import { renderConvoMentions } from '../utils/convoMentionUtils';
import MentionTextarea from './MentionTextarea';

const getReactionsList = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.filter(r => r && r.emoji);
    if (typeof raw === 'object') {
        return Object.entries(raw).map(([sender, val]) => {
            if (typeof val === 'object' && val !== null && val.emoji) return val;
            if (typeof val === 'string' && val) return { sender, emoji: val };
            return null;
        }).filter(Boolean);
    }
    return [];
};

export default function ChatMessageBubble({
    msg,
    selectedConvo,
    allMessages = [],
    getMediaSrc,
    formatMessageTimestamp,
    editingNoteId,
    setEditingNoteId,
    editingNoteText,
    setEditingNoteText,
    isSavingNoteMsg,
    handleSaveEditedNote,
    setIsNoteModalMaximized,
    setDeleteNoteConfirmMsgId,
    setReplyingTo,
    chatInputRef,
    engine,
    highlightedMsgId
}) {
    const isSystem = msg.sender_type === 'system';
    const isMe = msg.sender_type === 'user';
    const isHighlighted = highlightedMsgId === msg.id;

    if (isSystem) {
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
        } else {
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
    }

    const isTemplate = msg.meta_data && msg.meta_data.is_template;
    const reactionList = getReactionsList(msg.meta_data?.reactions);

    return (
        <div
            id={`msg-${msg.id}`}
            data-wamid={msg.wa_message_id}
            className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${reactionList.length > 0 ? 'mb-4' : ''}`}
        >
            <div
                className={`group/msg relative max-w-lg rounded-2xl px-4 py-2.5 shadow-sm text-sm transition-all duration-300 ${
                    isHighlighted ? 'ring-2 ring-emerald-400 shadow-md z-10 ' : ''
                }${
                    isTemplate
                    ? 'bg-gradient-to-br from-[#1e1b4b] to-[#1e293b] text-gray-100 border border-indigo-500/30 rounded-tr-none'
                    : isMe
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : 'bg-white dark:bg-[#1e293b] text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-white/5 rounded-tl-none'
                }`}
            >
                {/* Barra de Reação Rápida & Reply (Hover) */}
                <div className={`absolute -top-4 ${isMe ? 'right-2' : 'left-2'} hidden group-hover/msg:flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-1 rounded-full shadow-lg z-20 transition-all scale-90 hover:scale-100`}>
                    {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => {
                        const myReaction = reactionList.find(r => r.sender !== 'contact');
                        const isSelected = myReaction?.emoji === emoji;

                        return (
                            <button
                                key={emoji}
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const targetMsgId = msg.wa_message_id || msg.wamid || msg.message_id || msg.id;
                                    engine.sendReaction(targetMsgId, isSelected ? '' : emoji);
                                }}
                                className={`hover:scale-125 transition-transform text-xs p-0.5 cursor-pointer leading-none rounded-full ${isSelected ? 'bg-blue-500/20 ring-1 ring-blue-400' : ''}`}
                                title={isSelected ? `Remover reação ${emoji}` : `Reagir com ${emoji}`}
                            >
                                {emoji}
                            </button>
                        );
                    })}
                    <div className="w-[1px] h-3 bg-gray-300 dark:bg-gray-600 mx-0.5" />
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setReplyingTo({
                                id: msg.id,
                                content: msg.content || (msg.media_url ? '[Mídia]' : ''),
                                sender_type: msg.sender_type,
                                wa_message_id: msg.wa_message_id || msg.wamid || msg.message_id || String(msg.id)
                            });
                            if (chatInputRef?.current) chatInputRef.current.focus();
                        }}
                        className="hover:scale-125 text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 transition-transform p-0.5 cursor-pointer flex items-center justify-center"
                        title="Responder a esta mensagem"
                    >
                        <FiCornerUpLeft size={13} />
                    </button>
                </div>

                {/* Citação de mensagem respondida (Quote Box) */}
                {msg.quoted_message_id && (() => {
                    const qId = String(msg.quoted_message_id);
                    const cleanQId = qId.replace('wamid.', '');
                    const quotedMsg = allMessages.find(m => {
                        if (!m) return false;
                        const mWaId = String(m.wa_message_id || '');
                        const mCleanWaId = mWaId.replace('wamid.', '');
                        const mId = String(m.id || '');
                        return mWaId === qId || mCleanWaId === cleanQId || mId === qId || mId === cleanQId;
                    });
                    const isQuotedMe = quotedMsg ? (quotedMsg.sender_type === 'user' || quotedMsg.sender_type === 'agent') : false;
                    const authorLabel = isQuotedMe ? 'Você' : (selectedConvo?.contact_name || getFirstName(selectedConvo?.phone) || 'Contato');
                    const quotedText = quotedMsg?.content || 'Mensagem citada';

                    const scrollToQuotedMsg = (e) => {
                        e.stopPropagation();
                        if (!quotedMsg) return;
                        let targetEl = document.getElementById(`msg-${quotedMsg.id}`);
                        if (!targetEl && quotedMsg.wa_message_id) {
                            targetEl = document.querySelector(`[data-wamid="${quotedMsg.wa_message_id}"]`);
                        }
                        if (targetEl) {
                            targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            const bubbleEl = targetEl.lastElementChild || targetEl;
                            bubbleEl.classList.add('ring-4', 'ring-yellow-400', 'scale-105');
                            setTimeout(() => {
                                bubbleEl.classList.remove('ring-4', 'ring-yellow-400', 'scale-105');
                            }, 1500);
                        }
                    };

                    return (
                        <div 
                            onClick={scrollToQuotedMsg}
                            className={`mb-2 p-2 rounded-lg border-l-4 text-xs font-sans select-none overflow-hidden cursor-pointer hover:opacity-90 active:scale-[0.99] transition-all ${
                                isMe
                                ? 'bg-black/20 border-white/70 text-white/90'
                                : 'bg-gray-100 dark:bg-black/30 border-blue-500 text-gray-700 dark:text-gray-300'
                            }`}
                            title="Clique para ir até a mensagem original"
                        >
                            <div className="flex items-center gap-1 font-semibold text-[11px] mb-0.5 text-blue-400 dark:text-blue-300">
                                <FiCornerUpLeft size={11} />
                                <span>{authorLabel}</span>
                            </div>
                            <p className="line-clamp-2 text-[11px] opacity-90 leading-tight">
                                {quotedText}
                            </p>
                        </div>
                    );
                })()}

                {/* Se for template, exibe badge superior exclusivo */}
                {isTemplate && (
                    <div className="flex items-center gap-1.5 text-[9px] uppercase font-bold tracking-wider text-indigo-300 mb-2 bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-500/20 w-fit">
                        <BsJournalText size={11} className="text-indigo-400" />
                        <span>WhatsApp Template: {msg.meta_data.template_name}</span>
                    </div>
                )}

                {/* Se for template e contiver mídia no cabeçalho */}
                {isTemplate && msg.meta_data.header && msg.meta_data.header.format !== 'TEXT' && (
                    <div className="mb-2 p-2 bg-black/35 rounded-lg flex flex-col gap-2 text-xs text-indigo-200 border border-white/5 overflow-hidden">
                        {msg.media_url ? (
                            <div className="w-full">
                                {msg.meta_data.header.format === 'IMAGE' && (
                                    <img 
                                        src={getMediaSrc(msg)} 
                                        alt="Template Header" 
                                        loading="lazy"
                                        className="rounded-lg max-w-full h-auto max-h-60 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                                        onClick={() => window.open(getMediaSrc(msg), '_blank')}
                                    />
                                )}
                                {msg.meta_data.header.format === 'VIDEO' && (
                                    <video 
                                        src={getMediaSrc(msg)} 
                                        controls 
                                        className="rounded-lg max-w-full max-h-60"
                                    />
                                )}
                                {msg.meta_data.header.format === 'DOCUMENT' && (
                                    <a 
                                        href={getMediaSrc(msg)} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 p-2 bg-indigo-950/60 hover:bg-indigo-900/40 text-indigo-200 rounded-lg transition max-w-full truncate"
                                        title={msg.meta_data?.filename || 'Documento'}
                                    >
                                        <span>📄 <span className="truncate">{msg.meta_data?.filename || (msg.media_url && !msg.media_url.startsWith('media_id:') && msg.media_url.includes('/') ? msg.media_url.split('/').pop().split('?')[0] : 'Baixar Documento')}</span></span>
                                    </a>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                {msg.meta_data.header.format === 'IMAGE' && <span>🖼️ Mídia de Cabeçalho: [Imagem vinculada]</span>}
                                {msg.meta_data.header.format === 'VIDEO' && <span>🎥 Mídia de Cabeçalho: [Vídeo vinculado]</span>}
                                {msg.meta_data.header.format === 'DOCUMENT' && <span>📄 Mídia de Cabeçalho: [Documento vinculado]</span>}
                            </div>
                        )}
                    </div>
                )}

                {/* Renderizador de Mídias Normais (Não-Template) */}
                {msg.media_url && !isTemplate ? (
                    <div className="space-y-1.5 font-sans">
                        {msg.message_type === 'image' && (
                            <img 
                                src={getMediaSrc(msg)} 
                                alt="Imagem" 
                                loading="lazy"
                                className="rounded-lg max-w-full h-auto max-h-60 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => window.open(getMediaSrc(msg), '_blank')}
                            />
                        )}
                        {msg.message_type === 'sticker' && (
                            <img 
                                src={getMediaSrc(msg)} 
                                alt="Sticker" 
                                loading="lazy"
                                className="w-32 h-32 object-contain"
                            />
                        )}
                        {msg.message_type === 'video' && (
                            <video 
                                src={getMediaSrc(msg)} 
                                controls 
                                className="rounded-lg max-w-full max-h-60"
                            />
                        )}
                        {(msg.message_type === 'audio' || msg.message_type === 'voice') && (
                            <audio 
                                src={getMediaSrc(msg)} 
                                controls 
                                className="max-w-full"
                            />
                        )}
                        {msg.message_type === 'document' && (
                            <a 
                                href={getMediaSrc(msg)} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-xs font-bold underline bg-gray-100 dark:bg-black/20 p-2.5 rounded-lg text-blue-600 dark:text-blue-400 max-w-full truncate"
                                title={msg.meta_data?.filename || (msg.media_url?.includes('/') ? msg.media_url.split('/').pop().split('?')[0] : 'Documento')}
                            >
                                📎 <span className="truncate">{msg.meta_data?.filename || (msg.media_url && !msg.media_url.startsWith('media_id:') && msg.media_url.includes('/') ? msg.media_url.split('/').pop().split('?')[0] : 'Baixar Documento')}</span>
                            </a>
                        )}
                        {/* Legenda opcional */}
                        {msg.content && msg.content !== "📷 Imagem recebida" && msg.content !== "📷 Imagem enviada" && msg.content !== "🎥 Vídeo recebido" && msg.content !== "🎥 Vídeo enviado" && msg.content !== "📄 Documento recebido" && msg.content !== "📄 Documento enviado" && msg.content !== "🎵 Áudio recebido" && msg.content !== "🎵 Áudio enviado" && msg.content !== "✨ Sticker recebido" && (
                            <p className="whitespace-pre-wrap leading-relaxed mt-1.5">{renderLinkedText(msg.content)}</p>
                        )}
                    </div>
                ) : msg.message_type === 'contact' ? (
                    <div className="bg-black/20 dark:bg-black/40 rounded-xl p-3 border border-white/10 flex flex-col gap-2.5 min-w-[200px] max-w-xs font-sans">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-sm shadow shrink-0">
                                {((msg.meta_data?.contact_name || msg.content || 'C').replace('👤', '').trim())[0]}
                            </div>
                            <div className="overflow-hidden min-w-0">
                                <h4 className="font-bold text-xs sm:text-sm text-gray-800 dark:text-gray-100 truncate">
                                    {msg.meta_data?.contact_name || (msg.content?.includes('\n') ? msg.content.split('\n')[0].replace('👤', '').trim() : 'Contato')}
                                </h4>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono truncate">
                                    {msg.meta_data?.contact_phone || (msg.content?.includes('\n') ? msg.content.split('\n')[1].trim() : msg.content)}
                                </p>
                            </div>
                        </div>
                        {msg.meta_data?.contact_phone && (
                            <a
                                href={`https://wa.me/${String(msg.meta_data.contact_phone).replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full text-center py-1.5 px-3 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                            >
                                <span>Conversar</span>
                            </a>
                        )}
                    </div>
                ) : isTemplate && msg.content && msg.content.startsWith("[Template:") ? (
                    <div className="space-y-1">
                        <p className="whitespace-pre-wrap leading-relaxed font-semibold text-indigo-200">
                            📢 Template enviado: {msg.meta_data?.template_name || msg.content.replace("[Template: ", "").replace("]", "")}
                        </p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 italic mt-0.5 leading-snug">
                            Sincronize os templates nas configurações para carregar o vídeo e texto desta mensagem no painel.
                        </p>
                    </div>
                ) : (
                    <p className="whitespace-pre-wrap leading-relaxed">{renderLinkedText(msg.content)}</p>
                )}
                
                {/* Se for template e contiver botões interativos */}
                {isTemplate && msg.meta_data.buttons && msg.meta_data.buttons.length > 0 && (
                    <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-2.5 border-t border-white/10">
                        {msg.meta_data.buttons.map((btnText, i) => (
                            <div key={i} className="bg-white/5 hover:bg-white/10 border border-white/10 text-white/90 text-center py-1.5 px-3 rounded-lg text-xs font-medium cursor-not-allowed select-none flex items-center justify-center gap-1.5 transition-all">
                                <span>{btnText}</span>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex justify-between items-center mt-2 gap-3">
                    <div>
                        {msg.id === engine?.lastContactMessage?.id && (
                            <button
                                onClick={() => engine?.setConfirmResendAgentflow(msg.id)}
                                title="Reenviar esta última mensagem para o Webhook de Integração (AgentFlow)"
                                className="text-[10px] text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-bold flex items-center gap-1 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full transition border border-blue-200 dark:border-blue-800/40"
                            >
                                <FiSend size={10} /> Reenviar ao AgentFlow
                            </button>
                        )}
                    </div>
                    <span className="text-[9px] opacity-75 font-medium tracking-wide">
                        {formatMessageTimestamp(msg.timestamp)}
                    </span>
                </div>

                {/* Badge de reação — dentro do div relative da bolha */}
                {reactionList.length > 0 && (
                    <div className={`absolute -bottom-3 ${isMe ? 'left-2' : 'right-2'} flex gap-0.5 z-10`}>
                        {reactionList.map((r, i) => {
                            const isMyReaction = r.sender !== 'contact';
                            return (
                                <span
                                    key={i}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (isMyReaction) {
                                            const targetMsgId = msg.wa_message_id || msg.wamid || msg.message_id || msg.id;
                                            engine.sendReaction(targetMsgId, '');
                                        }
                                    }}
                                    className={`text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-full px-1.5 py-0.5 shadow-sm leading-none flex items-center justify-center transition-transform ${isMyReaction ? 'cursor-pointer hover:scale-110 hover:bg-red-500/10 hover:border-red-400' : ''}`}
                                    title={isMyReaction ? 'Clique para remover sua reação' : 'Contato reagiu'}
                                >
                                    {r.emoji}
                                </span>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
