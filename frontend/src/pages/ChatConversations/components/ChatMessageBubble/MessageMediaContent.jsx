import React from 'react';
import { renderLinkedText } from '../../utils/linkifyText';

const SYSTEM_MEDIA_FALLBACK_TEXTS = new Set([
    "📷 Imagem recebida",
    "📷 Imagem enviada",
    "🎥 Vídeo recebido",
    "🎥 Vídeo enviado",
    "📄 Documento recebido",
    "📄 Documento enviado",
    "🎵 Áudio recebido",
    "🎵 Áudio enviado",
    "✨ Sticker recebido"
]);

export default function MessageMediaContent({ msg, getMediaSrc }) {
    if (msg.message_type === 'contact') {
        const contactInitial = ((msg.meta_data?.contact_name || msg.content || 'C').replace('👤', '').trim())[0];
        const contactName = msg.meta_data?.contact_name || (msg.content?.includes('\n') ? msg.content.split('\n')[0].replace('👤', '').trim() : 'Contato');
        const contactPhone = msg.meta_data?.contact_phone || (msg.content?.includes('\n') ? msg.content.split('\n')[1].trim() : msg.content);

        return (
            <div className="bg-black/20 dark:bg-black/40 rounded-xl p-3 border border-white/10 flex flex-col gap-2.5 min-w-[200px] max-w-xs font-sans">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-sm shadow shrink-0">
                        {contactInitial}
                    </div>
                    <div className="overflow-hidden min-w-0">
                        <h4 className="font-bold text-xs sm:text-sm text-gray-800 dark:text-gray-100 truncate">
                            {contactName}
                        </h4>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono truncate">
                            {contactPhone}
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
        );
    }

    if (!msg.media_url) return null;

    const mediaSrc = getMediaSrc ? getMediaSrc(msg) : msg.media_url;
    const isSpecialFallbackText = SYSTEM_MEDIA_FALLBACK_TEXTS.has(msg.content);

    return (
        <div className="space-y-1.5 font-sans">
            {msg.message_type === 'image' && (
                <img 
                    src={mediaSrc} 
                    alt="Imagem" 
                    loading="lazy"
                    decoding="async"
                    className="rounded-lg max-w-full h-auto max-h-60 object-contain cursor-pointer hover:opacity-90 transition-opacity bg-black/20"
                    onClick={() => window.open(mediaSrc, '_blank')}
                />
            )}
            {msg.message_type === 'sticker' && (
                <img 
                    src={mediaSrc} 
                    alt="Sticker" 
                    loading="lazy"
                    decoding="async"
                    className="w-32 h-32 object-contain"
                />
            )}
            {msg.message_type === 'video' && (
                <video 
                    src={mediaSrc} 
                    controls 
                    className="rounded-lg max-w-full max-h-60"
                />
            )}
            {(msg.message_type === 'audio' || msg.message_type === 'voice') && (
                <audio 
                    src={mediaSrc} 
                    controls 
                    className="max-w-full"
                />
            )}
            {msg.message_type === 'document' && (
                <a 
                    href={mediaSrc} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs font-bold underline bg-gray-100 dark:bg-black/20 p-2.5 rounded-lg text-blue-600 dark:text-blue-400 max-w-full truncate"
                    title={msg.meta_data?.filename || (msg.media_url?.includes('/') ? msg.media_url.split('/').pop().split('?')[0] : 'Documento')}
                >
                    📎 <span className="truncate">{msg.meta_data?.filename || (msg.media_url && !msg.media_url.startsWith('media_id:') && msg.media_url.includes('/') ? msg.media_url.split('/').pop().split('?')[0] : 'Baixar Documento')}</span>
                </a>
            )}
            {/* Legenda opcional */}
            {msg.content && !isSpecialFallbackText && (
                <p className="whitespace-pre-wrap leading-relaxed mt-1.5">{renderLinkedText(msg.content)}</p>
            )}
        </div>
    );
}
