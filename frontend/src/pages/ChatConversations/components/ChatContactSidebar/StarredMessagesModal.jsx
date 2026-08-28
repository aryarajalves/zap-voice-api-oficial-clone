import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiRefreshCw, FiExternalLink, FiTrash2, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { BsStarFill } from 'react-icons/bs';
import { fetchWithAuth } from '../../../../AuthContext';
import { API_URL } from '../../../../config';
import { renderLinkedText } from '../../utils/linkifyText';

export default function StarredMessagesModal({
    isOpen,
    onClose,
    convoId,
    activeClientId,
    contactName,
    onSelectMessage,
    onToggleStarMessage,
    formatMessageTimestamp
}) {
    const [starredMessages, setStarredMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const perPage = 20;

    const [unstarConfirmMsg, setUnstarConfirmMsg] = useState(null);
    const [isUnstarring, setIsUnstarring] = useState(false);

    const handleConfirmUnstar = async () => {
        if (!unstarConfirmMsg) return;
        setIsUnstarring(true);
        try {
            if (onToggleStarMessage) {
                await onToggleStarMessage(unstarConfirmMsg);
            }
            setStarredMessages(prev => prev.filter(m => m.id !== unstarConfirmMsg.id));
            setTotal(prev => Math.max(0, prev - 1));
            setUnstarConfirmMsg(null);
        } catch (err) {
            console.error("Erro ao remover favorito:", err);
        } finally {
            setIsUnstarring(false);
        }
    };

    const loadStarred = useCallback(async (targetPage = 1) => {
        if (!convoId || !activeClientId) return;
        setIsLoading(true);
        try {
            const res = await fetchWithAuth(
                `${API_URL}/chat/conversations/${convoId}/starred-messages?page=${targetPage}&limit=${perPage}`,
                {},
                activeClientId
            );
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    setStarredMessages(data);
                    setTotal(data.length);
                    setTotalPages(Math.max(1, Math.ceil(data.length / perPage)));
                    setPage(targetPage);
                } else {
                    setStarredMessages(data.items || []);
                    setTotal(data.total || 0);
                    setTotalPages(data.pages || 1);
                    setPage(data.page || targetPage);
                }
            }
        } catch (err) {
            console.error("Erro ao carregar mensagens favoritas:", err);
        } finally {
            setIsLoading(false);
        }
    }, [convoId, activeClientId]);

    useEffect(() => {
        if (isOpen && convoId) {
            setPage(1);
            loadStarred(1);
        }
    }, [isOpen, convoId, loadStarred]);

    if (!isOpen) return null;

    const startIdx = total === 0 ? 0 : (page - 1) * perPage + 1;
    const endIdx = Math.min(page * perPage, total);

    const modalContent = (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md select-none">
            <div 
                onClick={(e) => e.stopPropagation()}
                data-testid="starred-messages-modal"
                className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[85vh] text-gray-800 dark:text-gray-100 animate-in fade-in zoom-in-95 duration-200"
            >
                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between bg-gray-50/80 dark:bg-black/40">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-amber-500/15 text-amber-500">
                            <BsStarFill size={18} />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm text-gray-800 dark:text-white">
                                Mensagens Favoritas
                            </h3>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                {contactName || 'Conversa'} • {total} {total === 1 ? 'mensagem favoritada' : 'mensagens favoritadas'}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition cursor-pointer"
                        title="Fechar"
                    >
                        <FiX size={18} />
                    </button>
                </div>

                {/* Lista de Mensagens */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {isLoading ? (
                        <div className="py-12 flex flex-col items-center justify-center text-gray-400">
                            <FiRefreshCw className="animate-spin text-amber-500 mb-2" size={24} />
                            <span className="text-xs">Carregando mensagens favoritas...</span>
                        </div>
                    ) : starredMessages.length === 0 ? (
                        <div className="py-12 flex flex-col items-center justify-center text-center text-gray-400 dark:text-gray-500">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400 mb-3">
                                <BsStarFill size={22} />
                            </div>
                            <h4 className="font-semibold text-xs text-gray-700 dark:text-gray-300">
                                Nenhuma mensagem favoritada
                            </h4>
                            <p className="text-[11px] text-gray-500 mt-1 max-w-xs">
                                Clique com o botão direito em uma mensagem e escolha "Favoritar" para guardá-la aqui.
                            </p>
                        </div>
                    ) : (
                        starredMessages.map((msg) => {
                            const isMe = msg.sender_type === 'user' || msg.sender_type === 'agent';
                            const isSystem = msg.sender_type === 'system';
                            const senderLabel = isMe ? 'Você' : isSystem ? 'Anotação Interna' : (contactName || 'Contato');

                            return (
                                <div
                                    key={msg.id}
                                    className="p-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 hover:border-amber-500/40 transition-all flex flex-col gap-2 group"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className={`text-[10px] font-bold uppercase tracking-wider ${
                                            isMe ? 'text-blue-500' : isSystem ? 'text-amber-500' : 'text-emerald-500'
                                        }`}>
                                            {senderLabel}
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                            {msg.timestamp && (
                                                <span className="text-[10px] text-gray-400">
                                                    {formatMessageTimestamp ? formatMessageTimestamp(msg.timestamp) : new Date(msg.timestamp).toLocaleTimeString()}
                                                </span>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => setUnstarConfirmMsg(msg)}
                                                className="p-1 rounded text-amber-500 hover:text-red-500 hover:bg-red-500/10 transition cursor-pointer"
                                                title="Remover dos favoritos"
                                            >
                                                <FiTrash2 size={13} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                                        {msg.content ? renderLinkedText(msg.content) : (
                                            <span className="italic text-gray-400">[Mídia ou anexo]</span>
                                        )}
                                    </div>

                                    <div className="pt-1 flex justify-end">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onSelectMessage?.(msg.id);
                                                onClose();
                                            }}
                                            className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer"
                                        >
                                            <FiExternalLink size={12} />
                                            <span>Ir para mensagem</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer com Paginação */}
                <div className="p-3 border-t border-gray-200 dark:border-white/10 bg-gray-50/80 dark:bg-black/40 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        {total > 0 && (
                            <>
                                <span>{startIdx}-{endIdx} de {total}</span>
                                {totalPages > 1 && (
                                    <span className="text-[11px] text-gray-400">• Pág. {page}/{totalPages}</span>
                                )}
                            </>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {totalPages > 1 && (
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (page > 1) {
                                            const newPage = page - 1;
                                            setPage(newPage);
                                            loadStarred(newPage);
                                        }
                                    }}
                                    disabled={page <= 1 || isLoading}
                                    className="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1 cursor-pointer"
                                    title="Página Anterior"
                                >
                                    <FiChevronLeft size={13} />
                                    <span>Ant.</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (page < totalPages) {
                                            const newPage = page + 1;
                                            setPage(newPage);
                                            loadStarred(newPage);
                                        }
                                    }}
                                    disabled={page >= totalPages || isLoading}
                                    className="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1 cursor-pointer"
                                    title="Próxima Página"
                                >
                                    <span>Próx.</span>
                                    <FiChevronRight size={13} />
                                </button>
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-1.5 rounded-xl border border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-300 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-white/10 transition cursor-pointer"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            </div>

            {/* Popup de Confirmação de Remoção de Favorito */}
            {unstarConfirmMsg && (
                <div 
                    data-testid="unstar-confirm-dialog"
                    className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none"
                >
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col p-5 text-gray-800 dark:text-gray-100 animate-in fade-in zoom-in-95 duration-200"
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
                                <FiTrash2 size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm text-gray-800 dark:text-white">
                                    Remover dos Favoritos?
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Esta mensagem deixará de aparecer na lista de favoritos.
                                </p>
                            </div>
                        </div>

                        {unstarConfirmMsg.content && (
                            <div className="p-2.5 my-2 rounded-xl bg-gray-50 dark:bg-black/30 border border-gray-100 dark:border-white/5 text-xs text-gray-600 dark:text-gray-300 italic line-clamp-2">
                                "{unstarConfirmMsg.content}"
                            </div>
                        )}

                        <div className="flex items-center justify-end gap-2.5 mt-3 pt-3 border-t border-gray-100 dark:border-white/10">
                            <button
                                type="button"
                                disabled={isUnstarring}
                                onClick={() => setUnstarConfirmMsg(null)}
                                className="px-3.5 py-1.5 rounded-xl border border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-300 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-50 transition cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                disabled={isUnstarring}
                                onClick={handleConfirmUnstar}
                                className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold disabled:opacity-50 transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-red-500/20"
                            >
                                {isUnstarring ? (
                                    <>
                                        <FiRefreshCw className="animate-spin" size={12} />
                                        <span>Removendo...</span>
                                    </>
                                ) : (
                                    <span>Sim, Remover</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
