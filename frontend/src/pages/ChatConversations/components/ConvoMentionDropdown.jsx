import React from 'react';
import { FiMessageSquare, FiChevronLeft, FiChevronRight, FiRefreshCw } from 'react-icons/fi';

export default function ConvoMentionDropdown({
    conversations = [],
    selectedIndex = 0,
    onSelect,
    position = { top: 0, left: 0 },
    page = 1,
    setPage,
    totalPages = 1,
    totalItems = 0,
    isLoading = false
}) {
    if (!conversations || conversations.length === 0) {
        if (isLoading) {
            return (
                <div
                    style={{ top: `${position.top}px`, left: `${position.left}px` }}
                    className="absolute z-[99999] bg-[#0f172a]/95 border border-white/10 rounded-xl shadow-2xl p-4 text-xs text-gray-300 w-80 backdrop-blur-md flex items-center justify-center gap-2"
                >
                    <FiRefreshCw className="animate-spin text-blue-400" size={14} />
                    <span>Buscando contatos...</span>
                </div>
            );
        }
        return null;
    }

    return (
        <div
            style={{ top: `${position.top}px`, left: `${position.left}px` }}
            className="absolute z-[99999] bg-[#0f172a]/95 border border-white/10 rounded-xl shadow-2xl overflow-hidden w-80 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 flex flex-col"
        >
            {/* Header do Dropdown com indicação de Ordem Alfabética */}
            <div className="px-3 py-2 bg-[#1e293b]/90 border-b border-white/5 text-[11px] font-bold text-gray-300 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <span className="text-blue-400">@</span>
                    <span>Vincular Conversa (A a Z)</span>
                    {totalItems > 0 && (
                        <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.2 rounded-full font-mono">
                            {totalItems}
                        </span>
                    )}
                </div>
                {isLoading && <FiRefreshCw className="animate-spin text-blue-400" size={12} />}
            </div>

            {/* Lista de Contatos da Página (até 20 contatos) */}
            <div className="overflow-y-auto max-h-60 p-1.5 space-y-0.5 custom-scrollbar">
                {conversations.map((convo, idx) => {
                    const isSelected = idx === selectedIndex;
                    const contactName = convo.contact_name || convo.phone || 'Sem nome';
                    const phone = convo.phone || '';
                    const initial = (contactName[0] || 'C').toUpperCase();

                    return (
                        <div
                            key={convo.id}
                            onMouseDown={(e) => {
                                e.preventDefault(); // Evita perder o foco do textarea
                                onSelect(convo);
                            }}
                            className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-all ${
                                isSelected
                                    ? 'bg-blue-600/30 text-white border border-blue-500/30 font-medium shadow-sm'
                                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                            }`}
                        >
                            {/* Avatar com inicial */}
                            <div className="w-7 h-7 rounded-full bg-blue-600/30 border border-blue-500/30 flex items-center justify-center text-blue-300 text-xs font-bold shrink-0">
                                {initial}
                            </div>

                            {/* Detalhes do Contato */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                    <span className="text-xs font-semibold truncate">{contactName}</span>
                                    <span className="text-[10px] text-blue-400/80 font-mono">#{convo.id}</span>
                                </div>
                                {phone && (
                                    <p className="text-[10px] text-gray-400 truncate font-mono">{phone}</p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Rodapé com Paginação (quando houver mais de 1 página ou 20 contatos) */}
            {totalPages > 1 && (
                <div className="px-3 py-1.5 bg-[#1e293b]/80 border-t border-white/5 flex items-center justify-between text-[10px] text-gray-400">
                    <button
                        type="button"
                        disabled={page <= 1}
                        onMouseDown={(e) => {
                            e.preventDefault();
                            if (setPage && page > 1) setPage(page - 1);
                        }}
                        className="flex items-center gap-1 px-2 py-0.5 rounded border border-white/5 hover:bg-white/10 text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition"
                    >
                        <FiChevronLeft size={12} />
                        <span>Anterior</span>
                    </button>

                    <span className="font-medium">
                        Pág. <strong className="text-white">{page}</strong> de <strong className="text-white">{totalPages}</strong>
                    </span>

                    <button
                        type="button"
                        disabled={page >= totalPages}
                        onMouseDown={(e) => {
                            e.preventDefault();
                            if (setPage && page < totalPages) setPage(page + 1);
                        }}
                        className="flex items-center gap-1 px-2 py-0.5 rounded border border-white/5 hover:bg-white/10 text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition"
                    >
                        <span>Próximo</span>
                        <FiChevronRight size={12} />
                    </button>
                </div>
            )}
        </div>
    );
}
