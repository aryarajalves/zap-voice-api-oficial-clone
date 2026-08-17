import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FiArrowLeft, FiSearch, FiX, FiCalendar, FiCheck, FiRefreshCw, FiMessageSquare } from 'react-icons/fi';
import { BsCheck2All } from 'react-icons/bs';
import { API_URL } from '../../../../config';
import { fetchWithAuth } from '../../../../AuthContext';

/**
 * Destaca as ocorrências do termo pesquisado no texto da mensagem
 */
function highlightSearchTerm(text, searchTerm) {
    if (!text || !searchTerm || !searchTerm.trim()) {
        return text;
    }
    const cleanTerm = searchTerm.trim();
    const regex = new RegExp(`(${cleanTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) =>
        regex.test(part) ? (
            <span key={i} className="bg-emerald-500/30 text-emerald-300 font-bold px-0.5 rounded">
                {part}
            </span>
        ) : (
            part
        )
    );
}

/**
 * Formata a data e hora para exibição estilo WhatsApp
 */
function formatMessageDate(isoString) {
    if (!isoString) return '';
    try {
        const d = new Date(isoString);
        const now = new Date();
        const isToday = d.toDateString() === now.toDateString();

        const yesterday = new Date();
        yesterday.setDate(now.getDate() - 1);
        const isYesterday = d.toDateString() === yesterday.toDateString();

        const timeStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        if (isToday) return `Hoje às ${timeStr}`;
        if (isYesterday) return `Ontem às ${timeStr}`;
        return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às ${timeStr}`;
    } catch {
        return '';
    }
}

