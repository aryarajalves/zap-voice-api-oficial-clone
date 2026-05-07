import React from 'react';
import { FiPlay, FiFlag, FiTrash2 } from 'react-icons/fi';

const NodeHeader = ({ label, icon: Icon, colorClass, onDelete, isStart, onSetStart }) => (
    <div className={`flex items-center justify-between gap-2 mb-2 border-b border-gray-100 dark:border-gray-700 pb-2`}>
        <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${colorClass}`}>
                <Icon size={16} />
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">{label}</span>
            {isStart ? (
                <span className="bg-green-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase shadow-sm flex items-center gap-1">
                    <FiPlay size={8} fill="currentColor" /> Início
                </span>
            ) : (
                onSetStart && (
                    <button
                        onClick={onSetStart}
                        className="nodrag text-gray-300 hover:text-green-500 transition p-1 group relative"
                        title="Definir como Início"
                    >
                        <FiFlag size={12} />
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1 py-0.5 bg-gray-800 text-white text-[8px] rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">
                            Definir Início
                        </span>
                    </button>
                )
            )}
        </div>
        {!isStart && onDelete && (
            <button
                onClick={onDelete}
                className="nodrag text-gray-400 hover:text-red-500 transition p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
                title="Excluir nó"
            >
                <FiTrash2 size={14} />
            </button>
        )}
    </div>
);

export default NodeHeader;
