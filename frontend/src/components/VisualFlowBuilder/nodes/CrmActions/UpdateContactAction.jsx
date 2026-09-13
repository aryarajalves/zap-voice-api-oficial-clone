import React from 'react';
import VariableSelector from '../../components/VariableSelector';

const UpdateContactAction = ({ id, data, nameType }) => {
    return (
        <div className="space-y-3 pt-1 border-t border-gray-100 dark:border-gray-700/50">
            <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase block">Origem do Nome</label>
                <select
                    className="nodrag nopan w-full text-xs border rounded p-2 bg-gray-55 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-semibold focus:ring-2 focus:ring-indigo-500 outline-none border-gray-300 dark:border-gray-700"
                    value={nameType}
                    onChange={(e) => data.onChange(id, { nameType: e.target.value, newName: '' })}
                >
                    <option value="fixed">Nome Fixo / Manual</option>
                    <option value="official">Nome da API Oficial (Push Name)</option>
                </select>
            </div>

            {nameType === 'fixed' && (
                <div className="flex flex-col gap-1 relative">
                    <div className="flex justify-between items-center mb-0.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase block">Novo Nome</label>
                        <VariableSelector onSelect={(v) => data.onChange(id, { newName: (data.newName || '') + v })} />
                    </div>
                    <input
                        type="text"
                        placeholder="Ex: João da Silva"
                        className="nodrag nopan w-full text-xs p-2 border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none border-gray-300 dark:border-gray-700"
                        value={data.newName || ''}
                        onChange={(e) => data.onChange(id, { newName: e.target.value })}
                    />
                </div>
            )}

            {nameType === 'official' && (
                <p className="text-[9px] text-gray-400 italic bg-gray-50 dark:bg-gray-900/50 p-2 rounded border border-dashed border-gray-200 dark:border-gray-700">
                    O sistema usará o nome identificado pelo WhatsApp no momento da interação.
                </p>
            )}
        </div>
    );
};

export default UpdateContactAction;
