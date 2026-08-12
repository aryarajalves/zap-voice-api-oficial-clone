import React, { useState, useEffect } from 'react';
import { FiX, FiSearch, FiLayers, FiRefreshCw, FiPlay } from 'react-icons/fi';
import { fetchWithAuth } from '../../AuthContext';
import { API_URL } from '../../config';
import { toast } from 'react-hot-toast';
import { useClient } from '../../contexts/ClientContext';

export default function TriggerFunnelModal({
    isOpen,
    onClose,
    onTrigger,
    isTriggering
}) {
    const { activeClient } = useClient();
    const clientId = activeClient?.id || localStorage.getItem('activeClientId');
    const [funnels, setFunnels] = useState([]);
    const [search, setSearch] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedFunnelId, setSelectedFunnelId] = useState(null);

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        if (isOpen && clientId) {
            loadFunnels();
        } else {
            setSearch('');
            setSelectedFunnelId(null);
            setCurrentPage(1);
        }
    }, [isOpen, clientId]);

    const loadFunnels = async () => {
        setIsLoading(true);
        try {
            console.log('clientId in modal:', clientId);
            const res = await fetchWithAuth(`${API_URL}/funnels`, {}, clientId);
            if (res.ok) {
                const data = await res.json();
                console.log('Funnels API raw response data:', data);
                // Filter only active and non-archived funnels, sorting pinned ones to the top
                setFunnels((data || [])
                    .filter(f => f.is_active !== false && !f.is_archived)
                    .sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0))
                );
            } else {
                console.log('Funnels API error status:', res.status);
                toast.error('Erro ao buscar funis.');
            }
        } catch (err) {
            toast.error('Erro de conexão ao buscar funis.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    const filteredFunnels = funnels.filter(f =>
        (f.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (f.description || '').toLowerCase().includes(search.toLowerCase())
    );

    const totalPages = Math.ceil(filteredFunnels.length / itemsPerPage) || 1;
    const paginatedFunnels = filteredFunnels.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />

            {/* Modal Container */}
            <div className="relative w-full max-w-md bg-[#0f172a]/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] z-10 animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#1e293b]/50">
                    <h3 className="text-base font-semibold text-white flex items-center gap-2">
                        <FiLayers className="text-blue-500" />
                        Disparar Funil
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                        title="Fechar"
                    >
                        <FiX size={18} />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="p-4 border-b border-white/5 bg-[#0b0f19]/40 flex gap-2 items-center">
                    <div className="relative flex-1">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                            <FiSearch size={14} />
                        </span>
                        <input
                            type="text"
                            placeholder="Buscar funil pelo nome..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full pl-9 pr-4 py-2 bg-[#1e293b]/40 text-gray-200 text-xs border border-white/5 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                </div>

                {/* Funnels List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#0b0f19]">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
                            <FiRefreshCw className="animate-spin" size={24} />
                            <span className="text-xs">Carregando funis...</span>
                        </div>
                    ) : paginatedFunnels.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 text-xs">
                            Nenhum funil ativo encontrado.
                        </div>
                    ) : (
                        paginatedFunnels.map(funnel => {
                            const isSelected = selectedFunnelId === funnel.id;
                            return (
                                <button
                                    key={funnel.id}
                                    type="button"
                                    onClick={() => setSelectedFunnelId(funnel.id)}
                                    className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between group ${
                                        isSelected
                                            ? 'bg-blue-500/10 border-blue-500/40 text-white'
                                            : 'bg-[#1e293b]/20 border-white/5 text-gray-300 hover:border-white/10 hover:bg-[#1e293b]/30'
                                    }`}
                                >
                                    <div className="flex-1 min-w-0 pr-2">
                                        <div className="font-semibold text-xs flex items-center gap-1.5 truncate group-hover:text-white transition-colors">
                                            {funnel.is_pinned && (
                                                <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 flex items-center gap-0.5 animate-pulse">
                                                    📌 FIXADO
                                                </span>
                                            )}
                                            <span className="truncate">{funnel.name}</span>
                                        </div>
                                        {funnel.description && (
                                            <div className="text-[10px] text-gray-400 mt-1 truncate">
                                                {funnel.description}
                                            </div>
                                        )}
                                    </div>
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                                        isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-500 group-hover:border-gray-400'
                                    }`}>
                                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>

                {/* Controles de Paginação */}
                {filteredFunnels.length > itemsPerPage && (
                    <div className="px-6 py-2.5 bg-[#0b0f19] border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                        <span>Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong> ({filteredFunnels.length} funis)</span>
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-white font-medium transition"
                            >
                                Anterior
                            </button>
                            <button
                                type="button"
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-white font-medium transition"
                            >
                                Próxima
                            </button>
                        </div>
                    </div>
                )}

                {/* Footer Actions */}
                <div className="flex items-center justify-end px-6 py-4 border-t border-white/5 bg-[#1e293b]/50 gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border border-white/10 text-gray-300 hover:bg-white/5 rounded-xl text-xs font-semibold transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={() => selectedFunnelId && onTrigger(selectedFunnelId)}
                        disabled={!selectedFunnelId || isTriggering}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                        {isTriggering ? (
                            <>
                                <FiRefreshCw className="animate-spin" size={13} /> Iniciando...
                            </>
                        ) : (
                            <>
                                <FiPlay size={13} /> Disparar Funil
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
