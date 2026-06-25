import React, { useState, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import { FiTag, FiPlus } from 'react-icons/fi';
import { useClient } from '../../../contexts/ClientContext';
import { fetchWithAuth } from '../../../AuthContext';
import { API_URL } from '../../../config';
import NodeHeader from '../components/NodeHeader';

const LocalSegmentNode = ({ id, data }) => {
    const { activeClient } = useClient();
    const action = data.action || 'add_tag';
    const tagName = data.tagName || '';

    const [existingTags, setExistingTags] = useState([]);
    const [searchQuery, setSearchQuery] = useState(tagName);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Carregar as tags existentes do cliente
    useEffect(() => {
        if (!activeClient) return;
        fetchWithAuth(`${API_URL}/leads/filters`, {}, activeClient.id)
            .then(res => res.json())
            .then(data => {
                if (data && Array.isArray(data.tags)) {
                    setExistingTags(data.tags);
                }
            })
            .catch(console.error);
    }, [activeClient]);

    // Atualizar a query de busca quando a tagName do nó mudar externamente
    useEffect(() => {
        setSearchQuery(tagName);
    }, [tagName]);

    const handleSelectTag = (tag) => {
        data.onChange(id, { tagName: tag });
        setSearchQuery(tag);
        setShowSuggestions(false);
    };

    const handleInputChange = (val) => {
        setSearchQuery(val);
        data.onChange(id, { tagName: val });
        setShowSuggestions(true);
    };

    const handleCreateNewTag = () => {
        if (searchQuery.trim()) {
            data.onChange(id, { tagName: searchQuery.trim() });
            setShowSuggestions(false);
        }
    };

    // Filtrar tags existentes baseando-se na query
    const filteredTags = searchQuery.trim() === ''
        ? existingTags
        : existingTags.filter(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const exactMatch = existingTags.some(t => t.toLowerCase() === searchQuery.trim().toLowerCase());

    return (
        <div className="px-4 py-3 shadow-lg rounded-2xl bg-white dark:bg-gray-800 border-2 border-indigo-500 min-w-[290px]">
            <Handle type="target" position={Position.Left} className="w-3 h-3 bg-indigo-500" />
            
            <NodeHeader
                label="Segmentação Local (Tag / Blacklist)"
                icon={FiTag}
                colorClass="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400"
                onDelete={() => data.onDelete(id)}
                onDuplicate={() => data.onDuplicate(id)}
                isStart={data.isStart}
                onSetStart={() => data.onSetStart(id, 'localSegmentNode')}
            />

            <div className="space-y-4 mt-2 px-1">
                {/* Seleção de Ação */}
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase block">Ação Comercial</label>
                    <select
                        className="nodrag nopan w-full text-xs border rounded p-2 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-semibold focus:ring-2 focus:ring-indigo-500 outline-none border-gray-300 dark:border-gray-700"
                        value={action}
                        onChange={(e) => data.onChange(id, { action: e.target.value })}
                    >
                        <option value="add_tag">🏷️ Adicionar Tag Local</option>
                        <option value="remove_tag">🏷️ Remover Tag Local</option>
                        <option value="block">🚫 Adicionar à Blacklist (Bloquear)</option>
                        <option value="unblock">🟢 Remover da Blacklist (Desbloquear)</option>
                    </select>
                </div>

                {/* Input de Nome da Tag com Busca Inteligente */}
                {(action === 'add_tag' || action === 'remove_tag') && (
                    <div className="flex flex-col gap-1 relative">
                        <label className="text-[10px] font-bold text-gray-400 uppercase block">Nome da Tag</label>
                        <input
                            type="text"
                            placeholder="Buscar ou criar tag..."
                            className="nodrag nopan w-full text-xs p-2 border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none border-gray-300 dark:border-gray-700"
                            value={searchQuery}
                            onChange={(e) => handleInputChange(e.target.value)}
                            onFocus={() => setShowSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        />

                        {/* Caixa de Sugestões de Tags */}
                        {showSuggestions && (
                            <div className="absolute top-full left-0 right-0 mt-1 z-[50] max-h-[160px] overflow-y-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl nodrag nopan premium-scrollbar p-1">
                                {filteredTags.map((tag) => (
                                    <button
                                        key={tag}
                                        type="button"
                                        onClick={() => handleSelectTag(tag)}
                                        className="w-full text-left text-xs px-2.5 py-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-gray-700 dark:text-gray-200 rounded-md transition cursor-pointer font-medium"
                                    >
                                        🏷️ {tag}
                                    </button>
                                ))}

                                {searchQuery.trim() !== '' && !exactMatch && (
                                    <button
                                        type="button"
                                        onClick={handleCreateNewTag}
                                        className="w-full text-left text-xs px-2.5 py-1.5 hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 dark:text-green-400 border-t border-dashed border-gray-100 dark:border-gray-800 rounded-md transition cursor-pointer font-bold flex items-center gap-1.5"
                                    >
                                        <FiPlus size={12} /> Criar tag "{searchQuery.trim()}"
                                    </button>
                                )}

                                {filteredTags.length === 0 && searchQuery.trim() === '' && (
                                    <p className="text-[10px] text-gray-400 italic text-center py-2">Nenhuma tag cadastrada.</p>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Info Text para Blacklist */}
                {(action === 'block' || action === 'unblock') && (
                    <p className="text-[10px] text-gray-400 italic bg-gray-50 dark:bg-gray-900/50 p-2 rounded border border-dashed border-gray-200 dark:border-gray-700 animate-fade-in">
                        {action === 'block' 
                            ? "O número do contato será inserido na Blacklist local do ZapVoice, interrompendo réguas futuras."
                            : "O contato voltará a estar elegível para disparos de novos funis e fluxos no sistema."
                        }
                    </p>
                )}
            </div>

            <Handle type="source" position={Position.Right} id="default" className="w-3 h-3 bg-indigo-500" />
        </div>
    );
};

export default LocalSegmentNode;
