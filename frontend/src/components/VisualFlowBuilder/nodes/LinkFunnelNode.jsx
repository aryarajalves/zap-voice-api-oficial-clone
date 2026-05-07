import React, { useState, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import { FiLink } from 'react-icons/fi';
import { useClient } from '../../../contexts/ClientContext';
import { fetchWithAuth } from '../../../AuthContext';
import { API_URL } from '../../../config';
import NodeHeader from '../components/NodeHeader';

const LinkFunnelNode = ({ id, data }) => {
    const { activeClient } = useClient();
    const [funnels, setFunnels] = useState([]);

    useEffect(() => {
        if (!activeClient) return;
        fetchWithAuth(`${API_URL}/funnels`, { headers: { 'X-Client-ID': activeClient.id } })
            .then(res => res.json())
            .then(setFunnels)
            .catch(console.error);
    }, [activeClient, data.refreshKey]);

    return (
        <div className="px-4 py-3 shadow-lg rounded-xl bg-white dark:bg-gray-800 border-2 border-orange-500 min-w-[240px]">
            <Handle type="target" position={Position.Top} className="w-3 h-3 bg-orange-500" />
            <NodeHeader
                label="Conectar Funil"
                icon={FiLink}
                colorClass="bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400"
                onDelete={() => data.onDelete(id)}
                isStart={data.isStart}
            // No onSetStart
            />

            <select
                className="nodrag nopan w-full text-sm p-2 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded border border-gray-200 outline-none"
                value={data.funnelId || ''}
                onChange={(e) => data.onChange(id, { funnelId: e.target.value })}
            >
                <option value="">Selecione um Funil...</option>
                {funnels.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                ))}
            </select>
        </div>
    );
};

export default LinkFunnelNode;
