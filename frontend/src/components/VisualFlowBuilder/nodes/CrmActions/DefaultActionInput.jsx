import React from 'react';
import VariableSelector from '../../components/VariableSelector';

const DefaultActionInput = ({ id, data, action, value }) => {
    return (
        <div className="flex flex-col gap-1 relative pt-1 border-t border-gray-100 dark:border-gray-700/50">
            <div className="flex justify-between items-center mb-0.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase block">
                    {action === 'change_assignee' ? 'ID do Agente' : action === 'set_custom_field' ? 'Campo & Valor (campo:valor)' : 'Valor / Nome'}
                </label>
                <VariableSelector onSelect={(v) => data.onChange(id, { value: (value || '') + v })} />
            </div>
            <input
                type="text"
                placeholder={
                    action === 'change_assignee' ? 'Ex: 45' :
                    action === 'set_custom_field' ? 'Ex: lead_score:100' :
                    'Ex: lead-quente'
                }
                className="nodrag nopan w-full text-xs p-2 border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none border-gray-300 dark:border-gray-700"
                value={value}
                onChange={(e) => data.onChange(id, { value: e.target.value })}
            />
        </div>
    );
};

export default DefaultActionInput;
