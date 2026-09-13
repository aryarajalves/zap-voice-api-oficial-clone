import React from 'react';

const ContactTableToolbar = ({
    excludedCount = 0,
    filterExcludedOnly = false,
    setFilterExcludedOnly,
    showContactTags,
    isLoadingTags,
    toggleShowContactTags
}) => {
    return (
        <div className="px-6 py-2.5 bg-[#0b132b]/90 border-b border-white/5 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="text-[11px] font-semibold flex items-center gap-1.5 text-slate-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    💡 Segure com o botão esquerdo para arrastar a tabela (horizontal e vertical)
                </span>
            </div>

            <div className="flex items-center gap-2">
                {excludedCount > 0 && (
                    <button
                        type="button"
                        onClick={() => setFilterExcludedOnly && setFilterExcludedOnly(!filterExcludedOnly)}
                        className={`px-3.5 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-2 border shadow-md active:scale-95 cursor-pointer ${
                            filterExcludedOnly
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-amber-950/40 ring-1 ring-amber-500/30'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-white/10'
                        }`}
                        title="Filtrar e visualizar contatos que coincidiram com o filtro de exclusão"
                    >
                        <span>🚫</span>
                        <span>{filterExcludedOnly ? 'Voltar para Destinatários' : `Ver Excluídos (${excludedCount})`}</span>
                    </button>
                )}
                <button
                    type="button"
                    onClick={toggleShowContactTags}
                    disabled={isLoadingTags}
                    className={`px-3.5 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-2 border shadow-md active:scale-95 cursor-pointer ${
                        showContactTags
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-emerald-950/40 ring-1 ring-emerald-500/30'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-white/10'
                    }`}
                    title="Ver se o contato está cadastrado na aba Contatos e suas etiquetas"
                >
                    {isLoadingTags ? (
                        <>
                            <span className="w-3 h-3 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin"></span>
                            <span>Consultando Contatos...</span>
                        </>
                    ) : (
                        <>
                            <span>🏷️</span>
                            <span>{showContactTags ? 'Ocultar Etiquetas Contatos' : 'Ver Etiquetas da Aba Contatos'}</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default ContactTableToolbar;
