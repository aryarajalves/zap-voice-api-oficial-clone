import React, { useState, useEffect, useRef } from 'react';
import { FiZap, FiCornerDownLeft, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const ITEMS_PER_PAGE = 5;

export default function QuickRepliesDropdown({
    quickMessages = [],
    selectedIndex = 0,
    onSelect,
    isOpen = false,
    className = ''
}) {
    const [page, setPage] = useState(1);
    const selectedItemRef = useRef(null);
    const listContainerRef = useRef(null);

    const totalPages = Math.ceil(quickMessages.length / ITEMS_PER_PAGE) || 1;

    // Sincronizar página caso selectedIndex mude via navegação por teclado
    useEffect(() => {
        if (quickMessages.length > 0) {
            const calculatedPage = Math.floor(selectedIndex / ITEMS_PER_PAGE) + 1;
            if (calculatedPage !== page && calculatedPage <= totalPages) {
                setPage(calculatedPage);
            }
        }
    }, [selectedIndex, quickMessages.length, totalPages]);

    // Rolar suavemente até o item selecionado
    useEffect(() => {
        if (selectedItemRef.current && typeof selectedItemRef.current.scrollIntoView === 'function') {
            selectedItemRef.current.scrollIntoView({
                block: 'nearest',
                behavior: 'smooth'
            });
        }
    }, [selectedIndex, page]);

    // Resetar página quando a quantidade de itens filtrados mudar
    useEffect(() => {
        setPage(1);
    }, [quickMessages.length]);

    if (!isOpen || !quickMessages || quickMessages.length === 0) {
        return null;
    }

    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const currentItems = quickMessages.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const handlePrevPage = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (page > 1) {
            setPage(prev => prev - 1);
        }
    };

    const handleNextPage = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (page < totalPages) {
            setPage(prev => prev + 1);
        }
    };

    return (
        <div
            className={className || "absolute bottom-full mb-3 left-4 right-4 max-w-lg mx-auto z-[9999] bg-[#0f172a]/95 dark:bg-[#090d16]/95 border border-emerald-500/30 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-150 flex flex-col"}
            role="listbox"
            aria-label="Respostas Rápidas"
        >
            {/* Header */}
            <div className="px-3.5 py-2 bg-[#1e293b]/90 border-b border-white/10 text-[11px] font-bold text-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-emerald-400">
                    <FiZap size={14} className="text-amber-400" />
                    <span>Respostas Rápidas</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-full font-mono">
                        {quickMessages.length}
                    </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-gray-400 font-normal">
                    <span>↑↓ navegar</span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5"><FiCornerDownLeft size={10} /> Enter selecionar</span>
                </div>
            </div>

            {/* Lista com scroll estilizado */}
            <div 
                ref={listContainerRef}
                className="overflow-y-auto max-h-60 p-1.5 space-y-1 custom-scrollbar scroll-smooth"
            >
                {currentItems.map((item, localIdx) => {
                    const globalIdx = startIndex + localIdx;
                    const isSelected = globalIdx === selectedIndex;
                    return (
                        <div
                            key={item.id || globalIdx}
                            ref={isSelected ? selectedItemRef : null}
                            role="option"
                            aria-selected={isSelected}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                onSelect(item);
                            }}
                            className={`flex items-start gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${
                                isSelected
                                    ? 'bg-emerald-600/25 border border-emerald-500/40 text-white shadow-sm'
                                    : 'text-gray-300 hover:bg-white/5 hover:text-white border border-transparent'
                            }`}
                        >
                            {/* Badge do Atalho */}
                            <div className={`px-2 py-1 rounded-lg text-xs font-mono font-bold shrink-0 transition-colors ${
                                isSelected
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}>
                                /{item.shortcut}
                            </div>

                            {/* Conteúdo */}
                            <div className="flex-1 min-w-0">
                                <h4 className="text-xs font-semibold text-gray-100 truncate">
                                    {item.title}
                                </h4>
                                <p className="text-[11px] text-gray-400 line-clamp-1 truncate mt-0.5">
                                    {item.content}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer com Paginação */}
            {totalPages > 1 && (
                <div className="px-3.5 py-1.5 bg-[#1e293b]/70 border-t border-white/10 flex items-center justify-between text-[11px] text-gray-400 select-none">
                    <span className="text-[10px] text-gray-400 font-mono">
                        Página <strong className="text-gray-200">{page}</strong> de <strong className="text-gray-200">{totalPages}</strong>
                    </span>
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onMouseDown={handlePrevPage}
                            disabled={page === 1}
                            className="p-1 rounded-md hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer text-gray-300"
                            title="Página Anterior"
                            aria-label="Página Anterior"
                        >
                            <FiChevronLeft size={14} />
                        </button>
                        <span className="text-[10px] text-gray-400 px-1">
                            {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, quickMessages.length)} de {quickMessages.length}
                        </span>
                        <button
                            type="button"
                            onMouseDown={handleNextPage}
                            disabled={page === totalPages}
                            className="p-1 rounded-md hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer text-gray-300"
                            title="Próxima Página"
                            aria-label="Próxima Página"
                        >
                            <FiChevronRight size={14} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
