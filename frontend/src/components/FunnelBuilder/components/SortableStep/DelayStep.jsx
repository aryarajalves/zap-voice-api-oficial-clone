import React from 'react';

const DelayStep = ({ step, updateStep }) => {
    return (
        <div className="flex items-center gap-2">
            <span className="text-gray-700 dark:text-gray-300">Aguardar</span>
            <input
                type="number"
                value={step.delay}
                onChange={(e) => updateStep(step.id, 'delay', parseInt(e.target.value))}
                className="w-20 p-2 border border-gray-300 dark:border-gray-500 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                min="1"
            />
            <select
                value={step.timeUnit || 'seconds'}
                onChange={(e) => updateStep(step.id, 'timeUnit', e.target.value)}
                className="p-2 border border-gray-300 dark:border-gray-500 rounded bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
            >
                <option value="seconds">Segundos</option>
                <option value="minutes">Minutos</option>
                <option value="hours">Horas</option>
                <option value="days">Dias</option>
            </select>
        </div>
    );
};

export default DelayStep;
