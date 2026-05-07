import React, { useState, useEffect } from 'react';
import { FiFileText, FiTag, FiImage, FiInfo, FiMessageSquare, FiMinimize, FiMaximize, FiPlus, FiTrash2 } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { useClient } from '../../../contexts/ClientContext';
import { fetchWithAuth } from '../../../AuthContext';
import { API_URL } from '../../../config';
import NodeHeader from '../components/NodeHeader';
import VariableSelector from '../components/VariableSelector';

const TemplateNode = ({ id, data }) => {
    const { activeClient } = useClient();
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!activeClient) return;
        setLoading(true);
        fetchWithAuth(`${API_URL}/whatsapp/templates`, {}, activeClient.id)
            .then(res => res.json())
            .then(setTemplates)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [activeClient, data.refreshKey]);

    return (
        <div className="px-4 py-3 shadow-lg rounded-xl bg-white dark:bg-gray-800 border-2 border-emerald-500 min-w-[280px] max-w-[320px] transition-all hover:shadow-2xl hover:border-emerald-400">
            <NodeHeader
                label="Template WhatsApp"
                icon={FiFileText}
                colorClass="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
                onDelete={() => data.onDelete(id)}
                isStart={data.isStart}
                onSetStart={() => data.onSetStart(id, 'templateNode')}
            />

            <div className="space-y-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-100 dark:border-blue-900/30">
                    <p className="text-[10px] text-blue-700 dark:text-blue-400 leading-tight">
                        Este nó é <strong>isolado</strong>. Para funcionar, ele deve ser definido como o <strong>Ponto de Início</strong> (ícone de bandeira).
                    </p>
                </div>

                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Modelo (Template)</label>
                    <select
                        className={`nodrag nopan w-full text-sm p-2 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded border border-gray-200 outline-none ${loading ? 'opacity-50 cursor-wait' : ''}`}
                        value={data.templateName || ''}
                        onChange={(e) => {
                            const selectedName = e.target.value;
                            const t = templates.find(temp => temp.name === selectedName);
                            data.onChange(id, {
                                templateName: selectedName,
                                language: t ? t.language : 'pt_BR'
                            });
                        }}
                        disabled={loading}
                    >
                        {loading ? (
                            <option value="">🔄 Carregando templates...</option>
                        ) : (
                            <>
                                <option value="">Selecione um Template...</option>
                                {Array.isArray(templates) && templates
                                    .filter(t => ['APPROVED', 'ACTIVE'].includes(t.status))
                                    .map(t => (
                                        <option key={t.id || t.name} value={t.name}>{t.name} ({t.language})</option>
                                    ))}
                            </>
                        )}
                    </select>
                </div>

                {/* Preview Section */}
                {data.templateName && templates.find(t => t.name === data.templateName) && (() => {
                    const t = templates.find(t => t.name === data.templateName);
                    const body = t.components?.find(c => c.type === 'BODY')?.text || '';
                    const header = t.components?.find(c => c.type === 'HEADER');
                    const buttons = t.components?.find(c => c.type === 'BUTTONS')?.buttons || [];

                    return (
                        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-800 animate-in fade-in duration-300">
                            {/* Categoria */}
                            <div className="flex items-center gap-1.5 mb-2">
                                <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[9px] font-bold rounded uppercase tracking-wider flex items-center gap-1">
                                    <FiTag size={10} /> {t.category}
                                </span>
                                <span className="text-[9px] text-gray-400 font-medium">{t.language}</span>
                            </div>

                            {/* Header Media Badge */}
                            {header && header.format !== 'TEXT' && (
                                <div className="flex items-center gap-1 text-blue-500 mb-2">
                                    <FiImage size={12} />
                                    <span className="text-[10px] font-bold uppercase">{header.format}</span>
                                </div>
                            )}

                            {/* Body Text Preview */}
                            <div className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed italic border-l-2 border-emerald-500/30 pl-2 py-1 mb-3">
                                {body || 'Sem conteúdo de texto'}
                            </div>

                            {/* Buttons Preview */}
                            {buttons.length > 0 && (
                                <div className="space-y-1">
                                    <span className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Botões Interativos</span>
                                    {buttons.map((btn, idx) => (
                                        <div key={idx} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-center py-1.5 rounded-md text-[10px] font-medium text-blue-600 dark:text-blue-400 shadow-sm">
                                            {btn.text}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })()}

                {/* 24h Window Check Toggle */}
                <div className="mt-4 border-t border-gray-100 dark:border-gray-700 pt-3">
                    <label className="flex items-center gap-2 cursor-pointer mb-2">
                        <input
                            type="checkbox"
                            className="w-3 h-3 text-purple-500 rounded border-gray-300 focus:ring-purple-500"
                            checked={data.check24hWindow || false}
                            onChange={(e) => data.onChange(id, { check24hWindow: e.target.checked })}
                        />
                        <span className="text-[10px] font-bold text-gray-500 uppercase">Verificar Janela 24h?</span>
                    </label>

                    {data.check24hWindow && (
                        <div className="animate-fade-in space-y-2 p-2 bg-purple-50 dark:bg-purple-900/10 rounded-lg border border-purple-100 dark:border-purple-800">
                            <div className="flex items-start gap-1.5 mb-2">
                                <FiInfo className="text-purple-500 mt-0.5 shrink-0" size={12} />
                                <p className="text-[9px] text-purple-700 dark:text-purple-300 leading-tight">
                                    Se houver interação nas últimas 24h, o sistema enviará a mensagem abaixo (sessão 24h) em vez do template pago.
                                </p>
                            </div>

                            <div className="flex gap-2 mb-2">
                                <button
                                    onClick={() => {
                                        if (data.templateName) {
                                            const t = templates.find(temp => temp.name === data.templateName);
                                            if (t) {
                                                const body = t.components?.find(c => c.type === 'BODY')?.text || '';
                                                data.onChange(id, { fallbackMessage: body });
                                                toast.success("Texto do template copiado!");
                                            }
                                        }
                                    }}
                                    className="text-[9px] px-2 py-1 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/40 dark:hover:bg-purple-800 text-purple-700 dark:text-purple-300 rounded transition flex items-center gap-1"
                                    title="Preencher com o texto do template selecionado acima"
                                >
                                    <FiFileText size={10} /> Copiar do Template
                                </button>
                            </div>

                            <div className="relative group/fb">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[9px] font-bold text-gray-400 uppercase">Mensagem Alternativa</span>
                                    <VariableSelector onSelect={(v) => data.onChange(id, { fallbackMessage: (data.fallbackMessage || '') + v })} />
                                </div>
                                <textarea
                                    className="nodrag nopan w-full text-xs p-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded border border-purple-200 dark:border-purple-700 focus:ring-1 focus:ring-purple-500 outline-none resize-none min-h-[80px]"
                                    placeholder="Mensagem alternativa (Opcional). Se vazio, envia o template mesmo com janela aberta."
                                    value={data.fallbackMessage || ''}
                                    onChange={(e) => data.onChange(id, { fallbackMessage: e.target.value })}
                                />
                                <button
                                    onClick={() => data.onChange(id, { isFallbackExpanded: true })}
                                    className="absolute top-8 right-1 p-1 text-gray-400 hover:text-purple-500 bg-white/50 dark:bg-black/20 rounded opacity-0 group-hover/fb:opacity-100 transition"
                                    title="Maximizar"
                                >
                                    <FiMaximize size={12} />
                                </button>
                            </div>

                            {/* Buttons for Fallback Message */}
                            <div className="mt-2 space-y-2">
                                {(data.fallbackButtons || []).map((btn, idx) => (
                                    <div key={idx} className="flex gap-1 group">
                                        <input
                                            type="text"
                                            className="nodrag nopan flex-1 text-[10px] p-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded border border-purple-200 dark:border-purple-700 outline-none focus:border-purple-500"
                                            placeholder={`Botão ${idx + 1}`}
                                            value={btn}
                                            onChange={(e) => {
                                                const newButtons = [...(data.fallbackButtons || [])];
                                                newButtons[idx] = e.target.value;
                                                data.onChange(id, { fallbackButtons: newButtons });
                                            }}
                                            maxLength={20}
                                        />
                                        <button
                                            onClick={() => {
                                                const newButtons = (data.fallbackButtons || []).filter((_, i) => i !== idx);
                                                data.onChange(id, { fallbackButtons: newButtons });
                                            }}
                                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition nodrag"
                                        >
                                            <FiTrash2 size={12} />
                                        </button>
                                    </div>
                                ))}
                                {(data.fallbackButtons || []).length < 3 && (
                                    <button
                                        onClick={() => {
                                            const newButtons = [...(data.fallbackButtons || []), ''];
                                            data.onChange(id, { fallbackButtons: newButtons });
                                        }}
                                        className="w-full py-1.5 border border-dashed border-purple-300 dark:border-purple-700 rounded text-[10px] text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/20 transition flex items-center justify-center gap-1 nodrag"
                                    >
                                        <FiPlus size={12} /> Adicionar Botão
                                    </button>
                                )}
                            </div>

                            {/* Expanded Modal for Fallback */}
                            {data.isFallbackExpanded && (
                                <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                                    <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
                                        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
                                            <h3 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                                <FiMessageSquare /> Mensagem Alternativa (Expandida)
                                            </h3>
                                            <button
                                                onClick={() => data.onChange(id, { isFallbackExpanded: false })}
                                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
                                            >
                                                <FiMinimize size={18} />
                                            </button>
                                        </div>
                                        <div className="p-4 flex-1 flex flex-col">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-sm font-medium text-gray-500">Escreva sua mensagem:</span>
                                                <VariableSelector onSelect={(v) => data.onChange(id, { fallbackMessage: (data.fallbackMessage || '') + v })} />
                                            </div>
                                            <textarea
                                                className="w-full h-full text-base p-4 bg-purple-50 dark:bg-purple-900/10 text-gray-800 dark:text-gray-200 rounded-lg border border-purple-200 dark:border-purple-800 focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                                                value={data.fallbackMessage || ''}
                                                onChange={(e) => data.onChange(id, { fallbackMessage: e.target.value })}
                                                placeholder="Escreva a mensagem alternativa..."
                                                autoFocus
                                            />
                                        </div>
                                        <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                                            <button
                                                onClick={() => data.onChange(id, { isFallbackExpanded: false })}
                                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-bold text-sm"
                                            >
                                                Concluir
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Private Message Toggle */}
                <div className="mt-4 border-t border-gray-100 dark:border-gray-700 pt-3">
                    <label className="flex items-center gap-2 cursor-pointer mb-2">
                        <input
                            type="checkbox"
                            className="w-3 h-3 text-emerald-500 rounded border-gray-300 focus:ring-emerald-500"
                            checked={data.sendPrivateMessage || false}
                            onChange={(e) => data.onChange(id, { sendPrivateMessage: e.target.checked })}
                        />
                        <span className="text-[10px] font-bold text-gray-500 uppercase">Enviar Nota Privada no Chatwoot?</span>
                    </label>

                    {data.sendPrivateMessage && (
                        <div className="animate-fade-in space-y-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="w-3 h-3 text-blue-500 rounded border-gray-300 focus:ring-blue-500"
                                    checked={data.useTemplateBody || false}
                                    onChange={(e) => {
                                        const useBody = e.target.checked;
                                        let newMsg = data.privateMessage;

                                        if (useBody && data.templateName) {
                                            const t = templates.find(temp => temp.name === data.templateName);
                                            if (t) {
                                                const body = t.components?.find(c => c.type === 'BODY')?.text || '';
                                                newMsg = body;
                                            }
                                        }
                                        data.onChange(id, { useTemplateBody: useBody, privateMessage: newMsg });
                                    }}
                                />
                                <span className="text-[9px] text-gray-400">Usar texto do template automaticamente</span>
                            </label>

                            <div className="relative group">
                                <textarea
                                    className={`nodrag nopan w-full text-xs p-2 bg-yellow-50 dark:bg-yellow-900/10 text-gray-800 dark:text-gray-200 rounded border border-yellow-200 dark:border-yellow-800 focus:ring-1 focus:ring-yellow-500 outline-none resize-none min-h-[60px] ${data.useTemplateBody ? 'opacity-60 cursor-not-allowed' : ''}`}
                                    placeholder="Escreva a nota interna para o agente..."
                                    value={data.privateMessage || ''}
                                    onChange={(e) => data.onChange(id, { privateMessage: e.target.value })}
                                    readOnly={data.useTemplateBody}
                                />
                                <button
                                    onClick={() => data.onChange(id, { isExpanded: true })}
                                    className="absolute top-1 right-1 p-1 text-gray-400 hover:text-blue-500 bg-white/50 dark:bg-black/20 rounded opacity-0 group-hover:opacity-100 transition"
                                    title="Maximizar"
                                >
                                    <FiMaximize size={12} />
                                </button>
                            </div>

                            {/* Expanded Modal */}
                            {data.isExpanded && (
                                <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                                    <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
                                        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
                                            <h3 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                                <FiFileText /> Nota Interna (Expandida)
                                            </h3>
                                            <button
                                                onClick={() => data.onChange(id, { isExpanded: false })}
                                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
                                            >
                                                <FiMinimize size={18} />
                                            </button>
                                        </div>
                                        <div className="p-4 flex-1">
                                            <textarea
                                                className={`w-full h-[60vh] text-base p-4 bg-yellow-50 dark:bg-yellow-900/10 text-gray-800 dark:text-gray-200 rounded-lg border border-yellow-200 dark:border-yellow-800 focus:ring-2 focus:ring-yellow-500 outline-none resize-none ${data.useTemplateBody ? 'opacity-80 cursor-not-allowed' : ''}`}
                                                value={data.privateMessage || ''}
                                                onChange={(e) => data.onChange(id, { privateMessage: e.target.value })}
                                                readOnly={data.useTemplateBody}
                                                placeholder="Escreva a nota interna para o agente..."
                                                autoFocus
                                            />
                                        </div>
                                        <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                                            <button
                                                onClick={() => data.onChange(id, { isExpanded: false })}
                                                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-bold text-sm"
                                            >
                                                Concluir
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TemplateNode;
