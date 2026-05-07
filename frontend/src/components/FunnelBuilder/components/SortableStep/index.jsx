import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import MessageStep from './MessageStep';
import MediaStep from './MediaStep';
import DelayStep from './DelayStep';
import ConditionDateStep from './ConditionDateStep';
import PollStep from './PollStep';
import TemplateStep from './TemplateStep';

const SortableStep = ({ step, index, steps, updateStep, removeStep, templates, existingFunnels, currentFunnelId, activeClient }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: step.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const renderStepContent = () => {
        switch (step.type) {
            case 'message':
                return <MessageStep step={step} updateStep={updateStep} />;
            case 'image':
            case 'video':
            case 'audio':
            case 'document':
                return <MediaStep step={step} updateStep={updateStep} activeClient={activeClient} />;
            case 'delay':
                return <DelayStep step={step} updateStep={updateStep} />;
            case 'condition_date':
                return (
                    <ConditionDateStep 
                        step={step} 
                        updateStep={updateStep} 
                        steps={steps} 
                        index={index} 
                        existingFunnels={existingFunnels} 
                        currentFunnelId={currentFunnelId} 
                    />
                );
            case 'poll':
                return <PollStep step={step} updateStep={updateStep} />;
            case 'template':
                return <TemplateStep step={step} updateStep={updateStep} templates={templates} />;
            default:
                return null;
        }
    };

    const getStepLabel = () => {
        const labels = {
            poll: 'Enquete',
            delay: 'Delay',
            message: 'Mensagem',
            condition_date: '📅 Condição Data',
            template: 'Template (Meta)'
        };
        return labels[step.type] || step.type;
    };

    return (
        <div ref={setNodeRef} style={style} className="border p-4 rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 flex flex-col gap-2 relative group touch-none mb-4">
            <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                    <div {...attributes} {...listeners} className="cursor-move p-1 text-gray-400 hover:text-gray-600 bg-gray-100 dark:bg-gray-600 dark:text-gray-300 dark:hover:text-white rounded">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                        </svg>
                    </div>
                    <span className="font-semibold text-gray-700 dark:text-white capitalize">
                        Etapa {index + 1}: {getStepLabel()}
                    </span>
                </div>
                <button onClick={() => removeStep(step.id)} className="text-red-500 hover:text-red-700 text-sm font-semibold">Remover</button>
            </div>
            {renderStepContent()}
        </div>
    );
};

export default SortableStep;
