import React from 'react';
import { BsImages } from 'react-icons/bs';
import { FiChevronRight, FiVideo, FiMic, FiImage } from 'react-icons/fi';
import { resolveMediaUrl } from '../../utils/mediaUrlResolver';

export default function ContactMediaSection({
    mediaData,
    isLoadingMedia,
    onOpenMediaModal,
    activeClientId
}) {
    const mediaList = mediaData?.media || [];
    const docsList = mediaData?.docs || [];
    const totalAll = mediaData?.total_all || (mediaList.length + docsList.length + (mediaData?.links?.length || 0));

    // Pegar até 4 miniaturas para o preview rápido
    const previewItems = mediaList.slice(0, 4);

    return (
        <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-white/5" data-testid="contact-media-section">
            {/* Header clicável */}
            <div
                onClick={onOpenMediaModal}
                className="flex items-center justify-between group cursor-pointer hover:opacity-90 transition-opacity"
            >
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 dark:text-blue-400">
                        <BsImages size={14} />
                    </div>
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                        Mídia, links e docs
                    </span>
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold text-gray-400 group-hover:text-blue-500 transition-colors">
                    <span>{totalAll}</span>
                    <FiChevronRight size={14} />
                </div>
            </div>

            {/* Grid de Preview de Miniaturas */}
            {isLoadingMedia ? (
                <div className="grid grid-cols-4 gap-1.5 h-16 animate-pulse">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="rounded-lg bg-gray-200 dark:bg-white/5" />
                    ))}
                </div>
            ) : previewItems.length > 0 ? (
                <div 
                    onClick={onOpenMediaModal}
                    className="grid grid-cols-4 gap-1.5 cursor-pointer"
                >
                    {previewItems.map((item, index) => {
                        const resolvedUrl = resolveMediaUrl(item.url, activeClientId);
                        return (
                            <div
                                key={item.id || index}
                                className="aspect-square rounded-lg bg-gray-100 dark:bg-[#1e293b] border border-gray-200 dark:border-white/5 overflow-hidden flex items-center justify-center relative group/item hover:border-emerald-500/50 transition-all"
                            >
                                {item.type === 'video' ? (
                                    <div className="w-full h-full flex items-center justify-center bg-black/40 text-emerald-400">
                                        <FiVideo size={16} />
                                    </div>
                                ) : item.type === 'audio' || item.type === 'voice' ? (
                                    <div className="w-full h-full flex items-center justify-center bg-black/40 text-amber-400">
                                        <FiMic size={16} />
                                    </div>
                                ) : (
                                    <>
                                        <img
                                            src={resolvedUrl}
                                            alt={item.caption || "Mídia"}
                                            loading="lazy"
                                            className="w-full h-full object-cover group-hover/item:scale-110 transition-transform duration-200"
                                            onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                                if (e.currentTarget.nextElementSibling) {
                                                    e.currentTarget.nextElementSibling.style.display = 'flex';
                                                }
                                            }}
                                        />
                                        <div className="w-full h-full hidden flex-col items-center justify-center bg-[#1e293b] text-emerald-400">
                                            <FiImage size={16} />
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div
                    onClick={onOpenMediaModal}
                    className="p-3 bg-gray-100/50 dark:bg-[#1e293b]/40 rounded-xl border border-dashed border-gray-200 dark:border-white/10 text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-[#1e293b]/70 transition-colors"
                >
                    <p className="text-[11px] text-gray-400">
                        Nenhuma mídia ou documento compartilhado
                    </p>
                </div>
            )}
        </div>
    );
}
