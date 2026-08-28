import React, { useState, useEffect, useMemo, memo } from 'react';
import { FiX, FiImage, FiFileText, FiLink, FiDownload, FiExternalLink, FiVideo, FiMic, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { BsImages } from 'react-icons/bs';
import { resolveMediaUrl } from '../../utils/mediaUrlResolver';

const ITEMS_PER_PAGE = 20;

/**
 * Item de Mídia Otimizado com carregamento assíncrono e tratamento de erro isolado
 */
const MediaGridItem = memo(function MediaGridItem({ item, activeClientId, formatDate }) {
    const [hasError, setHasError] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    const resolvedUrl = useMemo(() => {
        return resolveMediaUrl(item.url, activeClientId);
    }, [item.url, activeClientId]);

    const formattedDate = useMemo(() => formatDate(item.timestamp), [item.timestamp, formatDate]);

    const isVideo = item.type === 'video';
    const isAudio = item.type === 'audio' || item.type === 'voice';

    return (
        <div
            className="group relative aspect-square bg-[#1e293b]/70 border border-white/10 rounded-xl overflow-hidden cursor-pointer hover:border-emerald-500/50 hover:shadow-lg transition-all transform-gpu"
            onClick={() => window.open(resolvedUrl, '_blank')}
        >
            {isVideo ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-black/40 text-white">
                    <FiVideo size={28} className="text-emerald-400 mb-1" />
                    <span className="text-[10px] bg-black/60 px-1.5 py-0.5 rounded font-mono">Vídeo</span>
                </div>
            ) : isAudio ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-black/40 text-white">
                    <FiMic size={28} className="text-amber-400 mb-1" />
                    <span className="text-[10px] bg-black/60 px-1.5 py-0.5 rounded font-mono">Áudio</span>
                </div>
            ) : hasError ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-[#1e293b] text-gray-400 p-2 text-center">
                    <FiImage size={24} className="mb-1 text-emerald-400/80" />
                    <span className="text-[10px] truncate max-w-full">{item.caption || 'Imagem'}</span>
                </div>
            ) : (
                <>
                    {!isLoaded && (
                        <div className="absolute inset-0 bg-slate-800/60 animate-pulse flex items-center justify-center">
                            <FiImage size={20} className="text-gray-500 opacity-40" />
                        </div>
                    )}
                    <img
                        src={resolvedUrl}
                        alt={item.caption || "Mídia"}
                        loading="lazy"
                        decoding="async"
                        fetchPriority="low"
                        onLoad={() => setIsLoaded(true)}
                        onError={() => setHasError(true)}
                        className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-200 ${
                            isLoaded ? 'opacity-100' : 'opacity-0'
                        }`}
                    />
                </>
            )}

            {/* Overlay ao passar mouse */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 text-white pointer-events-none">
                <p className="text-[10px] font-medium truncate">{item.caption || (isVideo ? 'Vídeo' : isAudio ? 'Áudio' : 'Imagem')}</p>
                <p className="text-[9px] text-gray-300">{formattedDate}</p>
            </div>
        </div>
    );
});

/**
 * Item de Documento Otimizado
 */
const DocumentGridItem = memo(function DocumentGridItem({ doc, activeClientId, formatDate }) {
    const resolvedUrl = useMemo(() => resolveMediaUrl(doc.url, activeClientId), [doc.url, activeClientId]);
    const formattedDate = useMemo(() => formatDate(doc.timestamp), [doc.timestamp, formatDate]);
    const fileName = doc.filename || (doc.url ? doc.url.split('/').pop().split('?')[0] : 'Documento');

    return (
        <a
            href={resolvedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3.5 bg-[#1e293b]/70 hover:bg-[#1e293b] border border-white/10 hover:border-emerald-500/40 rounded-xl transition-all group"
        >
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
                <FiFileText size={20} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-200 truncate group-hover:text-emerald-400 transition-colors">
                    {fileName}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                    {formattedDate}
                </p>
            </div>
            <FiDownload size={16} className="text-gray-400 group-hover:text-white transition-colors" />
        </a>
    );
});

/**
 * Item de Link Otimizado
 */
const LinkGridItem = memo(function LinkGridItem({ linkItem, formatDate }) {
    const formattedDate = useMemo(() => formatDate(linkItem.timestamp), [linkItem.timestamp, formatDate]);

    return (
        <a
            href={linkItem.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 p-3.5 bg-[#1e293b]/70 hover:bg-[#1e293b] border border-white/10 hover:border-emerald-500/40 rounded-xl transition-all group"
        >
            <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform shrink-0 mt-0.5">
                <FiLink size={18} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <p className="text-xs font-semibold text-blue-400 truncate group-hover:underline">
                        {linkItem.url}
                    </p>
                    <FiExternalLink size={12} className="text-gray-400 group-hover:text-blue-400 shrink-0" />
                </div>
                {linkItem.preview_text && (
                    <p className="text-xs text-gray-300 line-clamp-2 mt-1 font-sans">
                        {linkItem.preview_text}
                    </p>
                )}
                <p className="text-[10px] text-gray-500 mt-1">
                    {formattedDate}
                </p>
            </div>
        </a>
    );
});

export default function ConversationMediaModal({
    isOpen,
    onClose,
    contactName,
    mediaData,
    isLoading,
    activeClientId
}) {
    const [activeTab, setActiveTab] = useState('media'); // 'media' | 'docs' | 'links'
    const [currentPage, setCurrentPage] = useState(1);

    // Resetar página ao mudar de aba ou quando novos dados forem carregados
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, contactName, isOpen]);

    const mediaList = useMemo(() => mediaData?.media || [], [mediaData?.media]);
    const docsList = useMemo(() => mediaData?.docs || [], [mediaData?.docs]);
    const linksList = useMemo(() => mediaData?.links || [], [mediaData?.links]);

    const totalMedia = mediaData?.total_media ?? mediaList.length;
    const totalDocs = mediaData?.total_docs ?? docsList.length;
    const totalLinks = mediaData?.total_links ?? linksList.length;

    const currentList = useMemo(() => {
        if (activeTab === 'media') return mediaList;
        if (activeTab === 'docs') return docsList;
        return linksList;
    }, [activeTab, mediaList, docsList, linksList]);

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
                                {contactName || 'Contato'} • {mediaData?.total_all || (totalMedia + totalDocs + totalLinks)} itens compartilhados
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
                <div className="flex border-b border-white/10 bg-[#0f172a] px-6">
                    <button
                        type="button"
                        onClick={() => setActiveTab('media')}
                        className={`flex items-center gap-2 py-3 px-4 border-b-2 text-sm font-semibold transition-all cursor-pointer ${
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
                        className={`flex items-center gap-2 py-3 px-4 border-b-2 text-sm font-semibold transition-all cursor-pointer ${
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
                        className={`flex items-center gap-2 py-3 px-4 border-b-2 text-sm font-semibold transition-all cursor-pointer ${
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
        </div>
    );
}
