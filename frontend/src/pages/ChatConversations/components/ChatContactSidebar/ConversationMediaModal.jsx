import React, { useState, useEffect, useMemo } from 'react';
import { FiX, FiImage, FiFileText, FiLink, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { BsImages, BsJournalText } from 'react-icons/bs';
import { MediaGridItem, DocumentGridItem, LinkGridItem, NoteCardItem } from './MediaModalItems';
import ConfirmModal from '../../../../components/ConfirmModal';

const ITEMS_PER_PAGE = 20;

export default function ConversationMediaModal({
    isOpen,
    onClose,
    contactName,
    mediaData,
    isLoading,
    activeClientId,
    onDeleteNote
}) {
    const [activeTab, setActiveTab] = useState('media'); // 'media' | 'docs' | 'links' | 'notes'
    const [currentPage, setCurrentPage] = useState(1);
    const [noteToDelete, setNoteToDelete] = useState(null);
    const [isDeletingNote, setIsDeletingNote] = useState(false);

    const handleConfirmDeleteNote = async () => {
        if (!noteToDelete) return;
        setIsDeletingNote(true);
        try {
            if (onDeleteNote) {
                await onDeleteNote(noteToDelete.id || noteToDelete.message_id);
            }
            setNoteToDelete(null);
        } catch (err) {
            console.error("Erro ao excluir anotação:", err);
        } finally {
            setIsDeletingNote(false);
        }
    };

    // Resetar página ao mudar de aba ou quando novos dados forem carregados
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, contactName, isOpen]);

    const mediaList = useMemo(() => mediaData?.media || [], [mediaData?.media]);
    const docsList = useMemo(() => mediaData?.docs || [], [mediaData?.docs]);
    const linksList = useMemo(() => mediaData?.links || [], [mediaData?.links]);
    const notesList = useMemo(() => mediaData?.notes || [], [mediaData?.notes]);

    const totalMedia = mediaData?.total_media ?? mediaList.length;
    const totalDocs = mediaData?.total_docs ?? docsList.length;
    const totalLinks = mediaData?.total_links ?? linksList.length;
    const totalNotes = mediaData?.total_notes ?? notesList.length;

    const currentList = useMemo(() => {
        if (activeTab === 'media') return mediaList;
        if (activeTab === 'docs') return docsList;
        if (activeTab === 'links') return linksList;
        if (activeTab === 'notes') return notesList;
        return mediaList;
    }, [activeTab, mediaList, docsList, linksList, notesList]);

    const totalItems = currentList.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
    const safeCurrentPage = Math.min(currentPage, totalPages);

    const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);
    const paginatedItems = useMemo(() => {
        return currentList.slice(startIndex, endIndex);
    }, [currentList, startIndex, endIndex]);

    const formatDate = useMemo(() => {
        return (isoString) => {
            if (!isoString) return '';
            try {
                const date = new Date(isoString);
                return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            } catch {
                return '';
            }
        };
    }, []);

    if (!isOpen) return null;

    const handlePrevPage = () => {
        setCurrentPage(prev => Math.max(1, prev - 1));
    };

    const handleNextPage = () => {
        setCurrentPage(prev => Math.min(totalPages, prev + 1));
    };

    const totalAllCount = mediaData?.total_all ?? (totalMedia + totalDocs + totalLinks + totalNotes);

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-6 md:p-8 select-none">
            {/* Backdrop que cobre 100% da tela (não fecha ao clicar fora) */}
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity" />

            {/* Modal Container */}
            <div className="relative w-full max-w-4xl bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[85vh] z-10 animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#1e293b]/70">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/20">
                            <BsImages size={20} />
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-white">
                                Mídia, links e docs
                            </h3>
                            <p className="text-xs text-gray-400">
                                {contactName || 'Contato'} • {totalAllCount} itens compartilhados
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                        title="Fechar"
                    >
                        <FiX size={20} />
                    </button>
                </div>

                {/* Abas */}
                <div className="flex border-b border-white/10 bg-[#0f172a] px-6 overflow-x-auto">
                    <button
                        type="button"
                        onClick={() => setActiveTab('media')}
                        className={`flex items-center gap-2 py-3 px-4 border-b-2 text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                            activeTab === 'media'
                                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                                : 'border-transparent text-gray-400 hover:text-gray-200'
                        }`}
                    >
                        <FiImage size={16} />
                        <span>Mídia</span>
                        <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-white/10 text-gray-300">
                            {totalMedia}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('docs')}
                        className={`flex items-center gap-2 py-3 px-4 border-b-2 text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                            activeTab === 'docs'
                                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                                : 'border-transparent text-gray-400 hover:text-gray-200'
                        }`}
                    >
                        <FiFileText size={16} />
                        <span>Documentos</span>
                        <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-white/10 text-gray-300">
                            {totalDocs}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('links')}
                        className={`flex items-center gap-2 py-3 px-4 border-b-2 text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                            activeTab === 'links'
                                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                                : 'border-transparent text-gray-400 hover:text-gray-200'
                        }`}
                    >
                        <FiLink size={16} />
                        <span>Links</span>
                        <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-white/10 text-gray-300">
                            {totalLinks}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('notes')}
                        className={`flex items-center gap-2 py-3 px-4 border-b-2 text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                            activeTab === 'notes'
                                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                                : 'border-transparent text-gray-400 hover:text-gray-200'
                        }`}
                    >
                        <BsJournalText size={16} />
                        <span>Anotações</span>
                        <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-white/10 text-gray-300">
                            {totalNotes}
                        </span>
                    </button>
                </div>

                {/* Conteúdo das Abas */}
                <div className="flex-1 p-6 overflow-y-auto bg-[#0b0f19] overscroll-contain">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-3">
                            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-xs">Carregando itens...</p>
                        </div>
                    ) : (
                        <>
                            {/* ABA MÍDIA */}
                            {activeTab === 'media' && (
                                paginatedItems.length > 0 ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                        {paginatedItems.map((item) => (
                                            <MediaGridItem
                                                key={item.id}
                                                item={item}
                                                activeClientId={activeClientId}
                                                formatDate={formatDate}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2">
                                        <FiImage size={40} className="opacity-40" />
                                        <p className="text-sm font-medium">Nenhuma foto ou vídeo compartilhado</p>
                                    </div>
                                )
                            )}

                            {/* ABA DOCUMENTOS */}
                            {activeTab === 'docs' && (
                                paginatedItems.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {paginatedItems.map((doc) => (
                                            <DocumentGridItem
                                                key={doc.id}
                                                doc={doc}
                                                activeClientId={activeClientId}
                                                formatDate={formatDate}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2">
                                        <FiFileText size={40} className="opacity-40" />
                                        <p className="text-sm font-medium">Nenhum documento compartilhado</p>
                                    </div>
                                )
                            )}

                            {/* ABA LINKS */}
                            {activeTab === 'links' && (
                                paginatedItems.length > 0 ? (
                                    <div className="space-y-2.5">
                                        {paginatedItems.map((linkItem) => (
                                            <LinkGridItem
                                                key={linkItem.id}
                                                linkItem={linkItem}
                                                formatDate={formatDate}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2">
                                        <FiLink size={40} className="opacity-40" />
                                        <p className="text-sm font-medium">Nenhum link compartilhado</p>
                                    </div>
                                )
                            )}

                            {/* ABA ANOTAÇÕES */}
                            {activeTab === 'notes' && (
                                paginatedItems.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {paginatedItems.map((note) => (
                                            <NoteCardItem
                                                key={note.id}
                                                note={note}
                                                formatDate={formatDate}
                                                onDelete={onDeleteNote ? (item) => setNoteToDelete(item) : undefined}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2">
                                        <BsJournalText size={40} className="opacity-40 text-amber-400/60" />
                                        <p className="text-sm font-medium">Nenhuma anotação privada nesta conversa</p>
                                        <p className="text-xs text-gray-500">As anotações criadas no chat aparecerão aqui enquanto não forem apagadas.</p>
                                    </div>
                                )
                            )}
                        </>
                    )}
                </div>

                {/* Footer com Paginação e Fechamento */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 border-t border-white/10 bg-[#1e293b]/80">
                    <div className="flex items-center gap-3">
                        {totalItems > 0 && (
                            <span className="text-xs text-gray-400 font-medium">
                                Mostrando <strong className="text-gray-200">{startIndex + 1}</strong> a <strong className="text-gray-200">{endIndex}</strong> de <strong className="text-gray-200">{totalItems}</strong> itens
                            </span>
                        )}

                        {totalPages > 1 && (
                            <div className="flex items-center gap-1.5 ml-2">
                                <button
                                    type="button"
                                    onClick={handlePrevPage}
                                    disabled={safeCurrentPage === 1}
                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-gray-300 hover:text-white transition-all cursor-pointer"
                                    title="Página Anterior"
                                >
                                    <FiChevronLeft size={16} />
                                </button>
                                <span className="text-xs font-semibold px-2 py-0.5 bg-white/5 rounded-md text-gray-300">
                                    {safeCurrentPage} / {totalPages}
                                </span>
                                <button
                                    type="button"
                                    onClick={handleNextPage}
                                    disabled={safeCurrentPage === totalPages}
                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-gray-300 hover:text-white transition-all cursor-pointer"
                                    title="Próxima Página"
                                >
                                    <FiChevronRight size={16} />
                                </button>
                            </div>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-95"
                    >
                        Fechar
                    </button>
                </div>
            </div>

            {/* Modal de Confirmação para Deletar Anotação */}
            <ConfirmModal
                isOpen={!!noteToDelete}
                onClose={() => !isDeletingNote && setNoteToDelete(null)}
                onConfirm={handleConfirmDeleteNote}
                title="Excluir Anotação Privada"
                message="Tem certeza que deseja excluir esta anotação privada? Esta ação removerá a anotação do chat permanentemente e não poderá ser desfeita."
                confirmText={isDeletingNote ? "Excluindo..." : "Excluir"}
                cancelText="Cancelar"
                isDangerous={true}
            />
        </div>
    );
}
