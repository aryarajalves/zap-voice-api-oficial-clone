import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { FiDatabase, FiCheck, FiX, FiClock, FiZap, FiMaximize2 } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { fetchWithAuth } from '../../../AuthContext';
import { API_URL } from '../../../config';
import { useClient } from '../../../contexts/ClientContext';
import NodeHeader from '../components/NodeHeader';

const InputDataNode = ({ id, data }) => {
    const { activeClient } = useClient();
    const [aiLoading, setAiLoading] = useState(false);
    const [maximizedField, setMaximizedField] = useState(null);


    const collectionType = data.collectionType || 'traditional';
    const varName = data.varName || '';
    const validationRule = data.validationRule || 'none';
    const aiInstructions = data.aiInstructions || '';
    const timeoutValue = data.timeoutValue || 2;
    const timeoutUnit = data.timeoutUnit || 'hours';
    const errorMessage = data.errorMessage || '';
    const maxAttempts = data.maxAttempts || 3;
    const errorByAi = data.errorByAi || false;
    const question = data.question || '';

    const handleOptimizeWithAi = async () => {
        if (!question.trim()) {
            toast.error("Digite o texto da pergunta antes de otimizar com IA.");
            return;
        }

        setAiLoading(true);
        try {
            const res = await fetchWithAuth(
                `${API_URL}/whatsapp/assistant/optimize-text`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: question })
                },
                activeClient?.id
            );

            if (res.ok) {
                const result = await res.json();
                if (result.optimized_text) {
                    data.onChange(id, { question: result.optimized_text });
                    toast.success("Pergunta otimizada com sucesso!");
                }
            } else {
                const err = await res.json();
                toast.error(err.detail || 'Erro ao otimizar texto com IA.');
            }
        } catch (err) {
            console.error(err);
            toast.error('Erro de rede ao conectar com o assistente de IA.');
        } finally {
            setAiLoading(false);
        }
    };

    return (
        <div className="px-4 py-3 shadow-lg rounded-2xl bg-white dark:bg-gray-800 border-2 border-rose-500 min-w-[310px] max-w-[340px] transition-all hover:shadow-2xl">
            <Handle type="target" position={Position.Top} className="w-3 h-3 bg-rose-500" />
            
            <NodeHeader
                label="Entrada de Dados"
                icon={FiDatabase}
                colorClass="bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400"
                onDelete={() => data.onDelete(id)}
                onDuplicate={() => data.onDuplicate(id)}
                isStart={data.isStart}
                onSetStart={() => data.onSetStart(id, 'inputDataNode')}
            />

            <div className="space-y-3 mt-2 px-1">
                {/* Tipo de Coleta */}
                <div>
                    <label htmlFor={`collection-type-${id}`} className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Tipo de Coleta</label>
                    <select
                        id={`collection-type-${id}`}
                        className="nodrag nopan w-full text-xs border rounded p-2 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-semibold focus:ring-2 focus:ring-rose-500 outline-none border-gray-300 dark:border-gray-700"
                        value={collectionType}
                        onChange={(e) => data.onChange(id, { collectionType: e.target.value })}
                    >
                        <option value="traditional">Tradicional (Regex/Expressão)</option>
                        <option value="ai">Inteligente por IA (LLM)</option>
                    </select>
                </div>

                {/* Salvar Resposta Em */}
                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Salvar Resposta Em (Variável)</label>
                    <input
                        type="text"
                        placeholder="Ex: email_cliente"
                        className="nodrag nopan w-full text-xs p-2 border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm focus:ring-2 focus:ring-rose-500 outline-none border-gray-300 dark:border-gray-700 font-mono"
                        value={varName}
                        onChange={(e) => data.onChange(id, { varName: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })}
                    />
                </div>

                {/* Pergunta Inicial Opcional */}
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-1.5">
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Pergunta Inicial (Opcional)</label>
                            <button
                                type="button"
                                onClick={() => setMaximizedField('question')}
                                className="nodrag text-gray-400 hover:text-rose-500 transition-colors"
                                title="Maximizar"
                            >
                                <FiMaximize2 size={12} />
                            </button>
                        </div>
                        <button
                            type="button"
                            onClick={handleOptimizeWithAi}
                            disabled={aiLoading}
                            className="nodrag flex items-center gap-1 text-[9px] font-black text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors uppercase disabled:opacity-50"
                        >
                            <FiZap className={aiLoading ? "animate-pulse" : ""} />
                            {aiLoading ? "Otimizando..." : "Melhorar com IA"}
                        </button>
                    </div>
                    <textarea
                        placeholder="Ex: Qual é o seu e-mail para contato?"
                        rows={2}
                        className="nodrag nopan w-full text-xs p-2 border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm focus:ring-2 focus:ring-rose-500 outline-none border-gray-300 dark:border-gray-700 resize-none"
                        value={question}
                        onChange={(e) => data.onChange(id, { question: e.target.value })}
                    />
                </div>

                {/* Condicional de acordo com o tipo de coleta */}
                {collectionType === 'traditional' ? (
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Regra de Validação</label>
                        <select
                            className="nodrag nopan w-full text-xs border rounded p-2 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-semibold focus:ring-2 focus:ring-rose-500 outline-none border-gray-300 dark:border-gray-700"
                            value={validationRule}
                            onChange={(e) => data.onChange(id, { validationRule: e.target.value })}
                        >
                            <option value="none">Nenhuma (Aceitar qualquer resposta)</option>
                            <option value="email">E-mail</option>
                            <option value="phone">Telefone</option>
                            <option value="cpf">CPF</option>
                            <option value="number">Apenas Números</option>
                        </select>
                    </div>
                ) : (
                    <div>
                        <div className="flex items-center gap-1.5 mb-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Instruções de Extração (Prompt IA)</label>
                            <button
                                type="button"
                                onClick={() => setMaximizedField('aiInstructions')}
                                className="nodrag text-gray-400 hover:text-rose-500 transition-colors"
                                title="Maximizar"
                            >
                                <FiMaximize2 size={12} />
                            </button>
                        </div>
                        <textarea
                            placeholder="Ex: Extraia o faturamento mensal e converta para número..."
                            rows={3}
                            className="nodrag nopan w-full text-xs p-2 border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm focus:ring-2 focus:ring-rose-500 outline-none border-gray-300 dark:border-gray-700 resize-none"
                            value={aiInstructions}
                            onChange={(e) => data.onChange(id, { aiInstructions: e.target.value })}
                        />
                    </div>
                )}

                {/* Tempo Limite de Espera (Timeout) */}
                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Tempo Limite de Espera (Timeout)</label>
                    <div className="flex gap-2">
                        <input
                            type="number"
                            min="1"
                            className="nodrag nopan w-20 text-xs p-2 border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm focus:ring-2 focus:ring-rose-500 outline-none border-gray-300 dark:border-gray-700"
                            value={timeoutValue}
                            onChange={(e) => data.onChange(id, { timeoutValue: parseInt(e.target.value) || 1 })}
                        />
                        <select
                            className="nodrag nopan flex-1 text-xs border rounded p-2 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-semibold focus:ring-2 focus:ring-rose-500 outline-none border-gray-300 dark:border-gray-700"
                            value={timeoutUnit}
                            onChange={(e) => data.onChange(id, { timeoutUnit: e.target.value })}
                        >
                            <option value="minutes">Minutos</option>
                            <option value="hours">Horas</option>
                            <option value="days">Dias</option>
                        </select>
                    </div>
                </div>

                {/* Limite de Tentativas e Re-pergunta Inteligente */}
                <div className="grid grid-cols-2 gap-2 bg-gray-50 dark:bg-gray-900/30 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800">
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Max. Tentativas</label>
                        <select
                            className="nodrag nopan w-full text-xs border rounded p-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-semibold focus:ring-2 focus:ring-rose-500 outline-none border-gray-300 dark:border-gray-700"
                            value={maxAttempts}
                            onChange={(e) => data.onChange(id, { maxAttempts: parseInt(e.target.value) || 3 })}
                        >
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => (
                                <option key={val} value={val}>{val}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-col justify-center pl-2">
                        <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                className="nodrag nopan rounded border-gray-300 dark:border-gray-600 text-rose-550 focus:ring-rose-500 w-4 h-4 bg-white dark:bg-gray-800"
                                checked={errorByAi}
                                onChange={(e) => data.onChange(id, { errorByAi: e.target.checked })}
                            />
                            <span>Erro por IA 🧠</span>
                        </label>
                    </div>
                </div>

                {/* Mensagem de Erro / Re-pergunta */}
                <div>
                    <div className="flex items-center gap-1.5 mb-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Mensagem de Erro / Re-pergunta</label>
                        <button
                            type="button"
                            onClick={() => setMaximizedField('errorMessage')}
                            className="nodrag text-gray-400 hover:text-rose-500 transition-colors"
                            title="Maximizar"
                        >
                            <FiMaximize2 size={12} />
                        </button>
                    </div>
                    <textarea
                        placeholder="Ex: Ops, esse e-mail parece inválido. Pode digitar novamente?"
                        rows={2}
                        className="nodrag nopan w-full text-xs p-2 border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm focus:ring-2 focus:ring-rose-500 outline-none border-gray-300 dark:border-gray-700 resize-none"
                        value={errorMessage}
                        onChange={(e) => data.onChange(id, { errorMessage: e.target.value })}
                    />
                </div>
            </div>

            {/* Portas de Saída */}
            <div className="flex justify-between mt-4 pt-2 border-t border-gray-100 dark:border-gray-700 relative text-[9px] font-black uppercase tracking-wider select-none">
                <div className="flex flex-col items-start relative">
                    <span className="text-emerald-500 flex items-center gap-0.5">
                        <FiCheck className="stroke-[3]" /> Sucesso
                    </span>
                    <Handle type="source" position={Position.Bottom} id="success" className="w-3 h-3 bg-emerald-500 !left-6" />
                </div>
                <div className="flex flex-col items-center relative">
                    <span className="text-rose-500 flex items-center gap-0.5">
                        <FiX className="stroke-[3]" /> Falha
                    </span>
                    <Handle type="source" position={Position.Bottom} id="fail" className="w-3 h-3 bg-rose-500 !left-1/2 !-translate-x-1/2" />
                </div>
                <div className="flex flex-col items-end relative">
                    <span className="text-amber-500 flex items-center gap-0.5">
                        <FiClock className="stroke-[3]" /> Timeout
                    </span>
                    <Handle type="source" position={Position.Bottom} id="timeout" className="w-3 h-3 bg-amber-500 !left-auto !right-6" />
                </div>
            </div>

            {/* Modal para maximizar campo de texto */}
            {maximizedField && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-[#1e293b] border border-white/10 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#0f172a]/50">
                            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                                <FiDatabase className="text-rose-500" />
                                {maximizedField === 'question' && 'Pergunta Inicial (Opcional)'}
                                {maximizedField === 'aiInstructions' && 'Instruções de Extração (Prompt IA)'}
                                {maximizedField === 'errorMessage' && 'Mensagem de Erro / Re-pergunta'}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setMaximizedField(null)}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                <FiX size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <textarea
                                className="w-full h-80 bg-[#0b1120] border border-white/5 rounded-2xl p-4 text-xs text-gray-200 outline-none focus:ring-2 focus:ring-rose-500/30 transition-all custom-scrollbar shadow-inner resize-none"
                                value={
                                    maximizedField === 'question' ? question :
                                    maximizedField === 'aiInstructions' ? aiInstructions :
                                    errorMessage
                                }
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (maximizedField === 'question') {
                                        data.onChange(id, { question: val });
                                    } else if (maximizedField === 'aiInstructions') {
                                        data.onChange(id, { aiInstructions: val });
                                    } else if (maximizedField === 'errorMessage') {
                                        data.onChange(id, { errorMessage: val });
                                    }
                                }}
                                placeholder={
                                    maximizedField === 'question' ? 'Ex: Qual é o seu e-mail para contato?' :
                                    maximizedField === 'aiInstructions' ? 'Ex: Extraia o faturamento mensal...' :
                                    'Ex: Ops, esse e-mail parece inválido. Pode digitar novamente?'
                                }
                            />
                            <div className="flex justify-end pt-2">
                                <button
                                    type="button"
                                    onClick={() => setMaximizedField(null)}
                                    className="bg-rose-600 hover:bg-rose-500 text-white px-8 py-3 rounded-xl font-bold transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-rose-600/20 text-xs uppercase tracking-wider"
                                >
                                    <FiCheck size={16} /> Confirmar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InputDataNode;
