import React from 'react';
import { Handle, Position } from 'reactflow';
import { FiUser } from 'react-icons/fi';
import NodeHeader from '../components/NodeHeader';
import VariableSelector from '../components/VariableSelector';

const UpdateContactNode = ({ id, data }) => {
    const nameType = data.nameType || 'fixed';

    return (
        <div className="px-4 py-3 shadow-lg rounded-2xl bg-white dark:bg-gray-800 border-2 border-orange-500 min-w-[280px]">
            <Handle type="target" position={Position.Top} className="w-3 h-3 bg-orange-500" />
            <NodeHeader
                label="Atualizar Contato no Chatwoot"
                icon={FiUser}
                colorClass="bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400"
                onDelete={() => data.onDelete(id)}
                isStart={data.isStart}
                onSetStart={() => data.onSetStart(id, 'updateContactNode')}
            />

            <div className="space-y-4">
                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Origem do Nome</label>
                    <select
                        className="nodrag nopan w-full text-sm border rounded p-2 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-semibold focus:ring-2 focus:ring-orange-500 outline-none"
                        value={nameType}
                        onChange={(e) => data.onChange(id, { nameType: e.target.value })}
                    >
                        <option value="fixed">Nome Fixo / Manual</option>
                        <option value="official">Nome da API Oficial (Push Name)</option>
                    </select>
                </div>

                {nameType === 'fixed' && (
                    <div className="animate-fade-in">
                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Novo Nome</label>
                        <input
                            type="text"
                            placeholder="Ex: João da Silva"
                            className="nodrag nopan w-full text-sm p-2 border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm"
                            value={data.newName || ''}
                            onChange={(e) => data.onChange(id, { newName: e.target.value })}
                        />
                        <div className="mt-2">
                            <VariableSelector onSelect={(v) => data.onChange(id, { newName: (data.newName || '') + v })} />
                        </div>
                    </div>
                )}

                {nameType === 'official' && (
                    <p className="text-[10px] text-gray-400 italic bg-gray-50 dark:bg-gray-900/50 p-2 rounded border border-dashed border-gray-200 dark:border-gray-700">
                        O sistema usará o nome identificado pelo WhatsApp no momento da interação.
                    </p>
                )}
            </div>

            <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-orange-500" />
        </div>
    );
};

export default UpdateContactNode;
