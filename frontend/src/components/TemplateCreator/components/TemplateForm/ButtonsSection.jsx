import React from 'react';
import { FiPlus, FiTrash2 } from 'react-icons/fi';

const ButtonsSection = ({ logic }) => {
    const { formData, handleAddButton, updateButton, removeButton } = logic;

    return (
        <div className="bg-gray-50 dark:bg-gray-900/40 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-inner">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                    <label className="block text-sm font-bold text-gray-700 dark:text-white">Botões de Interação</label>
                    <span className="text-[10px] bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded-full font-bold">Até 10</span>
                </div>
                <button
                    type="button"
                    onClick={handleAddButton}
                    className="flex items-center gap-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                >
                    <FiPlus size={16} /> Adicionar Botão
                </button>
            </div>

            <div className="space-y-4">
                {formData.buttons.map((btn, idx) => {
                    const hasExtraField = btn.type === 'URL' || btn.type === 'PHONE_NUMBER';
                    return (
                        <div key={idx} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm animate-in fade-in slide-in-from-top-3 overflow-hidden w-full">
                            <div className="w-full sm:flex-1 min-w-0">
                                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1.5 block tracking-wider truncate">Tipo de Ação</label>
                                <select
                                    value={btn.type}
                                    onChange={(e) => updateButton(idx, 'type', e.target.value)}
                                    className="w-full text-sm h-[42px] px-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white cursor-pointer"
                                >
                                    <option value="QUICK_REPLY" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Resposta Rápida (Botão Normal)</option>
                                    <option value="URL" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Link (Abrir Site)</option>
                                    <option value="PHONE_NUMBER" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Ligar para Número</option>
                                </select>
                            </div>
                            <div className={`w-full ${hasExtraField ? 'sm:flex-1' : 'sm:flex-[2]'} min-w-0`}>
                                <div className="flex justify-between items-center mb-1.5">
                                    <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase block tracking-wider truncate">Texto do Botão</label>
                                    <span className={`text-[10px] font-bold ${(btn.text?.length || 0) >= 25 ? 'text-red-500' : 'text-gray-400'}`}>
                                        {(btn.text?.length || 0)}/25
                                    </span>
                                </div>
                                <input
                                    type="text"
                                    value={btn.text}
                                    onChange={(e) => updateButton(idx, 'text', e.target.value)}
                                    className="w-full text-sm h-[42px] px-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                                    placeholder="Ex: Falar com Suporte"
                                    maxLength={25}
                                />
                            </div>
                            {btn.type === 'URL' && (
                                <div className="w-full sm:flex-[1.5] min-w-0">
                                    <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1.5 block tracking-wider truncate">URL do Link</label>
                                    <input
                                        type="text"
                                        value={btn.url || ''}
                                        onChange={(e) => updateButton(idx, 'url', e.target.value)}
                                        className="w-full text-sm h-[42px] px-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                                        placeholder="https://exemplo.com"
                                    />
                                </div>
                            )}
                            {btn.type === 'PHONE_NUMBER' && (
                                <div className="w-full sm:flex-[1.5] min-w-0">
                                    <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1.5 block tracking-wider truncate">Número de Telefone</label>
                                    <input
                                        type="text"
                                        value={btn.phone_number || ''}
                                        onChange={(e) => updateButton(idx, 'phone_number', e.target.value)}
                                        className="w-full text-sm h-[42px] px-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                                        placeholder="+558599999999"
                                    />
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={() => removeButton(idx)}
                                className="flex-shrink-0 h-[42px] w-[42px] flex items-center justify-center text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all border border-red-200/50 dark:border-red-500/20 bg-red-50/40 dark:bg-red-500/5 active:scale-95 self-end shrink-0 cursor-pointer"
                                title="Remover Botão"
                            >
                                <FiTrash2 size={18} />
                            </button>
                        </div>
                    );
                })}
                {formData.buttons.length === 0 && (
                    <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-xl">
                        <p className="text-sm italic">Nenhum botão adicionado ainda</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ButtonsSection;
