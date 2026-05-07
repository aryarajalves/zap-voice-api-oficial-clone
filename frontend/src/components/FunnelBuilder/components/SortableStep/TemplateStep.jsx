import React from 'react';

const TemplateStep = ({ step, updateStep, templates }) => {
    return (
        <div className="mt-2 text-sm">
            <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1">Nome do Template (Meta/Facebook):</label>
            <div className="flex flex-col gap-2">
                <select
                    value={step.content || ''}
                    onChange={(e) => updateStep(step.id, 'content', e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-green-500 outline-none bg-white dark:bg-gray-800 dark:text-white"
                >
                    <option value="">Selecione um template...</option>
                    {templates && templates.length > 0 ? (
                        templates
                            .filter(t => ['APPROVED', 'ACTIVE'].includes(t.status))
                            .map((t) => (
                                <option key={t.id || t.name} value={t.name}>
                                    {t.name} ({t.language})
                                </option>
                            ))
                    ) : (
                        <option value="" disabled>Carregando templates...</option>
                    )}
                </select>
                <input
                    type="text"
                    value={step.content || ''}
                    onChange={(e) => updateStep(step.id, 'content', e.target.value)}
                    placeholder="Ou digite manualmente..."
                    className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900"
                />
            </div>
        </div>
    );
};

export default TemplateStep;
