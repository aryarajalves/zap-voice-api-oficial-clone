import React, { useState, useEffect, useMemo } from 'react';
import { Handle, Position } from 'reactflow';
import { FiFileText, FiGlobe, FiCopy } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { useClient } from '../../../contexts/ClientContext';
import { fetchWithAuth } from '../../../AuthContext';
import { API_URL } from '../../../config';
import NodeHeader from '../components/NodeHeader';
import VariableSelector from '../components/VariableSelector';
import SearchableSelect from '../../../pages/Integrations/components/SearchableSelect';

const SendTemplateNode = ({ id, data }) => {
    const { activeClient } = useClient();
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTag, setSelectedTag] = useState(null);

    const templateName = data.templateName || '';
    const language = data.language || 'pt_BR';
    const mappings = data.mappings || []; // Array de { paramIndex: 1, value: '' }

    useEffect(() => {
        if (!activeClient) return;
        setLoading(true);
        fetchWithAuth(`${API_URL}/whatsapp/templates?include_paused=false`, {}, activeClient.id)
            .then(res => res.json())
            .then(setTemplates)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [activeClient]);

    // Extrai todas as tags únicas de todos os templates
    const allTags = useMemo(() => {
        if (!Array.isArray(templates)) return [];
        const tagsSet = new Set();
        templates.forEach(t => {
            if (t.tags && Array.isArray(t.tags)) {
                t.tags.forEach(tag => {
                    if (tag && tag.trim()) tagsSet.add(tag.trim());
                });
            }
            if (t.category && t.category.trim()) {
                tagsSet.add(t.category.trim());
            }
        });
        return Array.from(tagsSet);
    }, [templates]);

    // Filtra e ordena os templates
    const sortedAndFilteredTemplates = useMemo(() => {
        if (!Array.isArray(templates)) return [];
        
        let filtered = templates.filter(t => ['APPROVED', 'ACTIVE'].includes(t.status));
        
        if (selectedTag) {
            filtered = filtered.filter(t => 
                (t.tags && t.tags.includes(selectedTag)) || 
                t.category === selectedTag
            );
        }

        // Ordenação: is_pinned primeiro (true antes de false), depois por nome
        return [...filtered].sort((a, b) => {
            const pinA = a.is_pinned ? 1 : 0;
            const pinB = b.is_pinned ? 1 : 0;
            if (pinA !== pinB) {
                return pinB - pinA; // Pinned (1) primeiro
            }
            return (a.name || '').localeCompare(b.name || '');
        });
    }, [templates, selectedTag]);

    // Detecta o template selecionado para identificar variáveis dinamicamente
    const selectedTemplate = useMemo(() => {
        if (!templateName || !Array.isArray(templates)) return null;
        return templates.find(t => t.name === templateName);
    }, [templateName, templates]);

    // Extrai o texto do corpo e descobre o número de variáveis {{1}}, {{2}}...
    const bodyVariablesCount = useMemo(() => {
        if (!selectedTemplate) return 0;
        const bodyComp = selectedTemplate.components?.find(c => c.type === 'BODY');
        if (!bodyComp || !bodyComp.text) return 0;

        // Procura padrões de {{d+}} no texto do template
        const matches = bodyComp.text.match(/\{\{(\d+)\}\}/g);
        if (!matches) return 0;

        // Pega o maior número de variável encontrado (ex: se tiver {{1}} e {{2}}, retorna 2)
        const indexes = matches.map(m => parseInt(m.replace(/[\{\}]/g, ''), 10));
        return Math.max(...indexes, 0);
    }, [selectedTemplate]);

    // Extrai botões interativos do template se houver
    const interactiveButtons = useMemo(() => {
        if (!selectedTemplate) return [];
        const buttonsComp = selectedTemplate.components?.find(c => c.type === 'BUTTONS');
        return buttonsComp?.buttons || [];
    }, [selectedTemplate]);

    // Atualiza ou inicializa os mappings quando o número de variáveis muda
    useEffect(() => {
        if (bodyVariablesCount > 0) {
            const currentMappings = data.mappings || [];
            const newMappings = [];
            for (let i = 1; i <= bodyVariablesCount; i++) {
                const existing = currentMappings.find(m => m.paramIndex === i);
                newMappings.push({
                    paramIndex: i,
                    value: existing ? existing.value : ''
                });
            }
            // Só dispara onChange se os mappings reais tiverem mudado para evitar loop infinito
            if (JSON.stringify(currentMappings) !== JSON.stringify(newMappings)) {
                data.onChange(id, { mappings: newMappings });
            }
        } else if ((data.mappings || []).length > 0) {
            data.onChange(id, { mappings: [] });
        }
    }, [bodyVariablesCount, id]);

    const handleMappingValueChange = (index, val) => {
        const currentMappings = [...(data.mappings || [])];
        const target = currentMappings.find(m => m.paramIndex === index);
        if (target) {
            target.value = val;
            data.onChange(id, { mappings: currentMappings });
        }
    };

    return (
        <div className="px-4 py-3 shadow-lg rounded-2xl bg-white dark:bg-gray-800 border-2 border-emerald-500 min-w-[290px] max-w-[320px] transition-all hover:shadow-2xl">
            <Handle type="target" position={Position.Top} className="w-3 h-3 bg-emerald-500" />
            
            <NodeHeader
                label="Disparo de Template (Meta)"
                icon={FiFileText}
                colorClass="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
                onDelete={() => data.onDelete(id)}
                onDuplicate={() => data.onDuplicate(id)}
                isStart={data.isStart}
                onSetStart={() => data.onSetStart(id, 'sendTemplateNode')}
            />

            <div className="space-y-3 mt-2 px-1">
                {/* Filtro por Etiquetas / Categoria */}
                {allTags.length > 0 && (
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Filtrar por Etiqueta/Categoria</label>
                        <div className="nodrag nopan flex flex-wrap gap-1 max-h-[60px] overflow-y-auto pr-1">
                            <button
                                type="button"
                                onClick={() => setSelectedTag(null)}
                                className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-all ${
                                    !selectedTag 
                                        ? 'bg-emerald-500 text-white shadow-sm' 
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-650'
                                }`}
                            >
                                Todas
                            </button>
                            {allTags.map(tag => (
                                <button
                                    type="button"
                                    key={tag}
                                    onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                                    className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-all ${
                                        selectedTag === tag 
                                            ? 'bg-emerald-500 text-white shadow-sm' 
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-650'
                                    }`}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Seleção do Template */}
                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Modelo (Template)</label>
                    <div className="nodrag nopan">
                        <SearchableSelect
                            options={sortedAndFilteredTemplates.map(t => ({
                                value: t.name,
                                label: `${t.is_pinned ? '📌 ' : ''}${t.name} (${t.language})`,
                                tags: t.tags
                            }))}
                            value={templateName}
                            onChange={(selectedName) => {
                                const t = templates.find(temp => temp.name === selectedName);
                                data.onChange(id, {
                                    templateName: selectedName,
                                    language: t ? t.language : 'pt_BR',
                                    mappings: [] // Limpa ao trocar
                                });
                            }}
                            placeholder={loading ? "Carregando templates..." : "Selecione um Template..."}
                            allowNone
                        />
                    </div>
                </div>

                {/* Exibição do Idioma (Apenas Visualização) */}
                {templateName && (
                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900/50 p-2 rounded border border-gray-100 dark:border-gray-700/50">
                        <FiGlobe className="text-emerald-500" size={14} />
                        <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-gray-400 uppercase leading-none">Idioma</span>
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 mt-0.5">{language}</span>
                        </div>
                    </div>
                )}

                {/* Preview e Variáveis */}
                {selectedTemplate && (
                    <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-700/50">
                        {/* Preview do Corpo */}
                        <div className="relative group/preview">
                            <div className="text-[10px] text-gray-500 bg-gray-50 dark:bg-gray-900/50 p-2 pr-8 rounded leading-relaxed border border-dashed border-gray-200 dark:border-gray-700/70 select-none">
                                {selectedTemplate.components?.find(c => c.type === 'BODY')?.text || 'Sem texto.'}
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    const text = selectedTemplate.components?.find(c => c.type === 'BODY')?.text || '';
                                    if (text) {
                                        navigator.clipboard.writeText(text);
                                        toast.success("Texto do template copiado!");
                                    }
                                }}
                                className="nodrag nopan absolute top-1.5 right-1.5 p-1 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-emerald-500 hover:border-emerald-500 dark:hover:text-emerald-400 dark:hover:border-emerald-500 shadow-sm transition-all"
                                title="Copiar texto do template"
                             >
                                 <FiCopy size={11} />
                             </button>
                        </div>

                        {/* Mapeamento de Parâmetros Dinâmicos */}
                        {mappings.length > 0 && (
                            <div className="space-y-2.5">
                                <label className="text-[10px] font-bold text-gray-400 uppercase block">Mapear Parâmetros</label>
                                {mappings.map(map => (
                                    <div key={map.paramIndex} className="flex flex-col gap-1 relative">
                                        <div className="flex justify-between items-center mb-0.5">
                                            <span className="text-[9px] font-bold text-emerald-500">Parâmetro {"{{"}{map.paramIndex}{"}}"}</span>
                                            <VariableSelector onSelect={(v) => handleMappingValueChange(map.paramIndex, (map.value || '') + v)} />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder={`Valor para {{${map.paramIndex}}}`}
                                            className="nodrag nopan w-full text-xs p-2 border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none border-gray-300 dark:border-gray-700"
                                            value={map.value || ''}
                                            onChange={(e) => handleMappingValueChange(map.paramIndex, e.target.value)}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Portas de Saída para os Botões Interativos (se configurados na Meta como QUICK_REPLY) */}
            {interactiveButtons.length > 0 && (
                <div className="space-y-2.5 mt-3 pt-2.5 border-t border-gray-150 dark:border-gray-750">
                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-wider block mb-1">Caminhos por Botão</span>
                    {interactiveButtons.map((btn, idx) => {
                        // Apenas QUICK_REPLY é clicável para fluir caminhos. PHONE_NUMBER e URL não criam portas de fluxo
                        if (btn.type !== 'QUICK_REPLY') return null;
                        return (
                            <div key={idx} className="flex justify-between items-center relative py-1 px-2 rounded-md bg-gray-50 dark:bg-gray-900 border border-gray-105 dark:border-gray-805">
                                <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400">🔘 {btn.text}</span>
                                <Handle
                                    type="source"
                                    position={Position.Right}
                                    id={`button_${idx}`}
                                    className="w-2.5 h-2.5 bg-emerald-500 !right-[-4px]"
                                />
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Portas de Saída Multi-Saída Success / Fail */}
            <div className="flex justify-between mt-4 pt-2 border-t border-gray-100 dark:border-gray-700 relative">
                <div className="flex flex-col items-start relative">
                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-wider select-none">✔ Sucesso</span>
                    <Handle type="source" position={Position.Bottom} id="success" className="w-3 h-3 bg-emerald-500 !left-6" />
                </div>
                <div className="flex flex-col items-end relative">
                    <span className="text-[9px] font-black text-rose-500 uppercase tracking-wider select-none">❌ Falha</span>
                    <Handle type="source" position={Position.Bottom} id="fail" className="w-3 h-3 bg-rose-500 !left-auto !right-6" />
                </div>
            </div>
        </div>
    );
};

export default SendTemplateNode;
