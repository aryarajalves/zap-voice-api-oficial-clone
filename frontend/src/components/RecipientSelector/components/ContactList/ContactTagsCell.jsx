import React from 'react';

/**
 * Célula para exibir se o contato está cadastrado na aba de Contatos (webhook_leads)
 * e quais etiquetas (tags) estão vinculadas a ele.
 */
export default function ContactTagsCell({ phone, tagsInfo, isLoading }) {
    if (isLoading && !tagsInfo) {
        return (
            <div className="flex items-center justify-center gap-1.5 py-1 text-slate-500 text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Consultando...</span>
            </div>
        );
    }

    if (!tagsInfo) {
        return (
            <span className="text-[10px] text-slate-600 font-medium italic">
                Não verificado
            </span>
        );
    }

    if (!tagsInfo.is_registered) {
        return (
            <div className="flex items-center justify-center">
                <span className="text-[9.5px] font-bold text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-white/5 uppercase tracking-wider">
                    Não Cadastrado
                </span>
            </div>
        );
    }

    const tags = Array.isArray(tagsInfo.tags) ? tagsInfo.tags : [];

    return (
        <div className="flex flex-col items-center justify-center gap-1.5 py-1 min-w-[160px]">
            <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-md border border-emerald-500/30 uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Cadastrado
                </span>
            </div>

            {tags.length > 0 ? (
                <div className="flex flex-wrap items-center justify-center gap-1 max-w-[240px]">
                    {tags.map((tag, idx) => (
                        <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md text-[9.5px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/25 tracking-wide shadow-sm"
                            title={`Etiqueta da aba Contatos: ${tag}`}
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            ) : (
                <span className="text-[9.5px] text-slate-500 italic">
                    Sem etiquetas
                </span>
            )}
        </div>
    );
}
