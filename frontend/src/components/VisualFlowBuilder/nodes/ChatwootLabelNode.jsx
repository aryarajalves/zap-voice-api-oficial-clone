import React, { useState, useEffect, useMemo } from 'react';
import { Handle, Position } from 'reactflow';
import { FiTag, FiX } from 'react-icons/fi';
import { useClient } from '../../../contexts/ClientContext';
import { fetchWithAuth } from '../../../AuthContext';
import { API_URL } from '../../../config';
import NodeHeader from '../components/NodeHeader';

const ChatwootLabelNode = ({ id, data }) => {
    const { activeClient } = useClient();
    const [labels, setLabels] = useState([]);
    const [loading, setLoading] = useState(true);

    const selectedLabels = useMemo(() => {
        if (!data.label) return [];
        return data.label.split(',').map(l => l.trim()).filter(l => l);
    }, [data.label]);

    useEffect(() => {
        if (!activeClient) return;
        setLoading(true);
        fetchWithAuth(`${API_URL}/chatwoot/labels`, { headers: { 'X-Client-ID': activeClient.id } })
            .then(res => res.json())
            .then(setLabels)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [activeClient]);

    const toggleLabel = (labelTitle) => {
        let newList;
        if (selectedLabels.includes(labelTitle)) {
            newList = selectedLabels.filter(l => l !== labelTitle);
        } else {
            newList = [...selectedLabels, labelTitle];
        }
        data.onChange(id, { label: newList.join(',') });
    };

    return (
        <div className="px-4 py-3 shadow-lg rounded-xl bg-white dark:bg-gray-800 border-2 border-slate-600 min-w-[260px] transition-all hover:shadow-2xl hover:border-slate-400">
            <Handle type="target" position={Position.Top} className="w-3 h-3 bg-slate-600" />
            <NodeHeader
                label="Etiquetar Chatwoot"
                icon={FiTag}
                colorClass="bg-slate-100 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400"
                onDelete={() => data.onDelete(id)}
                isStart={data.isStart}
            />

            <div className="space-y-4">
                {selectedLabels.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                        {selectedLabels.map(l => (
                            <div key={l} className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-2 py-0.5 rounded-full text-[10px] font-bold border border-slate-200 dark:border-slate-600 group">
                                {l}
                                <button
                                    onClick={() => toggleLabel(l)}
                                    className="text-slate-400 hover:text-red-500 transition"
                                >
                                    <FiX size={10} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">
                        {selectedLabels.length > 0 ? 'Adicionar mais etiquetas' : 'Etiqueta (Chatwoot)'}
                    </label>
                    <select
                        className={`nodrag nopan w-full text-sm p-2 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded border border-gray-200 outline-none ${loading ? 'opacity-50 cursor-wait' : ''}`}
                        value=""
                        onChange={(e) => {
                            if (e.target.value) toggleLabel(e.target.value);
                        }}
                        disabled={loading}
                    >
                        <option value="">{loading ? '🔄 Carregando...' : 'Selecione para adicionar...'}</option>
                        {Array.isArray(labels) && labels
                            .filter(l => !selectedLabels.includes(l.title))
                            .map(l => (
                                <option key={l.id} value={l.title}>{l.title}</option>
                            ))
                        }
                    </select>
                </div>
            </div>

            <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-slate-600" />
        </div>
    );
};

export default ChatwootLabelNode;