export default function MessageSearchSidebar({
    convoId,
    activeClientId,
    onClose,
    onSelectMessage
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDate, setSelectedDate] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    const inputRef = useRef(null);
    const debounceTimerRef = useRef(null);

    const performSearch = useCallback(async (query, date) => {
        if ((!query || !query.trim()) && !date) {
            setResults([]);
            setHasSearched(false);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setHasSearched(true);
        try {
            const params = new URLSearchParams();
            if (query && query.trim()) params.append('query', query.trim());
            if (date) params.append('date', date);

            const res = await fetchWithAuth(
                `${API_URL}/chat/conversations/${convoId}/search-messages?${params.toString()}`,
                {},
                activeClientId
            );

            if (res.ok) {
                const data = await res.json();
                setResults(data.messages || []);
            } else {
                setResults([]);
            }
        } catch (err) {
            console.error('Erro ao pesquisar mensagens:', err);
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    }, [convoId, activeClientId]);

    useEffect(() => {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => {
            performSearch(searchQuery, selectedDate);
        }, 180);

        return () => {
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        };
    }, [searchQuery, selectedDate, performSearch]);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    const handleClear = () => {
        setSearchQuery('');
        setSelectedDate('');
        setResults([]);
        setHasSearched(false);
        if (inputRef.current) inputRef.current.focus();
    };

    return (
        <div className="flex flex-col h-full bg-[#111b21] dark:bg-[#0b141a] text-gray-200 border-l border-white/5 animate-in fade-in slide-in-from-right-4 duration-200">
            {/* Header da Pesquisa estilo WhatsApp */}
            <div className="px-4 py-3.5 bg-[#202c33] dark:bg-[#111b21] border-b border-white/5 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-full text-gray-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
                        title="Voltar para informações do contato"
                    >
                        <FiArrowLeft size={18} />
                    </button>
                    <h3 className="text-sm font-semibold text-white tracking-wide">Pesquisar mensagens</h3>
                </div>
            </div>

            {/* Barra de Pesquisa com Lupa e Calendário */}
            <div className="p-3 space-y-2 border-b border-white/5 bg-[#111b21]">
                <div className="relative flex items-center">
                    <div className="absolute left-3 text-gray-400 pointer-events-none flex items-center">
                        <FiSearch size={15} />
                    </div>

                    <input
                        ref={inputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Pesquisar..."
                        className="w-full pl-9 pr-16 py-2 bg-[#202c33] text-white text-xs rounded-lg border border-transparent focus:border-emerald-500/50 focus:outline-none placeholder-gray-400 transition"
                    />

                    <div className="absolute right-2 flex items-center gap-1">
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="p-1 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition cursor-pointer"
                                title="Limpar texto"
                            >
                                <FiX size={14} />
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => setShowDatePicker(prev => !prev)}
                            className={`p-1.5 rounded-md transition cursor-pointer ${
                                selectedDate
                                    ? 'text-emerald-400 bg-emerald-500/20'
                                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                            }`}
                            title="Filtrar por data"
                        >
                            <FiCalendar size={14} />
                        </button>
                    </div>
                </div>

                {/* Seletor de Data Expandido */}
                {showDatePicker && (
                    <div className="flex items-center gap-2 p-2 bg-[#202c33] rounded-lg border border-white/5 text-xs animate-in fade-in duration-150">
                        <span className="text-gray-400 text-[11px]">Data:</span>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-[#111b21] text-white px-2 py-1 rounded border border-white/10 text-xs focus:outline-none focus:border-emerald-500"
                        />
                        {selectedDate && (
                            <button
                                type="button"
                                onClick={() => setSelectedDate('')}
                                className="text-[11px] text-red-400 hover:text-red-300 font-medium ml-auto cursor-pointer"
                            >
                                Limpar data
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Lista de Mensagens Encontradas */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1.5">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
                        <FiRefreshCw className="animate-spin text-emerald-400" size={20} />
                        <span className="text-xs">Buscando mensagens...</span>
                    </div>
                ) : hasSearched && results.length > 0 ? (
                    <>
                        <div className="px-2 py-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex justify-between items-center">
                            <span>{results.length} {results.length === 1 ? 'mensagem encontrada' : 'mensagens encontradas'}</span>
                        </div>

                        {results.map((msg) => {
                            const isOutbound = msg.sender_type !== 'contact';
                            const dateFormatted = formatMessageDate(msg.timestamp);

                            return (
                                <div
                                    key={msg.id}
                                    onClick={() => onSelectMessage && onSelectMessage(msg.id)}
                                    className="p-2.5 rounded-lg bg-[#202c33]/70 hover:bg-[#202c33] border border-white/5 hover:border-emerald-500/30 transition-all cursor-pointer group shadow-sm flex flex-col gap-1 text-left"
                                >
                                    <div className="flex items-center justify-between text-[11px] text-gray-400">
                                        <div className="flex items-center gap-1.5 font-medium">
                                            {isOutbound ? (
                                                <BsCheck2All size={13} className="text-blue-400 shrink-0" title="Mensagem enviada" />
                                            ) : (
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                                            )}
                                            <span className={isOutbound ? 'text-blue-300' : 'text-emerald-300'}>
                                                {isOutbound ? 'Você / Atendente' : 'Contato'}
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-gray-400 font-mono">{dateFormatted}</span>
                                    </div>

                                    <div className="text-xs text-gray-200 line-clamp-3 leading-relaxed break-words">
                                        {highlightSearchTerm(msg.content || '[Mídia ou anexo]', searchQuery)}
                                    </div>
                                </div>
                            );
                        })}
                    </>
                ) : hasSearched && results.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-gray-400 text-center px-4 gap-2">
                        <FiSearch size={28} className="text-gray-500 opacity-60" />
                        <p className="text-xs font-semibold text-gray-300">Nenhuma mensagem encontrada</p>
                        <p className="text-[11px] text-gray-500">
                            {searchQuery ? `Não encontramos resultados para "${searchQuery}"` : 'Tente alterar a data ou o termo pesquisado.'}
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400 text-center px-4 gap-3">
                        <div className="w-12 h-12 rounded-full bg-[#202c33] flex items-center justify-center text-emerald-400 border border-white/5">
                            <FiSearch size={22} />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-300">Pesquise mensagens nesta conversa</p>
                            <p className="text-[11px] text-gray-500 mt-1 max-w-[220px]">
                                Digite palavras-chave ou use o calendário para encontrar mensagens anteriores rapidamente.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
