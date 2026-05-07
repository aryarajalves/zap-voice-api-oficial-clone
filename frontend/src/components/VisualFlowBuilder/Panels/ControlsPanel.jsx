import React from 'react';
import { Panel } from 'reactflow';
import { FiArrowLeft, FiSave, FiMinimize, FiMaximize } from 'react-icons/fi';

const ControlsPanel = ({
    onBack, isFullScreen, toggleFullScreen,
    handleSave, saving
}) => {
    return (
        <Panel position="top-right" className="flex gap-2">
            {onBack && !isFullScreen && (
                <button onClick={onBack} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg shadow border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition font-medium">
                    <FiArrowLeft /> Voltar para Lista
                </button>
            )}
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition font-bold">
                <FiSave /> {saving ? 'Salvando...' : 'Salvar Fluxo'}
            </button>
            <button onClick={toggleFullScreen} className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg shadow hover:bg-gray-200 transition">
                {isFullScreen ? <FiMinimize /> : <FiMaximize />}
            </button>
        </Panel>
    );
};

export default ControlsPanel;
