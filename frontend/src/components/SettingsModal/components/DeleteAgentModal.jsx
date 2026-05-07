import React from 'react';
import { FiTrash2 } from 'react-icons/fi';

const DeleteAgentModal = ({ agent, onCancel, onConfirm }) => {
    if (!agent) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-950 rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-white/10 w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-10 text-center">
                    <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-[2rem] flex items-center justify-center text-red-600 dark:text-red-400 mx-auto mb-6 shadow-lg shadow-red-500/10">
                        <FiTrash2 size={36} />
                    </div>
                    <h3 className="text-xl font-black text-gray-800 dark:text-white mb-3 uppercase tracking-tight">Remover Agente?</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                        Tem certeza que deseja remover <span className="font-bold text-gray-700 dark:text-gray-200">{agent.name}</span>? <br/>Esta ação não pode ser desfeita.
                    </p>
                </div>
                <div className="grid grid-cols-2 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
                    <button
                        onClick={onCancel}
                        className="py-5 text-xs font-black text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-all border-r border-gray-100 dark:border-white/5 uppercase tracking-widest"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        className="py-5 text-xs font-black text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all uppercase tracking-widest"
                    >
                        Sim, Remover
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteAgentModal;
