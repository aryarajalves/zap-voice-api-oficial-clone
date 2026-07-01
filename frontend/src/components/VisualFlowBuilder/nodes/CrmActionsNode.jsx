import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Handle, Position } from 'reactflow';
import { FiSliders, FiX, FiChevronDown, FiSearch, FiTag, FiPlus, FiInfo } from 'react-icons/fi';
import { useClient } from '../../../contexts/ClientContext';
import { fetchWithAuth } from '../../../AuthContext';
import { API_URL } from '../../../config';
import NodeHeader from '../components/NodeHeader';
import VariableSelector from '../components/VariableSelector';

// Explica para que serve cada plataforma disponível na Ação de CRM,
// para o usuário entender a diferença antes de escolher.
const PLATFORM_INFO = {
    chatwoot: {
        title: 'Atendimento (Chat Local)',
        description: 'Executa a ação direto na conversa da sua ferramenta de chat/atendimento do próprio ZapVoice: etiquetar a conversa, atualizar dados do contato, adicionar nota privada ou trocar o agente responsável.'
    },
    local: {
        title: 'Segmentação Local (ZapVoice)',
        description: 'Atua direto no banco de contatos (leads) do próprio ZapVoice, sem depender de nenhum serviço externo: adiciona/remove tags ou bloqueia/desbloqueia o contato na blacklist local, controlando quem recebe disparos futuros.'
    },
    manychat: {
        title: 'ManyChat',
        description: 'Integra com sua conta ManyChat (CRM externo): adiciona/remove tags ou define custom fields diretamente lá. Use quando o fluxo de automação principal do contato roda no ManyChat.'
    }
};

