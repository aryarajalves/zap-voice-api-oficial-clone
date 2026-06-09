import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { FiCpu } from 'react-icons/fi';
import NodeHeader from '../components/NodeHeader';

const ConditionNode = ({ id, data }) => {
    const [activeTab, setActiveTab] = useState('config');
    const conditionType = data.conditionType || 'text';
    const isRange = conditionType === 'datetime_range';

    return (
        <div className="px-4 py-3 shadow-lg rounded-2xl bg-white dark:bg-gray-800 border-2 border-purple-500 min-w-[300px]">
            <Handle type="target" position={Position.Top} className="w-3 h-3 bg-purple-500" />
            <NodeHeader
                label="Condição Inteligente"
                icon={FiCpu}
                colorClass="bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400"
                onDelete={() => data.onDelete(id)}
                onDuplicate={() => data.onDuplicate(id)}
                isStart={data.isStart}
            />

            <div className="space-y-4">
                {/* Seletor de Tipo */}
                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Tipo de Validação</label>
                    <select
                        className="nodrag nopan w-full text-sm border rounded p-2 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-semibold focus:ring-2 focus:ring-purple-500 outline-none"
                        value={conditionType}
                        onChange={(e) => data.onChange(id, { conditionType: e.target.value })}
                    >
                        <option value="text">Busca por Texto (Simples)</option>
                        <option value="tag">Tag no Chatwoot</option>
                        <option value="ai_question">Análise de Resposta (IA)</option>
                        <option value="datetime_range">Período de Data/Hora (Antes/Durante/Depois)</option>
                        <option value="weekday">Dias da Semana</option>
                    </select>
                </div>

                {conditionType === 'ai_question' && (
                    <div className="flex border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-0.5 rounded-lg">
                        <button
                            type="button"
                            onClick={() => setActiveTab('config')}
                            className={`flex-1 py-1 text-[10px] font-bold rounded-md transition ${activeTab === 'config' ? 'bg-white dark:bg-gray-700 shadow-sm text-purple-600 dark:text-purple-400' : 'text-gray-400'}`}
                        >
                            Parâmetros
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('instructions')}
                            className={`flex-1 py-1 text-[10px] font-bold rounded-md transition ${activeTab === 'instructions' ? 'bg-white dark:bg-gray-700 shadow-sm text-purple-600 dark:text-purple-400' : 'text-gray-400'}`}
                        >
                            Critérios de Sucesso
                        </button>
                    </div>
                )}

                {/* Campos Específicos */}
                {conditionType === 'text' && (
                    <div className="animate-fade-in">
                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Palavra ou Frase</label>
                        <input
                            type="text"
                            placeholder="Ex: Clicou 'Promo'?"
                            className="nodrag nopan w-full text-sm p-2 border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm"
                            value={data.condition || ''}
                            onChange={(e) => data.onChange(id, { condition: e.target.value })}
                        />
                    </div>
                )}

                {conditionType === 'tag' && (
                    <div className="animate-fade-in">
                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Nome da Tag (sem #)</label>
                        <input
                            type="text"
                            placeholder="ex: interessado"
                            className="nodrag nopan w-full text-sm p-2 border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono shadow-sm"
                            value={data.tag || ''}
                            onChange={(e) => data.onChange(id, { tag: e.target.value })}
                        />
                        <p className="text-[9px] text-gray-400 mt-1 italic">Dica: O sistema ignora acentos e maiúsculas automaticamente.</p>
                    </div>
                )}

                {isRange && (
                    <div className="space-y-3 animate-fade-in">
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Data/Hora Início (Brasília)</label>
                            <input
                                type="datetime-local"
                                className="nodrag nopan w-full p-2 text-sm border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm"
                                value={data.startDateTime || ''}
                                onChange={(e) => data.onChange(id, { startDateTime: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Data/Hora Fim (Brasília)</label>
                            <input
                                type="datetime-local"
                                className="nodrag nopan w-full p-2 text-sm border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm"
                                value={data.endDateTime || ''}
                                onChange={(e) => data.onChange(id, { endDateTime: e.target.value })}
                            />
                        </div>
                    </div>
                )}

                {conditionType === 'weekday' && (
                    <div className="grid grid-cols-2 gap-2 animate-fade-in bg-gray-50 dark:bg-gray-900/50 p-2 rounded-lg">
                        {['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'].map((day, index) => {
                            const dayVal = index.toString();
                            const isSelected = (data.allowedDays || []).includes(dayVal);
                            return (
                                <label key={dayVal} className="flex items-center gap-2 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        className="w-3 h-3 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                                        checked={isSelected}
                                        onChange={(e) => {
                                            const newDays = e.target.checked
                                                ? [...(data.allowedDays || []), dayVal]
                                                : (data.allowedDays || []).filter(d => d !== dayVal);
                                            data.onChange(id, { allowedDays: newDays });
                                        }}
                                    />
                                    <span className={`text-[10px] font-bold ${isSelected ? 'text-purple-600' : 'text-gray-400'} group-hover:text-purple-400 transition`}>{day}</span>
                                </label>
                            );
                        })}
                    </div>
                )}

                {conditionType === 'ai_question' && activeTab === 'config' && (
                    <div className="space-y-3 animate-fade-in">
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Pergunta Específica</label>
                            <input
                                type="text"
                                placeholder="ex: O cliente aceitou agendar?"
                                className="nodrag nopan w-full text-sm p-2 border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm"
                                value={data.aiQuestion || ''}
                                onChange={(e) => data.onChange(id, { aiQuestion: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Últimas Mensagens a Analisar (Limite)</label>
                            <input
                                type="number"
                                placeholder="15"
                                className="nodrag nopan w-full text-sm p-2 border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm font-bold text-center"
                                value={data.aiLimit || 15}
                                onChange={(e) => data.onChange(id, { aiLimit: e.target.value })}
                            />
                        </div>
                    </div>
                )}

                {conditionType === 'ai_question' && activeTab === 'instructions' && (
                    <div className="space-y-3 animate-fade-in">
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Instruções de Sucesso</label>
                            <textarea
                                className="nodrag nopan w-full text-xs p-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
                                rows={4}
                                placeholder="Descreva quais respostas são válidas (ex: 'Considere sim caso ele aceite agendar ou sugira um horário')."
                                value={data.aiInstructions || ''}
                                onChange={(e) => data.onChange(id, { aiInstructions: e.target.value })}
                            />
                        </div>
                    </div>
                )}

                <div className="h-px bg-gray-100 dark:bg-gray-700 my-2"></div>

                <div className="flex flex-col gap-3 mt-4">
                    {/* Render logic changes based on conditionType */}
                    {isRange ? (
                        <>
                            {/* ANTES */}
                            <div className="space-y-1">
                                <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg relative border border-blue-100 dark:border-blue-900 shadow-sm">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase">🕒 Antes</span>
                                        <select
                                            className="text-[9px] bg-transparent border-none outline-none font-bold text-blue-600 cursor-pointer"
                                            value={data.beforeAction || 'follow'}
                                            onChange={(e) => data.onChange(id, { beforeAction: e.target.value })}
                                        >
                                            <option value="follow">SEGUIR FLUXO</option>
                                            <option value="wait">AGUARDAR INÍCIO</option>
                                        </select>
                                    </div>
                                    {(data.beforeAction === 'follow' || !data.beforeAction) && (
                                        <Handle id="before" type="source" position={Position.Right} className="w-3 h-3 bg-blue-500 !-right-2" />
                                    )}
                                </div>
                            </div>

                            {/* DURANTE */}
                            <div className="space-y-1">
                                <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 p-2 rounded-lg relative border border-green-100 dark:border-green-900 shadow-sm">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-green-700 dark:text-green-400 uppercase">✅ Durante</span>
                                        <select
                                            className="text-[9px] bg-transparent border-none outline-none font-bold text-green-600 cursor-pointer"
                                            value={data.betweenAction || 'follow'}
                                            onChange={(e) => data.onChange(id, { betweenAction: e.target.value })}
                                        >
                                            <option value="follow">SEGUIR FLUXO</option>
                                            <option value="wait">AGUARDAR FIM</option>
                                        </select>
                                    </div>
                                    {(data.betweenAction === 'follow' || !data.betweenAction) && (
                                        <Handle id="between" type="source" position={Position.Right} className="w-3 h-3 bg-green-500 !-right-2" />
                                    )}
                                </div>
                            </div>

                            {/* DEPOIS */}
                            <div className="space-y-1">
                                <div className="flex items-center justify-between bg-red-50 dark:bg-red-900/20 p-2 rounded-lg relative border border-red-100 dark:border-red-900 shadow-sm">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-red-700 dark:text-red-400 uppercase">🚫 Depois</span>
                                        <select
                                            className="text-[9px] bg-transparent border-none outline-none font-bold text-red-600 cursor-pointer"
                                            value={data.afterAction || 'follow'}
                                            onChange={(e) => data.onChange(id, { afterAction: e.target.value })}
                                        >
                                            <option value="follow">SEGUIR FLUXO</option>
                                            <option value="stop">ENCERRAR FLUXO</option>
                                        </select>
                                    </div>
                                    {(data.afterAction === 'follow' || !data.afterAction) && (
                                        <Handle id="after" type="source" position={Position.Right} className="w-3 h-3 bg-red-500 !-right-2" />
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 p-2 rounded-lg relative border border-green-100 dark:border-green-900 shadow-sm">
                                <span className="text-xs font-black text-green-700 dark:text-green-400 uppercase flex items-center gap-1">✅ Sim / Válido</span>
                                <Handle id="yes" type="source" position={Position.Right} className="w-3 h-3 bg-green-500 !-right-2" />
                            </div>
                            <div className="flex items-center justify-between bg-red-50 dark:bg-red-900/20 p-2 rounded-lg relative border border-red-100 dark:border-red-900 shadow-sm">
                                <span className="text-xs font-black text-red-700 dark:text-red-400 uppercase flex items-center gap-1">❌ Não / Inválido</span>
                                <Handle id="no" type="source" position={Position.Right} className="w-3 h-3 bg-red-500 !-right-2" />
                            </div>
                            {conditionType === 'ai_question' && (
                                <div className="flex items-center justify-between bg-orange-50 dark:bg-orange-900/20 p-2 rounded-lg relative border border-orange-100 dark:border-orange-900 shadow-sm animate-fade-in">
                                    <span className="text-xs font-black text-orange-700 dark:text-orange-400 uppercase flex items-center gap-1">⚠️ Erro / Falha</span>
                                    <Handle id="error" type="source" position={Position.Right} className="w-3 h-3 bg-orange-500 !-right-2" />
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ConditionNode;
