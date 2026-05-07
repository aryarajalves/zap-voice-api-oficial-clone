import React from 'react';

const MessageStep = ({ step, updateStep }) => {
    return (
        <div className="space-y-3">
            <textarea
                value={step.content}
                onChange={(e) => updateStep(step.id, 'content', e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-500 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="Digite a mensagem..."
                rows={2}
            />

            {/* Opções de Botão Interativo */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-100 dark:border-blue-800">
                <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={step.interactive || false}
                        onChange={(e) => updateStep(step.id, 'interactive', e.target.checked)}
                        className="form-checkbox h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-bold text-blue-800 dark:text-blue-200">🔘 Enviar com Botões (WhatsApp Oficial)</span>
                </label>

                {step.interactive && (
                    <div className="mt-2 space-y-2">
                        <p className="text-xs text-blue-600">
                            Adicione até 3 botões de resposta rápida. O usuário poderá clicar para responder.
                        </p>
                        {[0, 1, 2].map(idx => (
                            <div key={idx} className="flex items-center gap-2">
                                <span className="text-xs text-blue-700 font-bold w-4">{idx + 1}.</span>
                                <input
                                    type="text"
                                    value={step.buttons?.[idx] || ''}
                                    onChange={(e) => {
                                        const newButtons = [...(step.buttons || [])];
                                        newButtons[idx] = e.target.value;
                                        updateStep(step.id, 'buttons', newButtons);
                                    }}
                                    placeholder={`Botão ${idx + 1} (ex: Sim, Quero)`}
                                    className="flex-1 p-1 text-sm border border-blue-200 dark:border-blue-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400"
                                    maxLength={20}
                                />
                            </div>
                        ))}

                        {/* Nota Privada para Botões */}
                        <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                            <label className="flex items-center space-x-2 cursor-pointer mb-2">
                                <input
                                    type="checkbox"
                                    checked={step.privateMessageEnabled || false}
                                    onChange={(e) => updateStep(step.id, 'privateMessageEnabled', e.target.checked)}
                                    className="form-checkbox h-4 w-4 text-yellow-600 rounded focus:ring-yellow-500"
                                />
                                <span className="text-sm font-bold text-yellow-800 dark:text-yellow-200">📝 Criar Nota Interna no Chatwoot?</span>
                            </label>
                            <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-2">
                                Recomendado! Mensagens de botão via API Oficial não aparecem na timeline do Chatwoot.
                            </p>

                            {step.privateMessageEnabled && (
                                <textarea
                                    value={step.privateMessageContent || ''}
                                    onChange={(e) => updateStep(step.id, 'privateMessageContent', e.target.value)}
                                    placeholder="Ex: Enviei oferta com botões."
                                    className="w-full p-2 text-sm border border-yellow-300 dark:border-yellow-600 rounded focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                    rows={2}
                                />
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MessageStep;
