import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { FiMessageSquare, FiPlus, FiCpu, FiClock, FiTrash2, FiMaximize2 } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import NodeHeader from '../components/NodeHeader';
import VariableSelector from '../components/VariableSelector';
import ExpandTextModal from '../../BulkSender/common/ExpandTextModal';

const MessageNode = ({ id, data }) => {
    const variations = data.variations || [];
    const [activeModalKey, setActiveModalKey] = useState(null); // null, 'content', ou 'variation_index'

    const handleSaveModal = (key, val) => {
        if (key === 'content') {
            data.onChange(id, { content: val });
        } else if (key.startsWith('variation_')) {
            const idx = parseInt(key.split('_')[1], 10);
            handleVariationChange(idx, val);
        }
    };

    const handleAddVariation = () => {
        if (variations.length >= 4) {
            toast.error("Máximo de 5 versões (1 principal + 4 variações).");
            return;
        }
        data.onChange(id, { variations: [...variations, ''] });
    };

    const handleRemoveVariation = (index) => {
        const newVariations = variations.filter((_, i) => i !== index);
        data.onChange(id, { variations: newVariations });
    };

    const handleVariationChange = (index, val) => {
        const newVariations = [...variations];
        newVariations[index] = val;
        data.onChange(id, { variations: newVariations });
    };

    return (
        <div className="px-4 py-3 shadow-lg rounded-xl bg-white dark:bg-gray-800 border-2 border-blue-500 min-w-[300px] transition-all hover:shadow-2xl hover:border-blue-400">
            {!data.isStart && <Handle type="target" position={Position.Top} className="w-3 h-3 bg-blue-500" />}
            <NodeHeader
                label="Mensagem"
                icon={FiMessageSquare}
                colorClass="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
                onDelete={() => data.onDelete(id)}
                isStart={data.isStart}
                onSetStart={() => data.onSetStart(id, 'messageNode')}
            />

            <div className="space-y-3">
                <div className="relative">
                    <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-blue-500 uppercase">Versão 1 (Principal)</span>
                            <button
                                onClick={() => setActiveModalKey('content')}
                                className="text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors nodrag p-0.5"
                                title="Maximizar Texto"
                                type="button"
                            >
                                <FiMaximize2 size={11} />
                            </button>
                        </div>
                        <VariableSelector onSelect={(v) => data.onChange(id, { content: (data.content || '') + v })} />
                    </div>
                    <textarea
                        className="nodrag nopan w-full text-base p-3 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none resize-none min-h-[80px]"
                        placeholder="Digite a mensagem..."
                        value={data.content || ''}
                        onChange={(evt) => data.onChange(id, { content: evt.target.value })}
                    />
                </div>

                {variations.map((v, idx) => (
                    <div key={idx} className="relative animate-fade-in group">
                        <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Versão {idx + 2}</span>
                                <button
                                    onClick={() => setActiveModalKey(`variation_${idx}`)}
                                    className="text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors nodrag p-0.5"
                                    title="Maximizar Texto"
                                    type="button"
                                >
                                    <FiMaximize2 size={11} />
                                </button>
                                <VariableSelector onSelect={(v) => handleVariationChange(idx, (variations[idx] || '') + v)} />
                            </div>
                            <button
                                onClick={() => handleRemoveVariation(idx)}
                                className="text-gray-400 hover:text-red-500 transition nodrag"
                                title="Remover Variação"
                            >
                                <FiTrash2 size={10} />
                            </button>
                        </div>
                        <textarea
                            className="nodrag nopan w-full text-sm p-2 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg border border-gray-100 dark:border-gray-800 focus:ring-2 focus:ring-blue-400 outline-none resize-none min-h-[60px]"
                            placeholder={`Digite a variação ${idx + 2}...`}
                            value={v}
                            onChange={(e) => handleVariationChange(idx, e.target.value)}
                        />
                    </div>
                ))}

                {variations.length < 4 && (
                    <button
                        onClick={handleAddVariation}
                        className="w-full py-2 text-xs font-bold text-blue-500 border border-dashed border-blue-200 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition flex items-center justify-center gap-1 nodrag"
                    >
                        <FiPlus /> Adicionar Versão A/B
                    </button>
                )}

                {/* Seção de Botões Interativos */}
                <div className="pt-2 mt-1 border-t border-gray-100 dark:border-gray-700 space-y-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Botões Interativos (Opcional - Máx. 3)</span>
                    
                    {(data.buttons || []).map((btn, idx) => (
                        <div key={idx} className="flex gap-1 group animate-fade-in relative items-center">
                            <input
                                type="text"
                                className="nodrag nopan flex-1 text-[11px] p-1.5 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded border border-gray-200 dark:border-gray-700 outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                                placeholder={`Texto do Botão ${idx + 1}`}
                                value={btn}
                                onChange={(e) => {
                                    const newButtons = [...(data.buttons || [])];
                                    newButtons[idx] = e.target.value;
                                    data.onChange(id, { buttons: newButtons });
                                }}
                                maxLength={20}
                            />
                            <button
                                onClick={() => {
                                    const newButtons = (data.buttons || []).filter((_, i) => i !== idx);
                                    data.onChange(id, { buttons: newButtons });
                                }}
                                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition nodrag animate-fade-in mr-1"
                                title="Remover Botão"
                            >
                                <FiTrash2 size={12} />
                            </button>
                            <Handle
                                type="source"
                                position={Position.Right}
                                id={`button_${idx}`}
                                className="w-3 h-3 bg-blue-500 hover:bg-blue-600 hover:scale-125 transition border-2 border-white dark:border-gray-800 !-right-[20px]"
                            />
                        </div>
                    ))}
                    
                    {(data.buttons || []).length < 3 && (
                        <button
                            onClick={() => {
                                const newButtons = [...(data.buttons || []), ''];
                                data.onChange(id, { buttons: newButtons });
                            }}
                            className="w-full py-1.5 border border-dashed border-blue-200 dark:border-blue-800 rounded text-[10px] text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition flex items-center justify-center gap-1 nodrag font-bold"
                        >
                            <FiPlus size={12} /> Adicionar Botão
                        </button>
                    )}
                </div>

                <div className="pt-2 mt-1 border-t border-gray-100 dark:border-gray-700 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none group/toggle">
                        <div className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={data.publishExternalEvent || false}
                                onChange={(e) => data.onChange(id, { publishExternalEvent: e.target.checked })}
                            />
                            <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </div>
                        <div className="flex items-center gap-1">
                            <FiCpu size={10} className="text-blue-500 opacity-70" />
                            <span className="text-[10px] font-bold text-gray-500 uppercase group-hover/toggle:text-blue-600 transition-colors">Enviar para Memória?</span>
                        </div>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer select-none group/toggle">
                        <div className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={data.onlyBusinessHours || false}
                                onChange={(e) => data.onChange(id, { onlyBusinessHours: e.target.checked })}
                            />
                            <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </div>
                        <div className="flex items-center gap-1">
                            <FiClock size={10} className="text-blue-500 opacity-70" />
                            <span className="text-[10px] font-bold text-gray-500 uppercase group-hover/toggle:text-blue-600 transition-colors">Apenas Horário Comercial?</span>
                        </div>
                    </label>
                </div>
            </div>

            {/* Legenda para o conector inferior */}
            {(data.buttons || []).length > 0 && (
                <div className="text-[9px] text-gray-400 dark:text-gray-500 text-center mt-1 mb-2 font-bold select-none uppercase tracking-wider">
                    Outra resposta / Texto ⬇️
                </div>
            )}

            <Handle type="source" position={Position.Bottom} id="default" className="w-3 h-3 bg-blue-500" />

            {/* Modal de Texto Expandido */}
            {activeModalKey && (
                <ExpandTextModal
                    isOpen={!!activeModalKey}
                    onClose={() => setActiveModalKey(null)}
                    title={activeModalKey === 'content' ? "Mensagem Principal (Versão 1)" : `Mensagem Variação (Versão ${parseInt(activeModalKey.split('_')[1], 10) + 2})`}
                    value={activeModalKey === 'content' ? (data.content || '') : (variations[parseInt(activeModalKey.split('_')[1], 10)] || '')}
                    onSave={handleSaveModal}
                    fieldKey={activeModalKey}
                />
            )}
        </div>
    );
};

export default MessageNode;
