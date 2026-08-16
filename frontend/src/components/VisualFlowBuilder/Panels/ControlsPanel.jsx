import React from 'react';
import { Panel } from 'reactflow';
import { FiArrowLeft, FiSave, FiTrash2, FiMinimize, FiMaximize } from 'react-icons/fi';

const ControlsPanel = ({
    onBack, isFullScreen, toggleFullScreen,
    handleSave, saving, onDelete
}) => {
    return (
        <Panel position="top-right" className="flex items-center gap-2">
            {onBack && !isFullScreen && (
                <button 
                    onClick={onBack} 
                    className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg shadow border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition font-medium text-sm"
                >
                    <FiArrowLeft size={16} /> Voltar para Lista
                </button>
            )}
            <button 
                onClick={handleSave} 
                disabled={saving} 
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow transition font-bold text-sm disabled:opacity-50"
            >
                <FiSave size={16} /> {saving ? 'Salvando...' : 'Salvar Fluxo'}
            </button>
            {onDelete && (
                <button 
                    onClick={onDelete} 
                    className="flex items-center gap-1.5 px-3 py-2 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 rounded-lg shadow-sm hover:bg-red-100 dark:hover:bg-red-900/50 transition font-bold text-sm"
                    title="Excluir este Funil"
                >
                    <FiTrash2 size={16} /> Excluir Funil
                </button>
            )}
            <button 
                onClick={toggleFullScreen} 
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg shadow border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                title={isFullScreen ? "Sair da Tela Cheia" : "Tela Cheia"}
            >
                {isFullScreen ? <FiMinimize size={16} /> : <FiMaximize size={16} />}
            </button>
        </Panel>
    );
};

export default ControlsPanel;
