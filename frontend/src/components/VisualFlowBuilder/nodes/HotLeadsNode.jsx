import React, { useState, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import { FiZap, FiUsers, FiSliders, FiFileText } from 'react-icons/fi';
import { useClient } from '../../../contexts/ClientContext';
import { fetchWithAuth } from '../../../AuthContext';
import { API_URL } from '../../../config';
import NodeHeader from '../components/NodeHeader';

const HotLeadsNode = ({ id, data }) => {
    const { activeClient } = useClient();
    
    // Configurações
    const alertName = data.alertName || 'Interesse Mentoria';
    const priority = data.priority || 'Média';
    const contextMessage = data.contextMessage || '';
    const sellersQueueType = data.sellersQueueType || 'all'; // all, selected
    const selectedSellerIds = data.selectedSellerIds || [];
    const distributionMode = data.distributionMode || 'round_robin'; // round_robin, random

    // Lista de vendedores carregada do backend
    const [sellers, setSellers] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!activeClient) return;
        setLoading(true);
        fetchWithAuth(`${API_URL}/hot-leads/sellers`, { headers: { 'X-Client-ID': activeClient.id } })
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setSellers(data);
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [activeClient]);

    const updateNodeData = (updates) => {
        data.onChange(id, { ...data, ...updates });
    };

    const toggleSeller = (sellerId) => {
        const idNum = parseInt(sellerId);
        let newList;
        if (selectedSellerIds.includes(idNum)) {
            newList = selectedSellerIds.filter(id => id !== idNum);
        } else {
            newList = [...selectedSellerIds, idNum];
        }
        updateNodeData({ selectedSellerIds: newList });
    };

    return (
        <div className="px-4 py-3 shadow-lg rounded-2xl bg-white dark:bg-gray-800 border-2 border-orange-500 min-w-[300px] transition-all hover:shadow-2xl hover:border-orange-400">
            <Handle type="target" position={Position.Left} className="w-3 h-3 bg-orange-500" />
            
            <NodeHeader
                label="Leads Quentes"
                icon={FiZap}
                colorClass="bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400"
                onDelete={() => data.onDelete(id)}
                onDuplicate={() => data.onDuplicate(id)}
                isStart={data.isStart}
            />

            <div className="space-y-3 mt-2 px-1 nodrag nowheel overflow-y-auto max-h-[350px]">
                {/* Nome do Alerta */}
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1">
                        <FiSliders size={10} /> Nome do Alerta / Categoria
                    </label>
                    <input
                        type="text"
                        value={alertName}
                        onChange={(e) => updateNodeData({ alertName: e.target.value })}
                        className="w-full text-xs p-1.5 border rounded bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700 focus:border-orange-500 nodrag"
                        placeholder="Ex: Interesse Mentoria"
                    />
                </div>

                {/* Prioridade */}
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">
                        Prioridade
                    </label>
                    <select
                        value={priority}
                        onChange={(e) => updateNodeData({ priority: e.target.value })}
                        className="w-full text-xs p-1.5 border rounded bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700 focus:border-orange-500 nodrag"
                    >
                        <option value="Alta">🔴 Alta</option>
                        <option value="Média">🟡 Média</option>
                        <option value="Baixa">🟢 Baixa</option>
                    </select>
                </div>

                {/* Modo de Distribuição */}
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">
                        Distribuição de Leads
                    </label>
                    <select
                        value={distributionMode}
                        onChange={(e) => updateNodeData({ distributionMode: e.target.value })}
                        className="w-full text-xs p-1.5 border rounded bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700 focus:border-orange-500 nodrag"
                    >
                        <option value="round_robin">🔄 Rodízio Sequencial (Round Robin)</option>
                        <option value="random">🎲 Distribuição Aleatória</option>
                    </select>
                </div>

                {/* Tipo de Fila */}
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">
                        Fila de Vendedores
                    </label>
                    <select
                        value={sellersQueueType}
                        onChange={(e) => updateNodeData({ sellersQueueType: e.target.value })}
                        className="w-full text-xs p-1.5 border rounded bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700 focus:border-orange-500 nodrag"
                    >
                        <option value="all">👥 Todos os Vendedores</option>
                        <option value="selected">👤 Selecionar Individualmente</option>
                    </select>
                </div>

                {/* Seleção de Vendedores (Se selected) */}
                {sellersQueueType === 'selected' && (
                    <div className="flex flex-col gap-1 border border-gray-100 dark:border-gray-700 p-2 rounded bg-gray-50 dark:bg-gray-900/50">
                        <label className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">
                            Selecionar Vendedores
                        </label>
                        {loading ? (
                            <span className="text-[10px] text-gray-400">Carregando vendedores...</span>
                        ) : sellers.length === 0 ? (
                            <span className="text-[10px] text-gray-400 italic">Nenhum vendedor cadastrado</span>
                        ) : (
                            <div className="max-h-24 overflow-y-auto space-y-1 nodrag pr-1">
                                {sellers.map(s => (
                                    <label key={s.id} className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedSellerIds.includes(s.id)}
                                            onChange={() => toggleSeller(s.id)}
                                            className="rounded text-orange-500 focus:ring-orange-400"
                                        />
                                        <span className="truncate">{s.full_name || s.email}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Mensagem de Contexto */}
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1">
                        <FiFileText size={10} /> Notas / Contexto do Lead
                    </label>
                    <textarea
                        value={contextMessage}
                        onChange={(e) => updateNodeData({ contextMessage: e.target.value })}
                        className="w-full text-xs p-1.5 border rounded bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700 focus:border-orange-500 nodrag h-16 resize-none"
                        placeholder="Ex: Clicou no botão Falar com Especialista"
                    />
                </div>
            </div>

            <div className="flex justify-end pt-2 mt-2 border-t border-gray-100 dark:border-gray-700/50">
                <span className="text-[9px] font-bold text-orange-500 uppercase tracking-wider mr-2">continuar</span>
            </div>

            <Handle id="default" type="source" position={Position.Right} className="w-3 h-3 bg-orange-500" />
        </div>
    );
};

export default HotLeadsNode;
