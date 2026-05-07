import React from 'react';

const ConditionDateStep = ({ step, updateStep, steps, index, existingFunnels, currentFunnelId }) => {
    return (
        <div className="space-y-3 p-2 bg-orange-50 dark:bg-orange-900/20 rounded border border-orange-100 dark:border-orange-800/50">
            <div>
                <span className="text-sm font-bold text-orange-800 dark:text-orange-300">Se a data atual for:</span>
                <select
                    value={step.condition || 'before'}
                    onChange={(e) => updateStep(step.id, 'condition', e.target.value)}
                    className="ml-2 p-1 border rounded text-sm w-full mt-1 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                >
                    <option value="before">Antes de...</option>
                    <option value="after">Depois de...</option>
                    <option value="between">Entre datas...</option>
                </select>
            </div>

            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-100 dark:border-green-800/50 mb-2">
                <label className="block text-xs uppercase text-green-800 dark:text-green-300 font-bold mb-1">Se ATENDER a condição (Verdadeiro):</label>
                <select
                    value={step.onMatch || 'next_step'}
                    onChange={(e) => updateStep(step.id, 'onMatch', e.target.value)}
                    className="w-full p-2 border border-green-300 dark:border-green-700 rounded text-sm bg-white dark:bg-gray-800 dark:text-white"
                >
                    <option value="next_step">➡️ Continuar para próxima etapa</option>
                    <option value="trigger_funnel">🚀 Disparar Outro Funil</option>
                </select>
                {step.onMatch === 'trigger_funnel' && (
                    <div className="mt-2 text-xs">
                        <p className="text-gray-500 mb-1">Funil a disparar:</p>
                        <select
                            value={step.triggerFunnelIdMatch || ''}
                            onChange={(e) => updateStep(step.id, 'triggerFunnelIdMatch', parseInt(e.target.value) || null)}
                            className="w-full p-2 border border-green-300 rounded bg-white dark:bg-gray-800"
                        >
                            <option value="">Selecione um funil...</option>
                            {existingFunnels.map(f => (
                                <option key={f.id} value={f.id} disabled={currentFunnelId && f.id === currentFunnelId}>
                                    {f.name} (ID: {f.id})
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {(step.condition === 'before' || step.condition === 'after' || !step.condition) && (
                <div>
                    <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Data de Referência</label>
                    <input
                        type="datetime-local"
                        value={step.targetDate || ''}
                        onChange={(e) => updateStep(step.id, 'targetDate', e.target.value)}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 dark:text-white"
                    />
                </div>
            )}

            {step.condition === 'between' && (
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Data Inicial</label>
                        <input
                            type="datetime-local"
                            value={step.startDate || ''}
                            onChange={(e) => updateStep(step.id, 'startDate', e.target.value)}
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Data Final</label>
                        <input
                            type="datetime-local"
                            value={step.endDate || ''}
                            onChange={(e) => updateStep(step.id, 'endDate', e.target.value)}
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 dark:text-white"
                        />
                    </div>
                </div>
            )}

            {step.condition === 'between' ? (
                <div className="grid grid-cols-1 gap-3 mt-3">
                    {/* Caso: ANTES DA DATA INICIAL */}
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-100 dark:border-blue-800/50">
                        <label className="block text-xs uppercase text-blue-800 dark:text-blue-300 font-bold mb-1">Se for ANTES do início:</label>
                        <select
                            value={step.onMismatchBefore || 'stop'}
                            onChange={(e) => updateStep(step.id, 'onMismatchBefore', e.target.value)}
                            className="w-full p-2 border border-blue-300 dark:border-blue-700 rounded text-sm bg-white dark:bg-gray-800 dark:text-white"
                        >
                            <option value="stop">❌ Parar Funil</option>
                            <option value="wait">⏳ Aguardar chegar a data</option>
                            <option value="jump">↪️ Pular para outra etapa</option>
                            <option value="trigger_funnel">🚀 Disparar Outro Funil</option>
                        </select>
                        {step.onMismatchBefore === 'jump' && (
                            <div className="mt-2">
                                <select
                                    value={step.jumpToStepIdxBefore ?? ''}
                                    onChange={(e) => updateStep(step.id, 'jumpToStepIdxBefore', parseInt(e.target.value))}
                                    className="w-full p-1 border border-blue-300 dark:border-blue-700 rounded text-xs bg-white dark:bg-gray-800 dark:text-white"
                                >
                                    <option value="" disabled>Ir para etapa...</option>
                                    {steps.map((s, idx) => (
                                        <option key={s.id} value={idx}>{idx + 1}. {s.type}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        {step.onMismatchBefore === 'trigger_funnel' && (
                            <div className="mt-2 text-xs">
                                <p className="text-gray-500 mb-1">Funil a disparar:</p>
                                <select
                                    value={step.triggerFunnelIdBefore || ''}
                                    onChange={(e) => updateStep(step.id, 'triggerFunnelIdBefore', parseInt(e.target.value) || null)}
                                    className="w-full p-1 border border-blue-300 rounded text-xs bg-white dark:bg-gray-800"
                                >
                                    <option value="">Selecione um funil...</option>
                                    {existingFunnels.map(f => (
                                        <option key={f.id} value={f.id} disabled={currentFunnelId && f.id === currentFunnelId}>
                                            {f.name} (ID: {f.id})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Caso: DEPOIS DA DATA FINAL */}
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-100 dark:border-red-800/50">
                        <label className="block text-xs uppercase text-red-800 dark:text-red-300 font-bold mb-1">Se for DEPOIS do fim:</label>
                        <select
                            value={step.onMismatchAfter || 'stop'}
                            onChange={(e) => updateStep(step.id, 'onMismatchAfter', e.target.value)}
                            className="w-full p-2 border border-red-300 dark:border-red-700 rounded text-sm bg-white dark:bg-gray-800 dark:text-white"
                        >
                            <option value="stop">❌ Parar Funil</option>
                            <option value="jump">↪️ Pular para outra etapa</option>
                            <option value="trigger_funnel">🚀 Disparar Outro Funil</option>
                        </select>
                        {step.onMismatchAfter === 'jump' && (
                            <div className="mt-2">
                                <select
                                    value={step.jumpToStepIdxAfter ?? ''}
                                    onChange={(e) => updateStep(step.id, 'jumpToStepIdxAfter', parseInt(e.target.value))}
                                    className="w-full p-1 border border-red-300 dark:border-red-700 rounded text-xs bg-white dark:bg-gray-800 dark:text-white"
                                >
                                    <option value="" disabled>Ir para etapa...</option>
                                    {steps.map((s, idx) => (
                                        <option key={s.id} value={idx}>{idx + 1}. {s.type}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        {step.onMismatchAfter === 'trigger_funnel' && (
                            <div className="mt-2 text-xs">
                                <p className="text-gray-500 mb-1">Funil a disparar:</p>
                                <select
                                    value={step.triggerFunnelIdAfter || ''}
                                    onChange={(e) => updateStep(step.id, 'triggerFunnelIdAfter', parseInt(e.target.value) || null)}
                                    className="w-full p-1 border border-red-300 rounded text-xs bg-white dark:bg-gray-800"
                                >
                                    <option value="">Selecione um funil...</option>
                                    {existingFunnels.map(f => (
                                        <option key={f.id} value={f.id} disabled={currentFunnelId && f.id === currentFunnelId}>
                                            {f.name} (ID: {f.id})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="mt-2">
                    <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Se não atender?</label>
                    <select
                        value={step.onMismatch || 'stop'}
                        onChange={(e) => updateStep(step.id, 'onMismatch', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded text-sm bg-white dark:bg-gray-800 dark:text-white"
                    >
                        <option value="stop">❌ Parar Funil</option>
                        <option value="wait">⏳ Aguardar até atender</option>
                        <option value="jump">↪️ Pular para outra etapa</option>
                        <option value="trigger_funnel">🚀 Disparar Outro Funil</option>
                    </select>
                    {step.onMismatch === 'jump' && (
                        <select
                            value={step.jumpToStepIdx ?? ''}
                            onChange={(e) => updateStep(step.id, 'jumpToStepIdx', parseInt(e.target.value))}
                            className="w-full p-2 mt-2 border border-blue-300 rounded text-sm bg-blue-50 dark:bg-blue-900/30 dark:text-white"
                        >
                            <option value="" disabled>Selecione a etapa...</option>
                            {steps.map((s, idx) => (
                                <option key={s.id} value={idx}>{idx + 1}. {s.type.toUpperCase()}</option>
                            ))}
                        </select>
                    )}
                </div>
            )}

            <div className="text-xs text-orange-600 italic mt-2">
                * Referência: Horário de Brasília (UTC-3).
            </div>
        </div>
    );
};

export default ConditionDateStep;
