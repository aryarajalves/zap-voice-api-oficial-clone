import React from 'react';
import { Handle, Position } from 'reactflow';
import { FiAlertTriangle, FiTrash2 } from 'react-icons/fi';

const LegacyDateNode = ({ id, data }) => (
    <div className="px-4 py-2 shadow-sm rounded-lg bg-gray-100 dark:bg-gray-800 border border-dashed border-gray-400 opacity-60 min-w-[200px]">
        <Handle type="target" position={Position.Top} className="w-2 h-2 bg-gray-400" />
        <div className="flex items-center gap-2 text-gray-500 italic text-[10px]">
            <FiAlertTriangle />
            <span>Nó de Agendamento Antigo</span>
            <button
                onClick={() => data.onDelete(id)}
                className="ml-auto text-red-500 hover:text-red-700"
            >
                <FiTrash2 size={12} />
            </button>
        </div>
        <p className="text-[9px] text-gray-400 mt-1">Este nó foi substituído pela "Condição Inteligente". Pode deletá-lo.</p>
        <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-gray-400" />
    </div>
);

export default LegacyDateNode;
