import React from 'react';
import { BsJournalText } from 'react-icons/bs';

export function MessageTemplateBadge({ templateName }) {
    return (
        <div className="flex items-center gap-1.5 text-[9px] uppercase font-bold tracking-wider text-indigo-300 mb-2 bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-500/20 w-fit">
            <BsJournalText size={11} className="text-indigo-400" />
            <span>WhatsApp Template: {templateName}</span>
        </div>
    );
}

export function MessageTemplateHeaderMedia({ header, mediaUrl, getMediaSrc, metaData, msg }) {
    if (!header || header.format === 'TEXT') return null;

    const mediaSrc = getMediaSrc ? getMediaSrc(msg) : mediaUrl;

    return (
        <div className="mb-2 p-2 bg-black/35 rounded-lg flex flex-col gap-2 text-xs text-indigo-200 border border-white/5 overflow-hidden">
            {mediaUrl ? (
                <div className="w-full">
                    {header.format === 'IMAGE' && (
                        <img 
                            src={mediaSrc} 
                            alt="Template Header" 
                            loading="lazy"
                            className="rounded-lg max-w-full h-auto max-h-60 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => window.open(mediaSrc, '_blank')}
                        />
                    )}
                    {header.format === 'VIDEO' && (
                        <video 
                            src={mediaSrc} 
                            controls 
                            className="rounded-lg max-w-full max-h-60"
                        />
                    )}
                    {header.format === 'DOCUMENT' && (
                        <a 
                            href={mediaSrc} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-2 bg-indigo-950/60 hover:bg-indigo-900/40 text-indigo-200 rounded-lg transition max-w-full truncate"
                            title={metaData?.filename || 'Documento'}
                        >
                            <span>📄 <span className="truncate">{metaData?.filename || (mediaUrl && !mediaUrl.startsWith('media_id:') && mediaUrl.includes('/') ? mediaUrl.split('/').pop().split('?')[0] : 'Baixar Documento')}</span></span>
                        </a>
                    )}
                </div>
            ) : (
                <div className="flex items-center gap-2">
                    {header.format === 'IMAGE' && <span>🖼️ Mídia de Cabeçalho: [Imagem vinculada]</span>}
                    {header.format === 'VIDEO' && <span>🎥 Mídia de Cabeçalho: [Vídeo vinculado]</span>}
                    {header.format === 'DOCUMENT' && <span>📄 Mídia de Cabeçalho: [Documento vinculado]</span>}
                </div>
            )}
        </div>
    );
}

export function MessageTemplateNotice({ content, templateName }) {
    return (
        <div className="space-y-1">
            <p className="whitespace-pre-wrap leading-relaxed font-semibold text-indigo-200">
                📢 Template enviado: {templateName || content.replace("[Template: ", "").replace("]", "")}
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 italic mt-0.5 leading-snug">
                Sincronize os templates nas configurações para carregar o vídeo e texto desta mensagem no painel.
            </p>
        </div>
    );
}

export function MessageTemplateButtons({ buttons = [] }) {
    if (!buttons || buttons.length === 0) return null;

    return (
        <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-2.5 border-t border-white/10">
            {buttons.map((btnText, i) => (
                <div key={i} className="bg-white/5 hover:bg-white/10 border border-white/10 text-white/90 text-center py-1.5 px-3 rounded-lg text-xs font-medium cursor-not-allowed select-none flex items-center justify-center gap-1.5 transition-all">
                    <span>{btnText}</span>
                </div>
            ))}
        </div>
    );
}

export function MessageTemplateFailureBanner({ msg, onRetry, isRetrying }) {
    const isFailed = msg.meta_data?.status === 'failed' || msg.status === 'failed' || Boolean(msg.meta_data?.failure_reason);
    if (!isFailed) return null;

    const reason = msg.meta_data?.failure_reason || 'Falha no envio da Meta';

    return (
        <div className="mt-2.5 p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs shadow-sm">
            <div className="flex items-center gap-1.5 font-bold text-red-400 text-[11px]">
                <span>⚠️</span>
                <span className="truncate">{reason}</span>
            </div>
            <div className="mt-2 flex justify-end">
                <button
                    type="button"
                    disabled={isRetrying}
                    onClick={(e) => {
                        e.stopPropagation();
                        onRetry?.(msg);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-md hover:shadow-[0_0_12px_rgba(16,185,129,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    title="Disparar novamente o mesmo template para este contato"
                >
                    {isRetrying ? (
                        <>
                            <span className="animate-spin inline-block">🔄</span>
                            <span>Disparando...</span>
                        </>
                    ) : (
                        <>
                            <span>▶</span>
                            <span>Disparar Novamente</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
