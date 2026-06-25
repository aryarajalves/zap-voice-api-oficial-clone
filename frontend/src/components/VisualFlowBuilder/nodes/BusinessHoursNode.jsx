import React from 'react';
import { Handle, Position } from 'reactflow';
import { FiClock, FiPlus, FiTrash2 } from 'react-icons/fi';
import NodeHeader from '../components/NodeHeader';

const DAYS_OF_WEEK = [
    { key: '0', label: 'Segunda' },
    { key: '1', label: 'Terça' },
    { key: '2', label: 'Quarta' },
    { key: '3', label: 'Quinta' },
    { key: '4', label: 'Sexta' },
    { key: '5', label: 'Sábado' },
    { key: '6', label: 'Domingo' }
];

const BusinessHoursNode = ({ id, data }) => {
    const schedule = data.schedule || {
        '0': { open: true, periods: [{ start: '08:00', end: '18:00' }] },
        '1': { open: true, periods: [{ start: '08:00', end: '18:00' }] },
        '2': { open: true, periods: [{ start: '08:00', end: '18:00' }] },
        '3': { open: true, periods: [{ start: '08:00', end: '18:00' }] },
        '4': { open: true, periods: [{ start: '08:00', end: '18:00' }] },
        '5': { open: true, periods: [{ start: '08:00', end: '12:00' }] },
        '6': { open: false, periods: [{ start: '08:00', end: '18:00' }] }
    };

    const waitUntilOpen = data.waitUntilOpen || false;

    const handleScheduleChange = (dayKey, updates) => {
        const newSchedule = {
            ...schedule,
            [dayKey]: {
                ...schedule[dayKey],
                ...updates
            }
        };
        data.onChange(id, { schedule: newSchedule });
    };

    const handleAddPeriod = (dayKey) => {
        const config = schedule[dayKey] || { open: true, periods: [] };
        let currentPeriods = config.periods || [];
        if (currentPeriods.length === 0 && config.start && config.end) {
            currentPeriods = [{ start: config.start, end: config.end }];
        }
        const newPeriods = [...currentPeriods, { start: '13:00', end: '18:00' }];
        handleScheduleChange(dayKey, { open: true, periods: newPeriods });
    };

    const handleRemovePeriod = (dayKey, periodIndex) => {
        const config = schedule[dayKey] || { open: true, periods: [] };
        let currentPeriods = config.periods || [];
        if (currentPeriods.length === 0 && config.start && config.end) {
            currentPeriods = [{ start: config.start, end: config.end }];
        }
        const newPeriods = currentPeriods.filter((_, idx) => idx !== periodIndex);
        handleScheduleChange(dayKey, {
            open: newPeriods.length > 0,
            periods: newPeriods
        });
    };

    const handlePeriodTimeChange = (dayKey, periodIndex, field, value) => {
        const config = schedule[dayKey] || { open: true, periods: [] };
        let currentPeriods = config.periods || [];
        if (currentPeriods.length === 0 && config.start && config.end) {
            currentPeriods = [{ start: config.start, end: config.end }];
        }
        const newPeriods = currentPeriods.map((p, idx) => {
            if (idx === periodIndex) {
                return { ...p, [field]: value };
            }
            return p;
        });
        handleScheduleChange(dayKey, { periods: newPeriods });
    };

    return (
        <div className="px-4 py-3 shadow-lg rounded-xl bg-white dark:bg-gray-800 border-2 border-indigo-500 min-w-[340px] backdrop-blur-md">
            {!data.isStart && <Handle type="target" position={Position.Left} className="w-3 h-3 bg-indigo-500" />}
            
            <NodeHeader
                label="Horário Comercial"
                icon={FiClock}
                colorClass="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400"
                onDelete={() => data.onDelete(id)}
                onDuplicate={() => data.onDuplicate(id)}
                isStart={data.isStart}
                onSetStart={() => data.onSetStart(id, 'businessHoursNode')}
            />

            <div className="space-y-3 mt-2">
                {/* O container usa a classe "nowheel" para permitir o scroll vertical do mouse sem interferir no zoom do ReactFlow */}
                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1.5 nodrag nopan nowheel custom-scrollbar">
                    {DAYS_OF_WEEK.map((day) => {
                        const config = schedule[day.key] || { open: false };
                        let periods = config.periods || [];
                        if (periods.length === 0 && config.start && config.end) {
                            periods = [{ start: config.start, end: config.end }];
                        }
                        return (
                            <div key={day.key} className="p-2.5 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-700/30 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 w-16">{day.label}</span>
                                    
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const nextOpen = !config.open;
                                                const defaultPeriods = periods.length > 0 ? periods : [{ start: '08:00', end: '18:00' }];
                                                handleScheduleChange(day.key, {
                                                    open: nextOpen,
                                                    periods: nextOpen ? defaultPeriods : []
                                                });
                                            }}
                                            className={`px-2 py-1 text-[9px] font-extrabold rounded transition ${config.open ? 'bg-indigo-500 text-white' : 'bg-gray-200 dark:bg-gray-750 text-gray-500 dark:text-gray-400'}`}
                                        >
                                            {config.open ? 'ABERTO' : 'FECHADO'}
                                        </button>

                                        {config.open && (
                                            <button
                                                type="button"
                                                onClick={() => handleAddPeriod(day.key)}
                                                className="p-1 text-[9px] font-extrabold rounded bg-gray-100 dark:bg-gray-800 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border border-gray-200 dark:border-gray-700 flex items-center gap-0.5 transition"
                                                title="Adicionar Horário"
                                            >
                                                <FiPlus size={10} />
                                                <span>Add</span>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {config.open && periods.map((period, index) => (
                                    <div key={index} className="flex items-center gap-1.5 justify-end animate-in fade-in duration-200 pl-4">
                                        <input
                                            type="time"
                                            value={period.start || '08:00'}
                                            onChange={(e) => handlePeriodTimeChange(day.key, index, 'start', e.target.value)}
                                            className="p-1 text-[10px] border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-bold"
                                        />
                                        <span className="text-[9px] text-gray-400 font-bold">às</span>
                                        <input
                                            type="time"
                                            value={period.end || '18:00'}
                                            onChange={(e) => handlePeriodTimeChange(day.key, index, 'end', e.target.value)}
                                            className="p-1 text-[10px] border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-bold"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleRemovePeriod(day.key, index)}
                                            className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded transition"
                                            title="Remover horário"
                                        >
                                            <FiTrash2 size={11} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>

                {/* Opção para aguardar horário comercial */}
                <div className="pt-2 border-t border-gray-100 dark:border-gray-700/50 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                            type="checkbox"
                            className="w-3.5 h-3.5 text-indigo-600 rounded border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-indigo-500"
                            checked={waitUntilOpen}
                            onChange={(e) => data.onChange(id, { waitUntilOpen: e.target.checked })}
                        />
                        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 group-hover:text-indigo-500 transition uppercase tracking-wider">Aguardar horário comercial para prosseguir</span>
                    </label>
                </div>

                <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 p-2 rounded-lg relative border border-green-100 dark:border-green-900/30 shadow-sm">
                        <span className="text-[10px] font-black text-green-700 dark:text-green-400 uppercase flex items-center gap-1">🟢 Aberto</span>
                        <Handle id="aberto" type="source" position={Position.Right} className="w-3 h-3 bg-green-500 !-right-1.5" />
                    </div>
                    {!waitUntilOpen && (
                        <div className="flex items-center justify-between bg-red-50 dark:bg-red-900/20 p-2 rounded-lg relative border border-red-100 dark:border-red-900/30 shadow-sm">
                            <span className="text-[10px] font-black text-red-700 dark:text-red-400 uppercase flex items-center gap-1">🔴 Fechado</span>
                            <Handle id="fechado" type="source" position={Position.Right} className="w-3 h-3 bg-red-500 !-right-1.5" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BusinessHoursNode;
