import React from 'react';
import { Handle, Position } from 'reactflow';
import { FiTarget } from 'react-icons/fi';
import NodeHeader from '../components/NodeHeader';

const PixelNode = ({ id, data }) => {
    const pixelId = data.pixelId || '';
    const accessToken = data.accessToken || '';
    const eventName = data.eventName || 'Lead';
    const value = data.value || '';
    const currency = data.currency || 'BRL';

    return (
        <div className="px-4 py-3 shadow-lg rounded-2xl bg-white dark:bg-gray-800 border-2 border-rose-500 min-w-[280px]">
            <Handle type="target" position={Position.Top} className="w-3 h-3 bg-rose-500" />
            
            <NodeHeader
                label="Pixel de Conversão (Meta CAPI)"
                icon={FiTarget}
                colorClass="bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400"
                onDelete={() => data.onDelete(id)}
                onDuplicate={() => data.onDuplicate(id)}
                isStart={data.isStart}
                onSetStart={() => data.onSetStart(id, 'pixelNode')}
            />

            <div className="space-y-3 mt-2 px-1">
                {/* ID do Pixel */}
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase block">ID do Pixel</label>
                    <input
                        type="text"
                        placeholder="Ex: 1234567890"
                        autoComplete="off"
                        className="nodrag nopan w-full text-xs p-2 border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm focus:ring-2 focus:ring-rose-500 outline-none border-gray-300 dark:border-gray-700 font-mono"
                        value={pixelId}
                        onChange={(e) => data.onChange(id, { pixelId: e.target.value })}
                    />
                </div>

                {/* Token de Acesso */}
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase block">Token de Acesso (CAPI)</label>
                    <input
                        type="password"
                        placeholder="EAAB..."
                        autoComplete="new-password"
                        className="nodrag nopan w-full text-xs p-2 border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm focus:ring-2 focus:ring-rose-500 outline-none border-gray-300 dark:border-gray-700 font-mono"
                        value={accessToken}
                        onChange={(e) => data.onChange(id, { accessToken: e.target.value })}
                    />
                </div>

                {/* Nome do Evento */}
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase block">Nome do Evento</label>
                    <select
                        className="nodrag nopan w-full text-xs border rounded p-2 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-semibold focus:ring-2 focus:ring-rose-500 outline-none border-gray-300 dark:border-gray-700"
                        value={eventName}
                        onChange={(e) => data.onChange(id, { eventName: e.target.value })}
                    >
                        <option value="Lead">🏷️ Lead</option>
                        <option value="InitiateCheckout">🛒 InitiateCheckout (Iniciar Checkout)</option>
                        <option value="Purchase">💰 Purchase (Compra)</option>
                        <option value="Contact">📞 Contact (Contato)</option>
                        <option value="ViewContent">📄 ViewContent (Visualizar Página)</option>
                    </select>
                </div>

                {/* Valor e Moeda (Opcionais) */}
                <div className="flex gap-2">
                    <div className="w-2/3 flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase block">Valor (Opcional)</label>
                        <input
                            type="number"
                            placeholder="Ex: 97.00"
                            className="nodrag nopan w-full text-xs p-2 border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm focus:ring-2 focus:ring-rose-500 outline-none border-gray-300 dark:border-gray-700"
                            value={value}
                            onChange={(e) => data.onChange(id, { value: e.target.value })}
                        />
                    </div>
                    <div className="w-1/3 flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase block">Moeda</label>
                        <select
                            className="nodrag nopan w-full text-xs border rounded p-2 bg-gray-55 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-semibold focus:ring-2 focus:ring-rose-500 outline-none border-gray-300 dark:border-gray-700"
                            value={currency}
                            onChange={(e) => data.onChange(id, { currency: e.target.value })}
                        >
                            <option value="BRL">BRL (R$)</option>
                            <option value="USD">USD ($)</option>
                            <option value="EUR">EUR (€)</option>
                        </select>
                    </div>
                </div>
            </div>

            <Handle type="source" position={Position.Bottom} id="default" className="w-3 h-3 bg-rose-500" />
        </div>
    );
};

export default PixelNode;
