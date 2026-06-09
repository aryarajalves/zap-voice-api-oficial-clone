import React from 'react';
import { Handle, Position } from 'reactflow';
import { FiClock } from 'react-icons/fi';
import NodeHeader from '../components/NodeHeader';

const DelayNode = ({ id, data }) => {
    const useRandom = data.useRandom ?? false;

    return (
        <div className="px-4 py-3 shadow-lg rounded-xl bg-white dark:bg-gray-800 border-2 border-yellow-500 min-w-[240px]">
            {!data.isStart && <Handle type="target" position={Position.Top} className="w-3 h-3 bg-yellow-500" />}
            <NodeHeader
                label="Smart Delay"
                icon={FiClock}
                colorClass="bg-yellow-100 dark:bg-yellow-900/40 text-yellow-600 dark:text-yellow-400"
                onDelete={() => data.onDelete(id)}
                onDuplicate={() => data.onDuplicate(id)}
                isStart={data.isStart}
                onSetStart={() => data.onSetStart(id, 'delayNode')}
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

                {/* Ajuste por Horário Inteligente */}
                <div className="border-t border-gray-100 dark:border-gray-700 my-2 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={data.smartHourAdjust || false}
                            onChange={(e) => data.onChange(id, { smartHourAdjust: e.target.checked })}
                            className="w-3.5 h-3.5 rounded text-yellow-500 focus:ring-yellow-400 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                        />
                        <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase">Ajustar por Horário</span>
                    </label>
                </div>

                {data.smartHourAdjust && (
                    <div className="space-y-2.5 p-2 rounded-lg bg-yellow-50/50 dark:bg-yellow-950/20 border border-yellow-100 dark:border-yellow-900/30 animate-in fade-in duration-200">
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <label className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase block mb-0.5">Horário Limite</label>
                                <input
                                    type="text"
                                    placeholder="18:00"
                                    className="nodrag nopan w-full p-1 text-xs border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-semibold text-center"
                                    value={data.limitHour || '18:00'}
                                    onChange={(e) => data.onChange(id, { limitHour: e.target.value })}
                                />
                            </div>
                            <div className="flex-1">
                                <label className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase block mb-0.5">Margem (Min)</label>
                                <input
                                    type="number"
                                    className="nodrag nopan w-full p-1 text-xs border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-semibold text-center"
                                    value={data.proximityMargin || 30}
                                    onChange={(e) => data.onChange(id, { proximityMargin: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                        </div>

                        {/* Seção 1: Se estiver na margem */}
                        <div className="border-t border-yellow-100 dark:border-yellow-900/30 pt-1.5 space-y-1">
                            <span className="text-[8px] font-extrabold text-yellow-600 dark:text-yellow-400 uppercase block">Se estiver na Margem:</span>
                            <select
                                className="nodrag nopan w-full text-xs border rounded p-1 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                                value={data.approachAction || 'reduce'}
                                onChange={(e) => data.onChange(id, { approachAction: e.target.value })}
                            >
                                <option value="reduce">Reduzir o Tempo</option>
                                <option value="skip">Pular Delay (Passar Direto)</option>
                            </select>

                            {/* Correção de renderização condicional */}
                            {(data.approachAction || 'reduce') === 'reduce' && (
                                <div className="flex gap-2 mt-1 animate-in slide-in-from-top-1 duration-200">
                                    <div className="flex-[3]">
                                        <input
                                            type="number"
                                            className="nodrag nopan w-full p-1 text-xs border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-semibold text-center"
                                            value={data.approachReducedTime || 5}
                                            onChange={(e) => data.onChange(id, { approachReducedTime: parseInt(e.target.value) || 0 })}
                                        />
                                    </div>
                                    <div className="flex-[4]">
                                        <select
                                            className="nodrag nopan w-full text-xs border rounded p-1 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                                            value={data.approachReducedUnit || 'minutes'}
                                            onChange={(e) => data.onChange(id, { approachReducedUnit: e.target.value })}
                                        >
                                            <option value="seconds">Segundos</option>
                                            <option value="minutes">Minutos</option>
                                            <option value="hours">Horas</option>
                                            <option value="days">Dias</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Seção 2: Se já tiver passado do horário limite */}
                        <div className="border-t border-yellow-100 dark:border-yellow-900/30 pt-1.5 space-y-1">
                            <span className="text-[8px] font-extrabold text-yellow-600 dark:text-yellow-400 uppercase block">Se já passou do Limite:</span>
                            <select
                                className="nodrag nopan w-full text-xs border rounded p-1 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                                value={data.pastAction || 'skip'}
                                onChange={(e) => data.onChange(id, { pastAction: e.target.value })}
                            >
                                <option value="skip">Pular Delay (Passar Direto)</option>
                                <option value="postpone">Adiar p/ o dia seguinte</option>
                                <option value="reduce">Reduzir o Tempo</option>
                            </select>

                            {/* Correção de renderização condicional */}
                            {(data.pastAction || 'skip') === 'reduce' && (
                                <div className="flex gap-2 mt-1 animate-in slide-in-from-top-1 duration-200">
                                    <div className="flex-[3]">
                                        <input
                                            type="number"
                                            className="nodrag nopan w-full p-1 text-xs border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-semibold text-center"
                                            value={data.pastReducedTime || 5}
                                            onChange={(e) => data.onChange(id, { pastReducedTime: parseInt(e.target.value) || 0 })}
                                        />
                                    </div>
                                    <div className="flex-[4]">
                                        <select
                                            className="nodrag nopan w-full text-xs border rounded p-1 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                                            value={data.pastReducedUnit || 'minutes'}
                                            onChange={(e) => data.onChange(id, { pastReducedUnit: e.target.value })}
                                        >
                                            <option value="seconds">Segundos</option>
                                            <option value="minutes">Minutos</option>
                                            <option value="hours">Horas</option>
                                            <option value="days">Dias</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* Correção de renderização condicional */}
                            {(data.pastAction || 'skip') === 'postpone' && (
                                <div className="mt-1 animate-in slide-in-from-top-1 duration-200">
                                    <label className="text-[8px] font-bold text-gray-400 dark:text-gray-500 uppercase block mb-0.5">Horário de Retomada</label>
                                    <input
                                        type="text"
                                        placeholder="08:00"
                                        className="nodrag nopan w-full p-1 text-xs border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-semibold text-center"
                                        value={data.pastPostponeHour || '08:00'}
                                        onChange={(e) => data.onChange(id, { pastPostponeHour: e.target.value })}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {useRandom && (
                    <p className="text-[9px] text-yellow-600 dark:text-yellow-400 font-medium italic animate-pulse text-center">
                        🎲 Sorteando tempo no intervalo
                    </p>
                )}
            </div>
            
            {/* Portas de Saída Inteligentes Dinâmicas */}
            {data.smartHourAdjust ? (
                <>
                    <Handle type="source" position={Position.Bottom} id="default" className="w-3 h-3 bg-yellow-500" style={{ left: '20%', backgroundColor: '#eab308', border: '1px solid white' }} />
                    <Handle type="source" position={Position.Bottom} id="approach" className="w-3 h-3 bg-yellow-500" style={{ left: '50%', backgroundColor: '#eab308', border: '1px solid white' }} />
                    <Handle type="source" position={Position.Bottom} id="past" className="w-3 h-3 bg-yellow-500" style={{ left: '80%', backgroundColor: '#eab308', border: '1px solid white' }} />
                    
                    <div className="flex justify-between text-[7px] font-extrabold uppercase mt-2.5 px-0.5 pt-1 border-t border-gray-100 dark:border-gray-700">
                        <span className="text-yellow-600 dark:text-yellow-400">Padrão</span>
                        <span className="text-yellow-600 dark:text-yellow-400">Na Margem</span>
                        <span className="text-yellow-600 dark:text-yellow-400">Pós-Limite</span>
                    </div>
                </>
            ) : (
                <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-yellow-500" />
            )}
        </div>
    );
};

export default DelayNode;
