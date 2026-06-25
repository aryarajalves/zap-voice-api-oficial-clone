import React from 'react';
import { Handle, Position } from 'reactflow';
import { FiActivity, FiCheck, FiX } from 'react-icons/fi';
import NodeHeader from '../components/NodeHeader';

const WaitEventNode = ({ id, data }) => {
    const eventType = data.eventType || 'compra_aprovada';
    const waitValue = data.waitValue || 1;
    const waitUnit = data.waitUnit || 'hours';

    return (
        <div className="px-4 py-3 shadow-lg rounded-2xl bg-white dark:bg-gray-800 border-2 border-indigo-500 min-w-[290px] max-w-[320px] transition-all hover:shadow-2xl">
            <Handle type="target" position={Position.Left} className="w-3 h-3 bg-indigo-500" />
            
            <NodeHeader
                label="Aguardar Ação"
                icon={FiActivity}
                colorClass="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400"
                onDelete={() => data.onDelete(id)}
                onDuplicate={() => data.onDuplicate(id)}
                isStart={data.isStart}
                onSetStart={() => data.onSetStart(id, 'waitEventNode')}
            />

            <div className="space-y-3 mt-2 px-1">
                {/* Evento de Parada / Monitoramento */}
                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Evento para Aguardar</label>
                    <select
                        className="nodrag nopan w-full text-xs border rounded p-2 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-semibold focus:ring-2 focus:ring-indigo-500 outline-none border-gray-300 dark:border-gray-700"
                        value={eventType}
                        onChange={(e) => data.onChange(id, { eventType: e.target.value })}
                    >
                        <option value="compra_aprovada">Aprovação de Compra</option>
                        <option value="boleto_gerado">Boleto Gerado</option>
                        <option value="pix_gerado">Pix Gerado</option>
                        <option value="carrinho_abandonado">Carrinho Abandonado</option>
                        <option value="checkout_iniciado">Checkout Iniciado</option>
                        <option value="clique_no_link">Clique no Link</option>
                    </select>
                </div>

                {/* Prazo Máximo de Espera */}
                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Tempo Máximo de Espera</label>
                    <div className="flex gap-2">
                        <input
                            type="number"
                            min="1"
                            className="nodrag nopan w-20 text-xs p-2 border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none border-gray-300 dark:border-gray-700"
                            value={waitValue}
                            onChange={(e) => data.onChange(id, { waitValue: parseInt(e.target.value) || 1 })}
                        />
                        <select
                            className="nodrag nopan flex-1 text-xs border rounded p-2 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-semibold focus:ring-2 focus:ring-indigo-500 outline-none border-gray-300 dark:border-gray-700"
                            value={waitUnit}
                            onChange={(e) => data.onChange(id, { waitUnit: e.target.value })}
                        >
                            <option value="minutes">Minutos</option>
                            <option value="hours">Horas</option>
                            <option value="days">Dias</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Portas de Saída */}
            <div className="flex justify-between mt-4 pt-2 border-t border-gray-100 dark:border-gray-700 relative">
                <div className="flex flex-col items-start relative">
                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-wider select-none flex items-center gap-0.5">
                        <FiCheck className="stroke-[3]" /> Realizado
                    </span>
                    <Handle type="source" position={Position.Right} id="realizado" className="w-3 h-3 bg-emerald-500 !left-6" />
                </div>
                <div className="flex flex-col items-end relative">
                    <span className="text-[9px] font-black text-rose-500 uppercase tracking-wider select-none flex items-center gap-0.5">
                        <FiX className="stroke-[3]" /> Não Realizado
                    </span>
                    <Handle type="source" position={Position.Right} id="nao_realizado" className="w-3 h-3 bg-rose-500 !left-auto !right-6" />
                </div>
            </div>
        </div>
    );
};

export default WaitEventNode;
