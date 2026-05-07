import React from 'react';
import { FiMessageSquare, FiImage, FiMic, FiClock, FiCpu, FiShuffle, FiLink, FiTag, FiUser } from 'react-icons/fi';

const ContextMenu = ({ top, left, onClose, onAddNode }) => {
    return (
        <div
            style={{ top, left }}
            className="absolute z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 w-52 overflow-hidden animate-fade-in"
            onMouseLeave={onClose}
        >
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Adicionar Nó</span>
                <kbd className="text-[10px] text-gray-400 font-mono">ESC</kbd>
            </div>
            <div className="flex flex-col p-1 gap-0.5">
                <button onClick={() => onAddNode('messageNode')} className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 rounded-md transition text-left group">
                    <div className="bg-blue-100 dark:bg-blue-900/50 p-1 rounded group-hover:bg-blue-200 transition"><FiMessageSquare className="text-blue-500" /></div> Mensagem
                </button>
                <button onClick={() => onAddNode('mediaNode')} className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-pink-50 dark:hover:bg-pink-900/30 hover:text-pink-600 rounded-md transition text-left group">
                    <div className="bg-pink-100 dark:bg-pink-900/50 p-1 rounded group-hover:bg-pink-200 transition"><FiImage className="text-pink-500" /></div> Mídia
                </button>
                <button onClick={() => onAddNode('audioNode')} className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 hover:text-cyan-600 rounded-md transition text-left group">
                    <div className="bg-cyan-100 dark:bg-cyan-900/50 p-1 rounded group-hover:bg-cyan-200 transition"><FiMic className="text-cyan-500" /></div> Áudio
                </button>
                <button onClick={() => onAddNode('delayNode')} className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-yellow-50 dark:hover:bg-yellow-900/30 hover:text-yellow-600 rounded-md transition text-left group">
                    <div className="bg-yellow-100 dark:bg-yellow-900/50 p-1 rounded group-hover:bg-yellow-200 transition"><FiClock className="text-yellow-500" /></div> Delay
                </button>
                <div className="h-px bg-gray-100 dark:bg-gray-700 my-1"></div>
                <button onClick={() => onAddNode('conditionNode')} className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:text-purple-600 rounded-md transition text-left group">
                    <div className="bg-purple-100 dark:bg-purple-900/50 p-1 rounded group-hover:bg-purple-200 transition"><FiCpu className="text-purple-500" /></div> Condição
                </button>
                <button onClick={() => onAddNode('randomizerNode')} className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 rounded-md transition text-left group">
                    <div className="bg-indigo-100 dark:bg-indigo-900/50 p-1 rounded group-hover:bg-indigo-200 transition"><FiShuffle className="text-indigo-500" /></div> Teste A/B
                </button>
                <button onClick={() => onAddNode('linkFunnelNode')} className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-orange-50 dark:hover:bg-orange-900/30 hover:text-orange-600 rounded-md transition text-left group">
                    <div className="bg-orange-100 dark:bg-orange-900/50 p-1 rounded group-hover:bg-orange-200 transition"><FiLink className="text-orange-500" /></div> Conectar Funil
                </button>
                <button onClick={() => onAddNode('chatwoot_label')} className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-slate-900/30 hover:text-slate-600 rounded-md transition text-left group">
                    <div className="bg-slate-200 dark:bg-slate-800 p-1 rounded group-hover:bg-slate-300 transition"><FiTag className="text-slate-500" /></div> Etiquetar Chatwoot
                </button>
                <button onClick={() => onAddNode('updateContactNode')} className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-orange-50 dark:hover:bg-orange-900/30 hover:text-orange-600 rounded-md transition text-left group">
                    <div className="bg-orange-100 dark:bg-orange-900/50 p-1 rounded group-hover:bg-orange-200 transition"><FiUser className="text-orange-500" /></div> Atualizar Contato no Chatwoot
                </button>
            </div>
        </div>
    );
};

export default ContextMenu;
