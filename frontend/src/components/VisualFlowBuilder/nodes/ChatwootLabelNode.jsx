import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Handle, Position } from 'reactflow';
import { FiTag, FiX, FiChevronDown, FiSearch } from 'react-icons/fi';
import { useClient } from '../../../contexts/ClientContext';
import { fetchWithAuth } from '../../../AuthContext';
import { API_URL } from '../../../config';
import NodeHeader from '../components/NodeHeader';

const ChatwootLabelNode = ({ id, data }) => {
    const { activeClient } = useClient();
    const [labels, setLabels] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Estados independentes de dropdown e busca para Adicionar e Remover etiquetas
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isRemoveOpen, setIsRemoveOpen] = useState(false);
    const [addSearch, setAddSearch] = useState('');
    const [removeSearch, setRemoveSearch] = useState('');
    
    const addDropdownRef = useRef(null);
    const removeDropdownRef = useRef(null);

    const selectedAddLabels = useMemo(() => {
        if (!data.label) return [];
        return data.label.split(',').map(l => l.trim()).filter(l => l);
    }, [data.label]);

    const selectedRemoveLabels = useMemo(() => {
        if (!data.remove_label) return [];
        return data.remove_label.split(',').map(l => l.trim()).filter(l => l);
    }, [data.remove_label]);

    useEffect(() => {
        if (!activeClient) return;
        if (data.labels && Array.isArray(data.labels)) {
            setLabels(data.labels);
            setLoading(false);
            return;
        }
        setLoading(true);
        fetchWithAuth('/api/chatwoot/labels')
            .then(res => res.ok ? res.json() : [])
            .then(data => {
                setLabels(Array.isArray(data) ? data : (data.labels || []));
            })
            .catch(() => setLabels([]))
            .finally(() => setLoading(false));
    }, [activeClient, data.labels]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (addDropdownRef.current && !addDropdownRef.current.contains(event.target)) {
                setIsAddOpen(false);
            }
            if (removeDropdownRef.current && !removeDropdownRef.current.contains(event.target)) {
                setIsRemoveOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleAddLabel = (labelTitle) => {
        let newList;
        if (selectedAddLabels.includes(labelTitle)) {
            newList = selectedAddLabels.filter(l => l !== labelTitle);
        } else {
            newList = [...selectedAddLabels, labelTitle];
        }
        data.onChange(id, { ...data, label: newList.join(',') });
    };

    const toggleRemoveLabel = (labelTitle) => {
        let newList;
        if (selectedRemoveLabels.includes(labelTitle)) {
            newList = selectedRemoveLabels.filter(l => l !== labelTitle);
        } else {
            newList = [...selectedRemoveLabels, labelTitle];
        }
        data.onChange(id, { ...data, remove_label: newList.join(',') });
    };

    const filteredAddLabels = useMemo(() => {
        if (!Array.isArray(labels)) return [];
        return labels
            .filter(l => !selectedAddLabels.includes(l.title))
            .filter(l => l.title.toLowerCase().includes(addSearch.toLowerCase()));
    }, [labels, selectedAddLabels, addSearch]);

    const filteredRemoveLabels = useMemo(() => {
        if (!Array.isArray(labels)) return [];
        return labels
            .filter(l => !selectedRemoveLabels.includes(l.title))
            .filter(l => l.title.toLowerCase().includes(removeSearch.toLowerCase()));
    }, [labels, selectedRemoveLabels, removeSearch]);

    return (
        <div className="px-4 py-3 shadow-lg rounded-xl bg-white dark:bg-gray-800 border-2 border-slate-600 min-w-[280px] transition-all hover:shadow-2xl hover:border-slate-400">
            <Handle type="target" position={Position.Left} className="w-3 h-3 bg-slate-600" />
            <NodeHeader
                label="Etiquetar Chatwoot"
                icon={FiTag}
                colorClass="bg-slate-100 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400"
                onDelete={() => data.onDelete(id)}
                onDuplicate={() => data.onDuplicate(id)}
                isStart={data.isStart}
            />

            <div className="space-y-4">
                {/* SEÇÃO: ADICIONAR ETIQUETA */}
                <div className="border-b border-slate-100 dark:border-slate-700/50 pb-3">
                    <label className="text-[10px] font-bold text-emerald-500 uppercase mb-1 block">
                        Adicionar Etiquetas
                    </label>
                    {selectedAddLabels.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                            {selectedAddLabels.map(l => (
                                <div key={l} className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-bold border border-emerald-200 dark:border-emerald-800 group">
                                    {l}
                                    <button
                                        onClick={() => toggleAddLabel(l)}
                                        className="text-emerald-400 hover:text-red-500 transition"
                                    >
                                        <FiX size={10} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="relative" ref={addDropdownRef}>
                        <div
                            onClick={() => !loading && setIsAddOpen(!isAddOpen)}
                            className={`nodrag nopan w-full text-xs p-2 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded border border-gray-200 dark:border-gray-700 outline-none flex justify-between items-center cursor-pointer transition-all hover:bg-gray-100 dark:hover:bg-gray-800 ${loading ? 'opacity-50 cursor-wait' : ''}`}
                            data-testid="chatwoot-label-dropdown-trigger"
                        >
                            <span className="truncate">
                                {loading ? '🔄 Carregando...' : 'Selecione para adicionar...'}
                            </span>
                            <FiChevronDown className={`text-gray-400 transition-transform ${isAddOpen ? 'rotate-180' : ''}`} />
                        </div>

                        {isAddOpen && (
                            <div className="nodrag nopan absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded shadow-xl max-h-60 overflow-hidden flex flex-col">
                                <div className="p-2 border-b border-gray-100 dark:border-gray-800 flex items-center gap-1">
                                    <FiSearch className="text-gray-400 text-xs" />
                                    <input
                                        type="text"
                                        className="w-full text-xs p-1 bg-transparent text-gray-900 dark:text-gray-100 outline-none"
                                        placeholder="Buscar etiqueta..."
                                        value={addSearch}
                                        onChange={(e) => setAddSearch(e.target.value)}
                                        autoFocus
                                        data-testid="chatwoot-label-search-input"
                                    />
                                </div>
                                <div className="overflow-y-auto max-h-40 flex-1">
                                    {filteredAddLabels.map(l => (
                                        <div
                                            key={l.id}
                                            className="p-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer truncate"
                                            onClick={() => {
                                                toggleAddLabel(l.title);
                                                setAddSearch('');
                                                setIsAddOpen(false);
                                            }}
                                            data-testid={`label-option-${l.title}`}
                                        >
                                            {l.title}
                                        </div>
                                    ))}
                                    {filteredAddLabels.length === 0 && (
                                        <div className="p-3 text-center text-xs text-gray-400 italic">
                                            Nenhuma etiqueta encontrada
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* SEÇÃO: REMOVER ETIQUETA */}
                <div>
                    <label className="text-[10px] font-bold text-rose-500 uppercase mb-1 block">
                        Remover Etiquetas
                    </label>
                    {selectedRemoveLabels.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                            {selectedRemoveLabels.map(l => (
                                <div key={l} className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded-full text-[10px] font-bold border border-rose-200 dark:border-rose-800 group">
                                    {l}
                                    <button
                                        onClick={() => toggleRemoveLabel(l)}
                                        className="text-rose-400 hover:text-red-500 transition"
                                    >
                                        <FiX size={10} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="relative" ref={removeDropdownRef}>
                        <div
                            onClick={() => !loading && setIsRemoveOpen(!isRemoveOpen)}
                            className={`nodrag nopan w-full text-xs p-2 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded border border-gray-200 dark:border-gray-700 outline-none flex justify-between items-center cursor-pointer transition-all hover:bg-gray-100 dark:hover:bg-gray-800 ${loading ? 'opacity-50 cursor-wait' : ''}`}
                            data-testid="chatwoot-remove-label-dropdown-trigger"
                        >
                            <span className="truncate">
                                {loading ? '🔄 Carregando...' : 'Selecione para remover...'}
                            </span>
                            <FiChevronDown className={`text-gray-400 transition-transform ${isRemoveOpen ? 'rotate-180' : ''}`} />
                        </div>

                        {isRemoveOpen && (
                            <div className="nodrag nopan absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded shadow-xl max-h-60 overflow-hidden flex flex-col">
                                <div className="p-2 border-b border-gray-100 dark:border-gray-800 flex items-center gap-1">
                                    <FiSearch className="text-gray-400 text-xs" />
                                    <input
                                        type="text"
                                        className="w-full text-xs p-1 bg-transparent text-gray-900 dark:text-gray-100 outline-none"
                                        placeholder="Buscar etiqueta..."
                                        value={removeSearch}
                                        onChange={(e) => setRemoveSearch(e.target.value)}
                                        autoFocus
                                        data-testid="chatwoot-remove-label-search-input"
                                    />
                                </div>
                                <div className="overflow-y-auto max-h-40 flex-1">
                                    {filteredRemoveLabels.map(l => (
                                        <div
                                            key={l.id}
                                            className="p-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer truncate"
                                            onClick={() => {
                                                toggleRemoveLabel(l.title);
                                                setRemoveSearch('');
                                                setIsRemoveOpen(false);
                                            }}
                                            data-testid={`remove-label-option-${l.title}`}
                                        >
                                            {l.title}
                                        </div>
                                    ))}
                                    {filteredRemoveLabels.length === 0 && (
                                        <div className="p-3 text-center text-xs text-gray-400 italic">
                                            Nenhuma etiqueta encontrada
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <Handle type="source" position={Position.Right} className="w-3 h-3 bg-slate-600" />
        </div>
    );
};

export default ChatwootLabelNode;

