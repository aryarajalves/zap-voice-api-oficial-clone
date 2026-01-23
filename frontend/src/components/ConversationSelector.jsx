
import React, { useEffect, useState, useRef } from 'react';
import { API_URL } from '../config';
import { toast } from 'react-hot-toast';
import { fetchWithAuth } from '../AuthContext';
import { useClient } from '../contexts/ClientContext';

const ConversationSelector = ({ onSelect, filterInboxId }) => {
    const { activeClient } = useClient();
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const fetchConversations = async () => {
            setLoading(true);
            try {
                // Using API_URL from config
                let url = `${API_URL}/chatwoot/conversations`;
                if (filterInboxId) {
                    url += `?inbox_id=${filterInboxId}`;
                }

                const response = await fetchWithAuth(url, {}, activeClient?.id);
                if (!response.ok) throw new Error('Falha na requisição');

                const data = await response.json();
                let payload = data.data?.payload || data;

                if (!Array.isArray(payload)) {
                    console.warn("API response is not an array:", payload);
                    payload = [];
                }

                if (isMounted) setConversations(payload);
            } catch (error) {
                console.error("Erro ao buscar conversas:", error);
                if (isMounted) toast.error("Falha ao carregar conversas.");
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchConversations();
        return () => { isMounted = false; };
    }, [filterInboxId]);

    // Multi-select state
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedConvs, setSelectedConvs] = useState([]);
    const dropdownRef = useRef(null);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Reset selection when inbox changes
    useEffect(() => {
        if (!filterInboxId) {
            setSelectedConvs([]);
            onSelect([]);
        }
    }, [filterInboxId]);

    const availableConversations = Array.isArray(conversations) ? conversations : [];

    const filteredAndSearched = availableConversations.filter(c => {
        const name = c.meta?.sender?.name || '';
        const phone = c.meta?.sender?.phone_number || '';
        const id = String(c.id);
        const query = searchQuery.toLowerCase();

        return name.toLowerCase().includes(query) ||
            phone.includes(query) ||
            id.includes(query);
    });

    const handleSelect = (conv) => {
        const exists = selectedConvs.find(c => c.id === conv.id);
        let updated;
        if (exists) {
            updated = selectedConvs.filter(c => c.id !== conv.id);
        } else {
            updated = [...selectedConvs, conv];
        }
        setSelectedConvs(updated);
        onSelect(updated);
        // Do not close dropdown to allow multiple selections
    };

    const handleSelectAll = (e) => {
        e.stopPropagation();
        // Check if all VISIBLE items are selected
        const allVisibleIds = filteredAndSearched.map(c => c.id);
        const allSelected = allVisibleIds.every(id => selectedConvs.some(s => s.id === id));

        let updated;
        if (allSelected) {
            // Deselect all visible
            updated = selectedConvs.filter(c => !allVisibleIds.includes(c.id));
        } else {
            // Select all visible (merge unique)
            const newItems = filteredAndSearched.filter(c => !selectedConvs.some(s => s.id === c.id));
            updated = [...selectedConvs, ...newItems];
        }
        setSelectedConvs(updated);
        onSelect(updated);
    };

    if (!filterInboxId) {
        return (
            <div className="bg-gray-50 p-6 rounded-lg shadow-sm border border-gray-200 text-center opacity-70 cursor-not-allowed">
                <h2 className="text-xl font-bold mb-2 text-gray-400">Selecione Conversas</h2>
                <p className="text-gray-500 text-sm">Selecione um canal acima para carregar as conversas.</p>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100" ref={dropdownRef}>
            <h2 className="text-xl font-bold mb-4 text-gray-800">Selecione as Conversas</h2>

            {loading ? (
                <div className="text-gray-500 animate-pulse text-sm py-2">Carregando conversas...</div>
            ) : (
                <div className="relative">
                    <div
                        onClick={() => setIsOpen(!isOpen)}
                        className={`w-full p-3 bg-white border rounded-lg cursor-pointer flex justify-between items-center shadow-sm hover:shadow-md transition ${isOpen ? 'ring-2 ring-blue-400 border-blue-400' : 'border-gray-300'}`}
                    >
                        <div className="flex items-center gap-2 overflow-hidden">
                            <div className="flex flex-col">
                                <span className="font-semibold text-gray-800 leading-tight">
                                    {selectedConvs.length > 0
                                        ? `${selectedConvs.length} conversa(s) selecionada(s)`
                                        : 'Selecione as conversas...'}
                                </span>
                                {selectedConvs.length > 0 && (
                                    <span className="text-xs text-gray-500 truncate max-w-[300px]">
                                        {selectedConvs.map(c => c.meta?.sender?.name).join(', ')}
                                    </span>
                                )}
                            </div>
                        </div>
                        <svg className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>

                    {isOpen && (
                        <div className="absolute z-[100] top-full mt-2 w-full bg-white border border-gray-100 rounded-lg shadow-2xl max-h-[400px] flex flex-col animated-fade-in">
                            <div className="p-3 border-b border-gray-100 bg-gray-50 rounded-t-lg flex-none space-y-2">
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Buscar por nome ou telefone..."
                                        className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        autoFocus
                                    />
                                    <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <button
                                    onClick={handleSelectAll}
                                    className="text-xs text-blue-600 font-semibold hover:underline w-full text-left px-1"
                                >
                                    {filteredAndSearched.length > 0 && filteredAndSearched.every(c => selectedConvs.some(s => s.id === c.id))
                                        ? "Desmarcar Todos Visíveis"
                                        : `Selecionar Todos Visíveis (${filteredAndSearched.length})`}
                                </button>
                            </div>

                            <div className="overflow-y-auto flex-1 min-h-0 pt-2">
                                {filteredAndSearched.length === 0 ? (
                                    <div className="p-4 text-center text-gray-500 text-sm">Nenhuma conversa encontrada.</div>
                                ) : (
                                    filteredAndSearched.map(conv => {
                                        const isSelected = selectedConvs.some(c => c.id === conv.id);
                                        return (
                                            <div
                                                key={conv.id}
                                                onClick={() => handleSelect(conv)}
                                                className={`px-3 py-2 cursor-pointer border-b border-gray-50 last:border-0 transition flex justify-between items-center group ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        readOnly
                                                        className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 border-gray-300 pointer-events-none"
                                                    />
                                                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                                                        {(conv.meta?.sender?.name || '?').charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-gray-800 text-sm group-hover:text-blue-700 transition-colors">
                                                            {conv.meta?.sender?.name || `Conversa #${conv.id}`}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            {conv.meta?.sender?.phone_number || 'Sem telefone'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ConversationSelector;
