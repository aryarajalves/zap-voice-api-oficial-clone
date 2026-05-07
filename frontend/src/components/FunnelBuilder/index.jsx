import React from 'react';
import { useFunnelBuilder } from './hooks/useFunnelBuilder';
import FunnelSettings from './components/FunnelSettings';
import StepList from './components/StepList';

const FunnelBuilder = ({ onSave, onCancel, initialData, existingFunnels = [] }) => {
    const logic = useFunnelBuilder({ onSave, initialData });
    const { name, steps, handleSave, initialData: logicInitialData } = logic;

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 mb-6 transition-all duration-300">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                    {initialData ? 'Editar Funil' : 'Criar Novo Funil'}
                </h2>
                <button
                    onClick={onCancel}
                    className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all"
                >
                    Cancelar
                </button>
            </div>

            <FunnelSettings logic={logic} />

            <StepList 
                logic={logic} 
                templates={logic.templates} 
                existingFunnels={existingFunnels} 
            />

            <div className="pt-6 border-t border-gray-100 dark:border-gray-700">
                <button
                    onClick={handleSave}
                    disabled={!name || steps.length === 0 || steps.some(s => s.uploading)}
                    className={`w-full px-4 py-4 font-bold rounded-2xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 ${
                        initialData 
                            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20' 
                            : 'bg-green-600 hover:bg-green-700 text-white shadow-green-500/20'
                    }`}
                >
                    {steps.some(s => s.uploading) 
                        ? 'Enviando arquivos...' 
                        : (initialData ? 'Atualizar Funil' : 'Salvar Funil')}
                </button>
            </div>
        </div>
    );
};

export default FunnelBuilder;
