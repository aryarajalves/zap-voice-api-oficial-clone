import React from 'react';
import { Handle, Position } from 'reactflow';
import { FiClock } from 'react-icons/fi';
import NodeHeader from '../components/NodeHeader';

const DelayNode = ({ id, data }) => {
    const useRandom = data.useRandom ?? false;

    return (
        <div className="px-4 py-3 shadow-lg rounded-xl bg-white dark:bg-gray-800 border-2 border-yellow-500 min-w-[240px]">
            <Handle type="target" position={Position.Top} className="w-3 h-3 bg-yellow-500" />
            <NodeHeader
                label="Smart Delay"
                icon={FiClock}
                colorClass="bg-yellow-100 dark:bg-yellow-900/40 text-yellow-600 dark:text-yellow-400"
                onDelete={() => data.onDelete(id)}
                isStart={data.isStart}
            />

            <div className="space-y-3">
                {/* Toggle Mode */}
                <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-lg">
                    <button
                        onClick={() => data.onChange(id, { useRandom: false })}
                        className={`flex-1 py-1 text-[10px] font-bold rounded-md transition ${!useRandom ? 'bg-white dark:bg-gray-700 shadow-sm text-yellow-600' : 'text-gray-400'}`}
                    >
                        FIXO
                    </button>
                    <button
                        onClick={() => data.onChange(id, { useRandom: true })}
                        className={`flex-1 py-1 text-[10px] font-bold rounded-md transition ${useRandom ? 'bg-white dark:bg-gray-700 shadow-sm text-yellow-600' : 'text-gray-400'}`}
                    >
                        ALEATÓRIO
                    </button>
                </div>

                {!useRandom ? (
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Tempo de Espera</label>
                        <input
                            type="number"
                            className="nodrag nopan w-full p-2 text-sm border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-bold text-center"
                            value={data.time || 10}
                            onChange={(e) => data.onChange(id, { time: e.target.value })}
                        />
                    </div>
                ) : (
                    <div className="flex items-center gap-2 animate-fade-in">
                        <div className="flex-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Mínimo</label>
                            <input
                                type="number"
                                className="nodrag nopan w-full p-2 text-sm border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-bold text-center"
                                value={data.minTime || data.time || 10}
                                onChange={(e) => data.onChange(id, { minTime: e.target.value })}
                            />
                        </div>
                        <div className="flex-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Máximo</label>
                            <input
                                type="number"
                                className="nodrag nopan w-full p-2 text-sm border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-bold text-center"
                                value={data.maxTime || data.minTime || data.time || 10}
                                onChange={(e) => data.onChange(id, { maxTime: e.target.value })}
                            />
                        </div>
                    </div>
                )}

                <select
                    className="nodrag nopan w-full text-sm border rounded p-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                    value={data.unit || 'seconds'}
                    onChange={(e) => data.onChange(id, { unit: e.target.value })}
                >
                    <option value="seconds">Segundos</option>
                    <option value="minutes">Minutos</option>
                    <option value="hours">Horas</option>
                    <option value="days">Dias</option>
                </select>

                {useRandom && (
                    <p className="text-[9px] text-yellow-600 dark:text-yellow-400 font-medium italic animate-pulse text-center">
                        🎲 Sorteando tempo no intervalo
                    </p>
                )}
            </div>
            <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-yellow-500" />
        </div>
    );
};

export default DelayNode;
