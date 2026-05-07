import React from 'react';

const PollStep = ({ step, updateStep }) => {
    return (
        <div className="space-y-2">
            <input
                type="text"
                value={step.content}
                onChange={(e) => updateStep(step.id, 'content', e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 dark:text-white"
                placeholder="Pergunta da enquete..."
            />
            <div className="pl-4 border-l-2 border-gray-200 dark:border-gray-700 space-y-2">
                <label className="text-sm font-semibold text-gray-500">Opções:</label>
                {(step.options || []).map((opt, i) => (
                    <div key={i} className="flex gap-2">
                        <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                                const newOptions = [...(step.options || [])];
                                newOptions[i] = e.target.value;
                                updateStep(step.id, 'options', newOptions);
                            }}
                            className="w-full p-1 border border-gray-200 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 dark:text-white"
                            placeholder={`Opção ${i + 1}`}
                        />
                        <button
                            onClick={() => {
                                const newOptions = step.options.filter((_, idx) => idx !== i);
                                updateStep(step.id, 'options', newOptions);
                            }}
                            className="text-red-400 hover:text-red-600"
                        >x</button>
                    </div>
                ))}
                <button
                    onClick={() => updateStep(step.id, 'options', [...(step.options || []), ''])}
                    className="text-sm text-blue-600 hover:underline"
                >
                    + Adicionar Opção
                </button>
            </div>
        </div>
    );
};

export default PollStep;