const CrmActionsNode = ({ id, data }) => {
    const { activeClient } = useClient();
    const platform = data.platform || 'chatwoot';
    const action = data.action || '';
    const value = data.value || '';
    const nameType = data.nameType || 'fixed';

    const [labels, setLabels] = useState([]);
    const [loadingLabels, setLoadingLabels] = useState(false);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isRemoveOpen, setIsRemoveOpen] = useState(false);
    const [addSearch, setAddSearch] = useState('');
    const [removeSearch, setRemoveSearch] = useState('');

    const [existingTags, setExistingTags] = useState([]);
    const [showLocalSuggestions, setShowLocalSuggestions] = useState(false);

    const addDropdownRef = useRef(null);
    const removeDropdownRef = useRef(null);

    // Carrega etiquetas se for a ação 'chatwoot_label' ou carrega as tags locais do cliente
    useEffect(() => {
        if (!activeClient) return;
        if (platform === 'chatwoot' && action === 'chatwoot_label') {
            setLoadingLabels(true);
            fetchWithAuth(`${API_URL}/chat/labels`, { headers: { 'X-Client-ID': activeClient.id } })
                .then(res => res.json())
                .then(data => {
                    const formatted = Array.isArray(data) ? data.map((str, idx) => ({ id: idx, title: str })) : [];
                    setLabels(formatted);
                })
                .catch(console.error)
                .finally(() => setLoadingLabels(false));
        } else if (platform === 'local' && (action === 'add_tag' || action === 'remove_tag')) {
            fetchWithAuth(`${API_URL}/leads/filters`, {}, activeClient.id)
                .then(res => res.json())
                .then(data => {
                    if (data && Array.isArray(data.tags)) {
                        setExistingTags(data.tags);
                    }
                })
                .catch(console.error);
        }
    }, [platform, action, activeClient]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (addDropdownRef.current && !addDropdownRef.current.contains(event.target)) {
                setIsAddOpen(false);
            }
            if (removeDropdownRef.current && !removeDropdownRef.current.contains(event.target)) {
                setIsRemoveOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedAddLabels = useMemo(() => {
        if (!data.label) return [];
        return data.label.split(',').map(l => l.trim()).filter(l => l);
    }, [data.label]);

    const selectedRemoveLabels = useMemo(() => {
        if (!data.remove_label) return [];
        return data.remove_label.split(',').map(l => l.trim()).filter(l => l);
    }, [data.remove_label]);

    const toggleAddLabel = (labelTitle) => {
        let newList = selectedAddLabels.includes(labelTitle)
            ? selectedAddLabels.filter(l => l !== labelTitle)
            : [...selectedAddLabels, labelTitle];
        data.onChange(id, { label: newList.join(',') });
    };

    const toggleRemoveLabel = (labelTitle) => {
        let newList = selectedRemoveLabels.includes(labelTitle)
            ? selectedRemoveLabels.filter(l => l !== labelTitle)
            : [...selectedRemoveLabels, labelTitle];
        data.onChange(id, { remove_label: newList.join(',') });
    };

    const filteredAddLabels = useMemo(() => {
        if (!Array.isArray(labels)) return [];
        return labels
            .filter(l => !selectedAddLabels.includes(l.title))
            .filter(l => l.title.toLowerCase().includes(addSearch.toLowerCase()));
    }, [labels, selectedAddLabels, addSearch]);

    const filteredRemoveLabels = useMemo(() => {
        if (!Array.isArray(labels)) return [];
        return labels
            .filter(l => !selectedRemoveLabels.includes(l.title))
            .filter(l => l.title.toLowerCase().includes(removeSearch.toLowerCase()));
    }, [labels, selectedRemoveLabels, removeSearch]);

    const handlePlatformChange = (newPlatform) => {
        const defaultAction = newPlatform === 'chatwoot' ? 'chatwoot_label' : 'add_tag';
        data.onChange(id, { platform: newPlatform, action: defaultAction, value: '', label: '', remove_label: '', nameType: 'fixed', newName: '' });
    };

    const handleActionChange = (newAction) => {
        data.onChange(id, { action: newAction, value: '', label: '', remove_label: '', nameType: 'fixed', newName: '' });
    };

    return (
        <div className="px-4 py-3 shadow-lg rounded-2xl bg-white dark:bg-gray-800 border-2 border-indigo-500 min-w-[280px] transition-all hover:shadow-2xl">
            <Handle type="target" position={Position.Left} className="w-3 h-3 bg-indigo-500" />

            <NodeHeader
                label="Ações de CRM"
                icon={FiSliders}
                colorClass="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400"
                onDelete={() => data.onDelete(id)}
                onDuplicate={() => data.onDuplicate(id)}
                isStart={data.isStart}
                onSetStart={() => data.onSetStart(id, 'crmActionsNode')}
            />

            <div className="space-y-3 mt-2 px-1">
                {/* Seleção de Plataforma */}
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase block">Plataforma</label>
                        {PLATFORM_INFO[platform] && (
                            <span className="relative inline-flex group nodrag">
                                <FiInfo size={11} className="text-gray-400 hover:text-indigo-400 cursor-help" />
                                <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 w-56 opacity-0 group-hover:opacity-100 transition-opacity z-50 bg-gray-900 text-gray-100 text-[10px] leading-snug font-normal normal-case p-2 rounded-lg shadow-xl">
                                    {PLATFORM_INFO[platform].description}
                                    <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                                </span>
                            </span>
                        )}
                    </div>
                    <select
                        className="nodrag nopan w-full text-xs border rounded p-2 bg-gray-55 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-semibold focus:ring-2 focus:ring-indigo-500 outline-none border-gray-300 dark:border-gray-700"
                        value={platform}
                        onChange={(e) => handlePlatformChange(e.target.value)}
                    >
                        <option value="chatwoot">💬 Atendimento (Chat Local)</option>
                        <option value="local">🛡️ Segmentação Local (ZapVoice)</option>
                        <option value="manychat">⚡ ManyChat</option>
                    </select>
                </div>

                {/* Seleção de Ação */}
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase block">Ação</label>
                    <select
                        className="nodrag nopan w-full text-xs border rounded p-2 bg-gray-55 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-semibold focus:ring-2 focus:ring-indigo-500 outline-none border-gray-300 dark:border-gray-700"
                        value={action}
                        onChange={(e) => handleActionChange(e.target.value)}
                    >
                        {platform === 'chatwoot' ? (
                            <>
                                <option value="chatwoot_label">🏷️ Etiquetar Conversa (Labels)</option>
                                <option value="update_contact">👤 Atualizar Contato (Nome)</option>
                                <option value="add_private_note">📝 Adicionar Nota Privada</option>
                                <option value="change_assignee">👤 Alterar Responsável</option>
                            </>
                        ) : platform === 'local' ? (
                            <>
                                <option value="add_tag">🏷️ Adicionar Tag Local</option>
                                <option value="remove_tag">🏷️ Remover Tag Local</option>
                                <option value="block">🚫 Adicionar à Blacklist (Bloquear)</option>
                                <option value="unblock">🟢 Remover da Blacklist (Desbloquear)</option>
                            </>
                        ) : (
                            <>
                                <option value="add_tag">🏷️ Adicionar Tag</option>
                                <option value="remove_tag">❌ Remover Tag</option>
                                <option value="set_custom_field">⚙️ Definir Custom Field</option>
                            </>
                        )}
                    </select>
                </div>

                {/* VISÃO ESPECÍFICA: ETIQUETAR CHATWOOT */}
                {platform === 'chatwoot' && action === 'chatwoot_label' && (
                    <div className="space-y-3 pt-1 border-t border-gray-100 dark:border-gray-700/50">
                        {/* ADICIONAR ETIQUETAS */}
                        <div>
                            <label className="text-[9px] font-bold text-emerald-500 uppercase block mb-1">Adicionar Etiquetas</label>
                            {selectedAddLabels.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-1.5">
                                    {selectedAddLabels.map(l => (
                                        <span key={l} className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded text-[9px] font-bold border border-emerald-200 dark:border-emerald-800">
                                            {l}
                                            <button type="button" onClick={() => toggleAddLabel(l)} className="text-emerald-400 hover:text-red-500"><FiX size={10} /></button>
                                        </span>
                                    ))}
                                </div>
                            )}
                            <div className="relative" ref={addDropdownRef}>
                                <div onClick={() => !loadingLabels && setIsAddOpen(!isAddOpen)} className="nodrag nopan w-full text-xs p-2 bg-gray-55 dark:bg-gray-900 border rounded cursor-pointer flex justify-between items-center text-gray-900 dark:text-gray-100 dark:border-gray-700">
                                    <span className="truncate">{loadingLabels ? 'Carregando...' : 'Selecione...'}</span>
                                    <FiChevronDown />
                                </div>
                                {isAddOpen && (
                                    <div className="nodrag nopan absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-gray-900 border rounded shadow-xl max-h-60 overflow-hidden flex flex-col border-gray-200 dark:border-gray-700">
                                        <div className="p-2 border-b flex items-center gap-1"><FiSearch className="text-gray-400" /><input type="text" className="nodrag w-full text-xs bg-transparent outline-none text-gray-900 dark:text-gray-100" placeholder="Buscar..." value={addSearch} onChange={(e) => setAddSearch(e.target.value)} /></div>
                                        <div className="nodrag nopan nowheel overflow-y-auto max-h-40 flex-1 premium-scrollbar">
                                            {addSearch.trim() !== '' && !labels.some(l => l.title.toLowerCase() === addSearch.trim().toLowerCase()) && (
                                                <div
                                                    className="p-2 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer font-bold border-b border-dashed border-indigo-200 dark:border-indigo-850/40 text-center"
                                                    onClick={() => {
                                                        const newLabelStr = addSearch.trim();
                                                        setLabels(prev => [...prev, { id: prev.length, title: newLabelStr }]);
                                                        toggleAddLabel(newLabelStr);
                                                        setIsAddOpen(false);
                                                        setAddSearch('');
                                                    }}
                                                >
                                                    ➕ Criar etiqueta "{addSearch.trim()}"
                                                </div>
                                            )}
                                            {filteredAddLabels.map(l => (
                                                <div key={l.id} className="p-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer text-gray-900 dark:text-gray-100" onClick={() => { toggleAddLabel(l.title); setIsAddOpen(false); setAddSearch(''); }}>{l.title}</div>
                                            ))}
                                            {filteredAddLabels.length === 0 && addSearch.trim() === '' && (
                                                <div className="p-3 text-center text-xs text-gray-400 italic">Nenhuma etiqueta encontrada</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* REMOVER ETIQUETAS */}
                        <div>
                            <label className="text-[9px] font-bold text-rose-500 uppercase block mb-1">Remover Etiquetas</label>
                            {selectedRemoveLabels.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-1.5">
                                    {selectedRemoveLabels.map(l => (
                                        <span key={l} className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded text-[9px] font-bold border border-rose-200 dark:border-rose-800">
                                            {l}
                                            <button type="button" onClick={() => toggleRemoveLabel(l)} className="text-rose-400 hover:text-red-500"><FiX size={10} /></button>
                                        </span>
                                    ))}
                                </div>
                            )}
                            <div className="relative" ref={removeDropdownRef}>
                                <div onClick={() => !loadingLabels && setIsRemoveOpen(!isRemoveOpen)} className="nodrag nopan w-full text-xs p-2 bg-gray-55 dark:bg-gray-900 border rounded cursor-pointer flex justify-between items-center text-gray-900 dark:text-gray-100 dark:border-gray-700">
                                    <span className="truncate">{loadingLabels ? 'Carregando...' : 'Selecione...'}</span>
                                    <FiChevronDown />
                                </div>
                                {isRemoveOpen && (
                                    <div className="nodrag nopan absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-gray-900 border rounded shadow-xl max-h-60 overflow-hidden flex flex-col border-gray-200 dark:border-gray-700">
                                        <div className="p-2 border-b flex items-center gap-1"><FiSearch className="text-gray-400" /><input type="text" className="nodrag w-full text-xs bg-transparent outline-none text-gray-900 dark:text-gray-100" placeholder="Buscar..." value={removeSearch} onChange={(e) => setRemoveSearch(e.target.value)} /></div>
                                        <div className="nodrag nopan nowheel overflow-y-auto max-h-40 flex-1 premium-scrollbar">
                                            {filteredRemoveLabels.map(l => (
                                                <div key={l.id} className="p-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer text-gray-900 dark:text-gray-100" onClick={() => { toggleRemoveLabel(l.title); setIsRemoveOpen(false); setRemoveSearch(''); }}>{l.title}</div>
                                            ))}
                                            {filteredRemoveLabels.length === 0 && (
                                                <div className="p-3 text-center text-xs text-gray-400 italic">Nenhuma etiqueta encontrada</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* VISÃO ESPECÍFICA: ATUALIZAR CONTATO */}
                {platform === 'chatwoot' && action === 'update_contact' && (
                    <div className="space-y-3 pt-1 border-t border-gray-100 dark:border-gray-700/50">
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase block">Origem do Nome</label>
                            <select
                                className="nodrag nopan w-full text-xs border rounded p-2 bg-gray-55 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-semibold focus:ring-2 focus:ring-indigo-500 outline-none border-gray-300 dark:border-gray-700"
                                value={nameType}
                                onChange={(e) => data.onChange(id, { nameType: e.target.value, newName: '' })}
                            >
                                <option value="fixed">Nome Fixo / Manual</option>
                                <option value="official">Nome da API Oficial (Push Name)</option>
                            </select>
                        </div>

                        {nameType === 'fixed' && (
                            <div className="flex flex-col gap-1 relative">
                                <div className="flex justify-between items-center mb-0.5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase block">Novo Nome</label>
                                    <VariableSelector onSelect={(v) => data.onChange(id, { newName: (data.newName || '') + v })} />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Ex: João da Silva"
                                    className="nodrag nopan w-full text-xs p-2 border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none border-gray-300 dark:border-gray-700"
                                    value={data.newName || ''}
                                    onChange={(e) => data.onChange(id, { newName: e.target.value })}
                                />
                            </div>
                        )}

                        {nameType === 'official' && (
                            <p className="text-[9px] text-gray-400 italic bg-gray-50 dark:bg-gray-900/50 p-2 rounded border border-dashed border-gray-200 dark:border-gray-700">
                                O sistema usará o nome identificado pelo WhatsApp no momento da interação.
                            </p>
                        )}
                    </div>
                )}

                {/* VISÃO ESPECÍFICA: SEGMENTAÇÃO LOCAL */}
                {platform === 'local' && (action === 'add_tag' || action === 'remove_tag') && (
                    <div className="flex flex-col gap-1 relative pt-1 border-t border-gray-100 dark:border-gray-700/50">
                        <label className="text-[10px] font-bold text-gray-400 uppercase block">Nome da Tag Local</label>
                        <input
                            type="text"
                            placeholder="Buscar ou criar tag..."
                            className="nodrag nopan w-full text-xs p-2 border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none border-gray-300 dark:border-gray-700"
                            value={value}
                            onChange={(e) => {
                                data.onChange(id, { value: e.target.value, tagName: e.target.value });
                                setShowLocalSuggestions(true);
                            }}
                            onFocus={() => setShowLocalSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowLocalSuggestions(false), 250)}
                        />

                        {/* Caixa de Sugestões de Tags */}
                        {showLocalSuggestions && (
                            <div className="absolute top-full left-0 right-0 mt-1 z-[50] max-h-[160px] overflow-y-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl nodrag nopan nowheel premium-scrollbar p-1">
                                {existingTags
                                    .filter(t => t.toLowerCase().includes((value || '').toLowerCase()))
                                    .map((tag) => (
                                        <button
                                            key={tag}
                                            type="button"
                                            onClick={() => {
                                                data.onChange(id, { value: tag, tagName: tag });
                                                setShowLocalSuggestions(false);
                                            }}
                                            className="w-full text-left text-xs px-2.5 py-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-gray-700 dark:text-gray-200 rounded-md transition cursor-pointer font-medium"
                                        >
                                            🏷️ {tag}
                                        </button>
                                    ))}

                                {value.trim() !== '' && !existingTags.some(t => t.toLowerCase() === value.trim().toLowerCase()) && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            data.onChange(id, { value: value.trim(), tagName: value.trim() });
                                            setShowLocalSuggestions(false);
                                        }}
                                        className="w-full text-left text-xs px-2.5 py-1.5 hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 dark:text-green-400 border-t border-dashed border-gray-100 dark:border-gray-800 rounded-md transition cursor-pointer font-bold flex items-center gap-1.5"
                                    >
                                        <FiPlus size={12} /> Criar tag "{value.trim()}"
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {platform === 'local' && (action === 'block' || action === 'unblock') && (
                    <div className="pt-1 border-t border-gray-100 dark:border-gray-700/50">
                        <p className="text-[10px] text-gray-400 italic bg-gray-50 dark:bg-gray-900/50 p-2 rounded border border-dashed border-gray-200 dark:border-gray-700">
                            {action === 'block'
                                ? "O número do contato será inserido na Blacklist local do ZapVoice, interrompendo réguas futuras."
                                : "O contato voltará a estar elegível para disparos de novos funis e fluxos no sistema."
                            }
                        </p>
                    </div>
                )}

                {/* INPUT PADRÃO PARA OUTRAS AÇÕES */}
                {action !== 'chatwoot_label' && action !== 'update_contact' && platform !== 'local' && (
                    <div className="flex flex-col gap-1 relative pt-1 border-t border-gray-100 dark:border-gray-700/50">
                        <div className="flex justify-between items-center mb-0.5">
                            <label className="text-[10px] font-bold text-gray-400 uppercase block">
                                {action === 'change_assignee' ? 'ID do Agente' : action === 'set_custom_field' ? 'Campo & Valor (campo:valor)' : 'Valor / Nome'}
                            </label>
                            <VariableSelector onSelect={(v) => data.onChange(id, { value: (value || '') + v })} />
                        </div>
                        <input
                            type="text"
                            placeholder={
                                action === 'change_assignee' ? 'Ex: 45' :
                                action === 'set_custom_field' ? 'Ex: lead_score:100' :
                                'Ex: lead-quente'
                            }
                            className="nodrag nopan w-full text-xs p-2 border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none border-gray-300 dark:border-gray-700"
                            value={value}
                            onChange={(e) => data.onChange(id, { value: e.target.value })}
                        />
                    </div>
                )}
            </div>

            <Handle type="source" position={Position.Right} id="default" className="w-3 h-3 bg-indigo-500" />
        </div>
    );
};

export default CrmActionsNode;
