import React from 'react';
import { FiZap } from 'react-icons/fi';

const WhatsAppAutoReplySection = ({ formData, handleChange }) => {
    return (
        <div className="bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 rounded-2xl p-5 md:p-6 space-y-5 transition-colors duration-200 mt-6">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-xl text-green-500">
                    <FiZap size={20} />
                </div>
                <div>
                    <h4 className="text-sm font-bold text-gray-800 dark:text-white">Resposta Automática (Apenas Comunicados)</h4>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                        Envie uma mensagem de auto-resposta padrão sempre que um usuário enviar qualquer mensagem para este WhatsApp.
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Ativar resposta automática para mensagens recebidas
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            name="WA_AUTO_REPLY_ENABLED"
                            checked={formData.WA_AUTO_REPLY_ENABLED === true || formData.WA_AUTO_REPLY_ENABLED === 'true'}
                            onChange={(e) => {
                                handleChange({ target: { name: 'WA_AUTO_REPLY_ENABLED', value: e.target.checked } });
                            }}
                            className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-200 dark:bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                    </label>
                </div>

                {(formData.WA_AUTO_REPLY_ENABLED === true || formData.WA_AUTO_REPLY_ENABLED === 'true') && (
                    <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Mensagem de Resposta</label>
                            <textarea
                                name="WA_AUTO_REPLY_MESSAGE"
                                value={formData.WA_AUTO_REPLY_MESSAGE || ''}
                                onChange={handleChange}
                                rows={4}
                                placeholder="Olá! Este número de WhatsApp é utilizado apenas para o envio de comunicados importantes. Não temos atendimento humano por aqui. Obrigado!"
                                className="w-full p-3 bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-green-500 font-medium transition-colors shadow-sm"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                                Delay de Resposta (segundos)
                            </label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="number"
                                    name="WA_AUTO_REPLY_DELAY"
                                    value={formData.WA_AUTO_REPLY_DELAY !== undefined && formData.WA_AUTO_REPLY_DELAY !== '' ? formData.WA_AUTO_REPLY_DELAY : 3}
                                    min="0"
                                    max="60"
                                    onChange={(e) => {
                                        handleChange({ target: { name: 'WA_AUTO_REPLY_DELAY', value: e.target.value } });
                                    }}
                                    className="w-24 p-3 bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-green-500 font-medium transition-colors shadow-sm"
                                />
                                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                                    Tempo de espera em segundos antes de responder.
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WhatsAppAutoReplySection;
