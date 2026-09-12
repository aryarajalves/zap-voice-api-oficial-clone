import React, { useState, useMemo, memo } from 'react';
import { FiImage, FiFileText, FiLink, FiDownload, FiExternalLink, FiVideo, FiMic, FiCopy, FiCheck, FiTrash2 } from 'react-icons/fi';
import { BsJournalText } from 'react-icons/bs';
import { toast } from 'react-hot-toast';
import { resolveMediaUrl } from '../../utils/mediaUrlResolver';

/**
 * Item de Mídia Otimizado com carregamento assíncrono e tratamento de erro isolado
 */
export const MediaGridItem = memo(function MediaGridItem({ item, activeClientId, formatDate }) {
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
export const DocumentGridItem = memo(function DocumentGridItem({ doc, activeClientId, formatDate }) {
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
export const LinkGridItem = memo(function LinkGridItem({ linkItem, formatDate }) {
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

/**
 * Item de Anotação Privada Otimizado
 */
export const NoteCardItem = memo(function NoteCardItem({ note, formatDate, onDelete }) {
    const [copied, setCopied] = useState(false);
    const formattedDate = useMemo(() => formatDate(note.timestamp), [note.timestamp, formatDate]);

    const handleCopy = (e) => {
        e.stopPropagation();
        if (note.content) {
            navigator.clipboard.writeText(note.content);
            setCopied(true);
            toast.success('Anotação copiada para a área de transferência!');
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="p-4 bg-[#1e293b]/70 hover:bg-[#1e293b] border border-amber-500/20 hover:border-amber-500/50 rounded-xl transition-all group flex flex-col justify-between gap-3 shadow-sm">
            <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                        <BsJournalText size={15} />
                    </div>
                    <span className="text-[11px] font-bold text-amber-400 tracking-wide uppercase">
                        Anotação Privada
                    </span>
                </div>
                <span className="text-[10px] text-gray-400 font-mono">
                    {formattedDate}
                </span>
            </div>

            <p className="text-xs text-gray-200 whitespace-pre-wrap leading-relaxed select-text font-sans">
                {note.content}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                {onDelete && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(note);
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/30 transition-colors cursor-pointer"
                        title="Excluir anotação"
                    >
                        <FiTrash2 size={13} />
                        <span>Excluir</span>
                    </button>
                )}
                <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
                    title="Copiar anotação"
                >
                    {copied ? <FiCheck size={13} className="text-emerald-400" /> : <FiCopy size={13} />}
                    <span>{copied ? 'Copiado' : 'Copiar'}</span>
                </button>
            </div>
        </div>
    );
});
