import React from 'react';
import { Handle, Position } from 'reactflow';
import { FiClock, FiCheck, FiX } from 'react-icons/fi';
import NodeHeader from '../components/NodeHeader';

const CheckWindowNode = ({ id, data }) => {
    return (
        <div className="px-4 py-3 shadow-lg rounded-2xl bg-white dark:bg-gray-800 border-2 border-indigo-500 min-w-[280px] max-w-[320px] transition-all hover:shadow-2xl">
            <Handle type="target" position={Position.Left} className="w-3 h-3 bg-indigo-500" />
            
            <NodeHeader
                label="Verificar Janela 24h"
                icon={FiClock}
                colorClass="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400"
                onDelete={() => data.onDelete(id)}
                onDuplicate={() => data.onDuplicate(id)}
                isStart={data.isStart}
                onSetStart={() => data.onSetStart(id, 'checkWindowNode')}
            />

            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 leading-relaxed bg-gray-55 dark:bg-gray-900 p-2.5 rounded border border-gray-150 dark:border-gray-850">
                Verifica se o cliente interagiu nas últimas 24h. Roteia o fluxo baseado no status da janela.
            </div>

            {/* Portas de Saída */}
            <div className="flex justify-between mt-4 pt-2 border-t border-gray-100 dark:border-gray-700 relative">
                <div className="flex flex-col items-start relative">
                    <span className="text-[9px] font-black text-indigo-500 uppercase tracking-wider select-none flex items-center gap-0.5">
                        <FiCheck className="stroke-[3]" /> Aberta
                    </span>
                    <Handle type="source" position={Position.Right} id="open" className="w-3 h-3 bg-indigo-500 !left-6" />
                </div>
                <div className="flex flex-col items-end relative">
                    <span className="text-[9px] font-black text-rose-500 uppercase tracking-wider select-none flex items-center gap-0.5">
                        <FiX className="stroke-[3]" /> Fechada
                    </span>
                    <Handle type="source" position={Position.Right} id="closed" className="w-3 h-3 bg-rose-500 !left-auto !right-6" />
                </div>
            </div>
        </div>
    );
};

export default CheckWindowNode;
