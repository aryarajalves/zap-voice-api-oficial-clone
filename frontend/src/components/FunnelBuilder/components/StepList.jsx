import React from 'react';
import { DndContext } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableStep from './SortableStep';

const StepList = ({ logic, templates, existingFunnels }) => {
    const { 
        steps, sensors, closestCenter, handleDragEnd, 
        updateStep, removeStep, currentFunnelId, activeClient, addStep 
    } = logic;

    return (
        <div className="mt-8">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Etapas do Funil</h3>
            
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={steps.map(s => s.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="space-y-4 mb-4">
                        {steps.map((step, index) => (
                            <SortableStep
                                key={step.id}
                                step={step}
                                index={index}
                                steps={steps}
                                updateStep={updateStep}
                                removeStep={removeStep}
                                templates={templates}
                                existingFunnels={existingFunnels}
                                currentFunnelId={currentFunnelId}
                                activeClient={activeClient}
                            />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>

            {steps.length === 0 && (
                <div className="text-center py-10 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg mb-6">
                    <p className="text-gray-500">Nenhuma etapa adicionada. Comece clicando nos botões abaixo.</p>
                </div>
            )}

            <div className="flex flex-wrap gap-2 mb-6 p-4 bg-gray-50 dark:bg-gray-900/30 rounded-xl border border-gray-200 dark:border-gray-700">
                <button
                    onClick={() => addStep('message')}
                    className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-bold text-xs transition-all active:scale-95"
                >
                    + Mensagem
                </button>
                <button
                    onClick={() => addStep('image')}
                    className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 font-bold text-xs transition-all active:scale-95"
                >
                    + Imagem
                </button>
                <button
                    onClick={() => addStep('video')}
                    className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-bold text-xs transition-all active:scale-95"
                >
                    + Vídeo
                </button>
                <button
                    onClick={() => addStep('document')}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-bold text-xs transition-all active:scale-95"
                >
                    + Documento
                </button>
                <button
                    onClick={() => addStep('delay')}
                    className="px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 font-bold text-xs transition-all active:scale-95"
                >
                    + Delay
                </button>
                <button
                    onClick={() => addStep('condition_date')}
                    className="px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 font-bold text-xs transition-all active:scale-95"
                >
                    + 📅 Condição Data
                </button>
                <button
                    onClick={() => addStep('template')}
                    className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-bold text-xs transition-all active:scale-95"
                >
                    + Meta Template
                </button>
            </div>
        </div>
    );
};

export default StepList;
