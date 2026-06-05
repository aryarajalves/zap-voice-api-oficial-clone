import React from 'react';
import { Handle, Position } from 'reactflow';
import { FiGlobe, FiPlus, FiTrash2 } from 'react-icons/fi';
import NodeHeader from '../components/NodeHeader';
import VariableSelector from '../components/VariableSelector';

const HttpRequestNode = ({ id, data }) => {
    const method = data.method || 'POST';
    const headers = data.headers || [];
    const payloadType = data.payloadType || 'fields';
    const payloadFields = data.payloadFields || [{ key: '', value: '' }];
    const payloadRaw = data.payloadRaw || '';

    const handleAddHeader = () => {
        const newHeaders = [...headers, { key: '', value: '' }];
        data.onChange(id, { headers: newHeaders });
    };

    const handleRemoveHeader = (index) => {
        const newHeaders = headers.filter((_, idx) => idx !== index);
        data.onChange(id, { headers: newHeaders });
    };

    const handleHeaderChange = (index, field, value) => {
        const newHeaders = headers.map((h, idx) => {
            if (idx === index) {
                return { ...h, [field]: value };
            }
            return h;
        });
        data.onChange(id, { headers: newHeaders });
    };

    const handleAddPayloadField = () => {
        const newFields = [...payloadFields, { key: '', value: '' }];
        data.onChange(id, { payloadFields: newFields });
    };

    const handleRemovePayloadField = (index) => {
        const newFields = payloadFields.filter((_, idx) => idx !== index);
        data.onChange(id, { payloadFields: newFields });
    };

    const handlePayloadFieldChange = (index, field, value) => {
        const newFields = payloadFields.map((f, idx) => {
            if (idx === index) {
                return { ...f, [field]: value };
            }
            return f;
        });
        data.onChange(id, { payloadFields: newFields });
    };

    // Função genérica para inserir variáveis na posição atual do cursor do campo focado
    const insertVariableAtActiveCursor = (val, onSelectCallback) => {
        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
            const start = activeEl.selectionStart;
            const end = activeEl.selectionEnd;
            const text = activeEl.value || '';
            const newText = text.substring(0, start) + val + text.substring(end);
            
            onSelectCallback(newText);
            
            setTimeout(() => {
                activeEl.focus();
                activeEl.setSelectionRange(start + val.length, start + val.length);
            }, 10);
        } else {
            onSelectCallback(val);
        }
    };

    return (
        <div className="px-4 py-3 shadow-lg rounded-2xl bg-white dark:bg-gray-800 border-2 border-emerald-500 min-w-[320px]">
            {/* Porta de Entrada */}
            <Handle type="target" position={Position.Top} className="w-3 h-3 bg-emerald-500" />
            
            <NodeHeader
                label="Requisição HTTP (Webhook)"
                icon={FiGlobe}
                colorClass="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
                onDelete={() => data.onDelete(id)}
                isStart={data.isStart}
                onSetStart={() => data.onSetStart(id, 'httpRequestNode')}
            />

            <div className="space-y-4">
                {/* Método HTTP */}
                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Método</label>
                    <select
                        className="nodrag nopan w-full text-sm border rounded p-2 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={method}
                        onChange={(e) => data.onChange(id, { method: e.target.value })}
                    >
                        <option value="POST">POST (Enviar Dados)</option>
                        <option value="GET">GET (Buscar Dados)</option>
                        <option value="PUT">PUT (Atualizar Dados)</option>
                    </select>
                </div>

                {/* URL de Destino */}
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase block">URL de Destino</label>
                        <VariableSelector onSelect={(v) => insertVariableAtActiveCursor(v, (newVal) => data.onChange(id, { url: newVal }))} />
                    </div>
                    <input
                        type="text"
                        placeholder="https://api.exemplo.com/webhook"
                        className="nodrag nopan w-full text-sm p-2 border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={data.url || ''}
                        onChange={(e) => data.onChange(id, { url: e.target.value })}
                    />
                </div>

                {/* Headers / Cabeçalhos */}
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase block">Headers (Autenticação / Config)</label>
                        <button
                            type="button"
                            onClick={handleAddHeader}
                            className="text-[10px] font-bold text-emerald-500 hover:text-emerald-600 flex items-center gap-1 cursor-pointer nodrag"
                        >
                            <FiPlus size={12} /> Adicionar
                        </button>
                    </div>

                    <div className="space-y-2 max-h-[140px] overflow-y-auto premium-scrollbar pr-1 nodrag">
                        {headers.map((h, index) => (
                            <div key={index} className="flex gap-1 items-center">
                                <div className="flex-1 flex gap-1">
                                    <input
                                        type="text"
                                        placeholder="Key (Ex: Authorization)"
                                        className="w-1/2 text-[11px] p-1 border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 outline-none"
                                        value={h.key}
                                        onChange={(e) => handleHeaderChange(index, 'key', e.target.value)}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Value (Ex: Bearer ...)"
                                        className="w-1/2 text-[11px] p-1 border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 outline-none"
                                        value={h.value}
                                        onChange={(e) => handleHeaderChange(index, 'value', e.target.value)}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveHeader(index)}
                                    className="text-gray-400 hover:text-red-500 cursor-pointer"
                                    title="Remover Header"
                                >
                                    <FiTrash2 size={12} />
                                </button>
                            </div>
                        ))}
                        {headers.length === 0 && (
                            <p className="text-[10px] text-gray-400 italic text-center py-1">Nenhum header configurado.</p>
                        )}
                    </div>
                </div>

                {/* Payload (JSON) */}
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase block">Configuração do Payload</label>
                        <select
                            className="nodrag nopan text-[10px] border rounded px-1.5 py-0.5 bg-gray-55 dark:bg-gray-900 text-gray-700 dark:text-gray-300 font-bold outline-none cursor-pointer"
                            value={payloadType}
                            onChange={(e) => data.onChange(id, { payloadType: e.target.value })}
                        >
                            <option value="fields">Campos Chave/Valor</option>
                            <option value="raw">JSON Bruto (Texto)</option>
                        </select>
                    </div>

                    {payloadType === 'fields' ? (
                        <div className="space-y-2 nodrag">
                            <div className="flex justify-between items-center">
                                <span className="text-[9px] text-gray-400 italic">Preencha os campos a serem enviados no JSON.</span>
                                <div className="flex items-center gap-2">
                                    <VariableSelector onSelect={(v) => insertVariableAtActiveCursor(v, (newVal) => {
                                        // Apenas para expor o seletor genérico
                                    })} />
                                    <button
                                        type="button"
                                        onClick={handleAddPayloadField}
                                        className="text-[10px] font-bold text-emerald-500 hover:text-emerald-600 flex items-center gap-0.5 cursor-pointer"
                                    >
                                        <FiPlus size={12} /> Campo
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2 max-h-[160px] overflow-y-auto premium-scrollbar pr-1">
                                {payloadFields.map((f, index) => (
                                    <div key={index} className="flex gap-1 items-center">
                                        <div className="flex-1 flex gap-1">
                                            <input
                                                type="text"
                                                placeholder="Chave (Ex: nome)"
                                                className="w-1/2 text-[11px] p-1 border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 outline-none"
                                                value={f.key}
                                                onChange={(e) => handlePayloadFieldChange(index, 'key', e.target.value)}
                                            />
                                            <input
                                                type="text"
                                                placeholder="Valor (Ex: {{nome}})"
                                                className="w-1/2 text-[11px] p-1 border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 outline-none"
                                                value={f.value}
                                                onChange={(e) => handlePayloadFieldChange(index, 'value', e.target.value)}
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleRemovePayloadField(index)}
                                            className="text-gray-400 hover:text-red-500 cursor-pointer"
                                            title="Remover Campo"
                                        >
                                            <FiTrash2 size={12} />
                                        </button>
                                    </div>
                                ))}
                                {payloadFields.length === 0 && (
                                    <p className="text-[10px] text-gray-400 italic text-center py-1">Nenhum campo adicionado.</p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="animate-fade-in">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[9px] text-gray-400 italic">Escreva o JSON bruto estruturado manualmente.</span>
                                <VariableSelector onSelect={(v) => insertVariableAtActiveCursor(v, (newVal) => data.onChange(id, { payloadRaw: newVal }))} />
                            </div>
                            <textarea
                                rows={4}
                                placeholder='Ex: { "telefone": "{{telefone}}", "etapa": "oferta-1" }'
                                className="nodrag nopan w-full text-xs p-2 border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                                value={payloadRaw}
                                onChange={(e) => data.onChange(id, { payloadRaw: e.target.value })}
                            />
                        </div>
                    )}
                </div>

                {/* Portas de Saída */}
                <div className="h-px bg-gray-100 dark:bg-gray-700 my-2"></div>

                <div className="flex flex-col gap-2 mt-2">
                    {/* Sucesso */}
                    <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 p-2 rounded-lg relative border border-green-100 dark:border-green-900 shadow-sm">
                        <span className="text-[11px] font-black text-green-700 dark:text-green-400 uppercase flex items-center gap-1">✅ Sucesso (2xx)</span>
                        <Handle id="success" type="source" position={Position.Right} className="w-3 h-3 bg-green-500 !-right-2" />
                    </div>
                    {/* Falha */}
                    <div className="flex items-center justify-between bg-red-50 dark:bg-red-900/20 p-2 rounded-lg relative border border-red-100 dark:border-red-900 shadow-sm">
                        <span className="text-[11px] font-black text-red-700 dark:text-red-400 uppercase flex items-center gap-1">❌ Falha / Timeout</span>
                        <Handle id="fail" type="source" position={Position.Right} className="w-3 h-3 bg-red-500 !-right-2" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HttpRequestNode;
