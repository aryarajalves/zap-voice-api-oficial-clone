import React from 'react';
import { Handle, Position } from 'reactflow';
import { FiCalendar } from 'react-icons/fi';
import NodeHeader from '../components/NodeHeader';

const DateNode = ({ id, data }) => {
    const mode = data.mode || 'date'; // 'date', 'time', 'datetime'

    return (
        <div className="px-4 py-3 shadow-lg rounded-xl bg-white dark:bg-gray-800 border-2 border-violet-500 min-w-[250px] backdrop-blur-md">
            {!data.isStart && <Handle type="target" position={Position.Top} className="w-3 h-3 bg-violet-500" />}
            
            <NodeHeader
                label="Agendamento Data"
                icon={FiCalendar}
                colorClass="bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400"
                onDelete={() => data.onDelete(id)}
                isStart={data.isStart}
                onSetStart={() => data.onSetStart(id, 'dateNode')}
            />

            <div className="space-y-3 mt-2">
                {/* Toggle Mode */}
                <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-lg">
                    <button
                        onClick={() => data.onChange(id, { mode: 'date' })}
                        className={`flex-1 py-1 text-[9px] font-bold rounded-md transition ${mode === 'date' ? 'bg-white dark:bg-gray-700 shadow-sm text-violet-600' : 'text-gray-400'}`}
                    >
                        DATA
                    </button>
                    <button
                        onClick={() => data.onChange(id, { mode: 'time' })}
                        className={`flex-1 py-1 text-[9px] font-bold rounded-md transition ${mode === 'time' ? 'bg-white dark:bg-gray-700 shadow-sm text-violet-600' : 'text-gray-400'}`}
                    >
                        HORÁRIO
                    </button>
                    <button
                        onClick={() => data.onChange(id, { mode: 'datetime' })}
                        className={`flex-1 py-1 text-[9px] font-bold rounded-md transition ${mode === 'datetime' ? 'bg-white dark:bg-gray-700 shadow-sm text-violet-600' : 'text-gray-400'}`}
                    >
                        AMBOS
                    </button>
                </div>

                {/* Inputs Baseados no Modo */}
                {mode === 'date' && (
                    <div className="space-y-1 animate-in fade-in duration-200">
                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Data Específica</label>
                        <input
                            type="date"
                            className="nodrag nopan w-full p-2 text-sm border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-semibold text-center focus:ring-2 focus:ring-violet-500 border-gray-300 dark:border-gray-700"
                            value={data.dateValue || ''}
                            onChange={(e) => data.onChange(id, { dateValue: e.target.value })}
                        />
                    </div>
                )}

                {mode === 'time' && (
                    <div className="space-y-1 animate-in fade-in duration-200">
                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Horário Diário</label>
                        <input
                            type="time"
                            className="nodrag nopan w-full p-2 text-sm border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-semibold text-center focus:ring-2 focus:ring-violet-500 border-gray-300 dark:border-gray-700"
                            value={data.timeValue || '12:00'}
                            onChange={(e) => data.onChange(id, { timeValue: e.target.value })}
                        />
                    </div>
                )}

                {mode === 'datetime' && (
                    <div className="space-y-2 animate-in fade-in duration-200">
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Data</label>
                            <input
                                type="date"
                                className="nodrag nopan w-full p-2 text-sm border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-semibold text-center focus:ring-2 focus:ring-violet-500 border-gray-300 dark:border-gray-700"
                                value={data.dateValue || ''}
                                onChange={(e) => data.onChange(id, { dateValue: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Horário</label>
                            <input
                                type="time"
                                className="nodrag nopan w-full p-2 text-sm border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-semibold text-center focus:ring-2 focus:ring-violet-500 border-gray-300 dark:border-gray-700"
                                value={data.timeValue || '12:00'}
                                onChange={(e) => data.onChange(id, { timeValue: e.target.value })}
                            />
                        </div>
                    </div>
                )}

                {/* Configuração de Desvio por Atraso */}
                <div className="pt-2 border-t border-gray-100 dark:border-gray-700/50 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                            type="checkbox"
                            className="w-3.5 h-3.5 text-violet-600 rounded border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-violet-500"
                            checked={data.enableLateBypass || false}
                            onChange={(e) => data.onChange(id, { enableLateBypass: e.target.checked })}
                        />
                        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 group-hover:text-violet-500 transition uppercase tracking-wider">Desvio por Atraso</span>
                    </label>

                    {data.enableLateBypass && (
                        <div className="flex gap-2 items-center animate-in slide-in-from-top-1 duration-200">
                            <div className="flex-grow">
                                <input
                                    type="number"
                                    min="1"
                                    className="nodrag nopan w-full p-1.5 text-xs border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-bold text-center focus:ring-2 focus:ring-violet-500 border-gray-300 dark:border-gray-700"
                                    placeholder="Tempo"
                                    value={data.maxDelayValue || 3}
                                    onChange={(e) => data.onChange(id, { maxDelayValue: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="flex-grow">
                                <select
                                    className="nodrag nopan w-full p-1.5 text-xs border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-semibold focus:ring-2 focus:ring-violet-500 border-gray-300 dark:border-gray-700"
                                    value={data.maxDelayUnit || 'hours'}
                                    onChange={(e) => data.onChange(id, { maxDelayUnit: e.target.value })}
                                >
                                    <option value="minutes">Minutos</option>
                                    <option value="hours">Horas</option>
                                </select>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {data.enableLateBypass ? (
                <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 p-2 rounded-lg relative border border-green-100 dark:border-green-900/30 shadow-sm">
                        <span className="text-[10px] font-black text-green-700 dark:text-green-400 uppercase flex items-center gap-1">⏰ No Horário</span>
                        <Handle id="default" type="source" position={Position.Right} className="w-3 h-3 bg-green-500 !-right-1.5" />
                    </div>
                    <div className="flex items-center justify-between bg-red-50 dark:bg-red-900/20 p-2 rounded-lg relative border border-red-100 dark:border-red-900/30 shadow-sm">
                        <span className="text-[10px] font-black text-red-700 dark:text-red-400 uppercase flex items-center gap-1">⚠️ Atrasado</span>
                        <Handle id="late" type="source" position={Position.Right} className="w-3 h-3 bg-red-500 !-right-1.5" />
                    </div>
                </div>
            ) : (
                <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-violet-500" />
            )}
        </div>
    );
};

export default DateNode;
