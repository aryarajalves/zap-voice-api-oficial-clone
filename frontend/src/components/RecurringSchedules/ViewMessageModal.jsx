import React, { useState, useEffect } from 'react';
import { FiX, FiEdit2, FiFolder, FiMessageSquare, FiSearch, FiSave, FiLink } from 'react-icons/fi';
import TemplatePreview from '../BulkSender/common/TemplatePreview';
import { toast } from 'react-hot-toast';

export function ViewMessageModal({ viewingMessageSchedule, onClose, onSave, templates, funnels, isUpdating }) {
    if (!viewingMessageSchedule) return null;

    const [isEditing, setIsEditing] = useState(false);
    const [sendType, setSendType] = useState('template');
    const [selectedTemplateName, setSelectedTemplateName] = useState('');
    const [selectedFunnelId, setSelectedFunnelId] = useState('');
    const [directMessage, setDirectMessage] = useState('');
    const [templateParams, setTemplateParams] = useState({});
    
    // Dropdown de templates
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTag, setSelectedTag] = useState(null);

    const allTags = React.useMemo(() => {
        if (!templates) return [];
        const tagsSet = new Set();
        templates.forEach(t => {
            if (t && Array.isArray(t.tags)) {
                t.tags.forEach(tag => {
                    if (tag && tag.trim()) {
                        tagsSet.add(tag.trim());
                    }
                });
            }
        });
        return Array.from(tagsSet);
    }, [templates]);

    const convertComponentsToParams = (components) => {
        if (!components || !Array.isArray(components)) return {};
        const params = {};
        components.forEach(comp => {
            const type = comp.type?.toUpperCase(); // HEADER ou BODY
            if (comp.parameters && Array.isArray(comp.parameters)) {
                comp.parameters.forEach((param, idx) => {
                    const key = `${type}_${idx}`;
                    if (param.type === 'text') {
                        params[key] = param.text;
                    } else if (param.type === 'image') {
                        params[key] = param.image?.link || '';
                    } else if (param.type === 'video') {
                        params[key] = param.video?.link || '';
                    } else if (param.type === 'document') {
                        params[key] = param.document?.link || '';
                    }
                });
            }
        });
        return params;
    };

    const selectedTemplateObj = templates.find(t => t.name === selectedTemplateName);

    // Lógica para preencher estados a partir do schedule
    useEffect(() => {
        if (viewingMessageSchedule) {
            setIsEditing(false);
            setSearchQuery('');
            setSendType('template');
            if (viewingMessageSchedule.template_name) {
                setSelectedTemplateName(viewingMessageSchedule.template_name);
                setTemplateParams(convertComponentsToParams(viewingMessageSchedule.template_components));
            } else {
                setSelectedTemplateName('');
                setTemplateParams({});
            }
        }
    }, [viewingMessageSchedule]);

    const extractTemplateVariables = (templateObj) => {
        if (!templateObj) return [];
        const bodyComp = templateObj.components?.find(c => c.type === 'BODY');
        if (!bodyComp || !bodyComp.text) return [];
        const matches = bodyComp.text.match(/\{\{\d+\}\}/g);
        if (!matches) return [];
        return [...new Set(matches)].map(match => ({
            key: `BODY_${parseInt(match.replace(/[{}]/g, '')) - 1}`,
            label: match
        }));
    };

    const getHeaderFormat = (templateObj) => {
        if (!templateObj) return null;
        const header = templateObj.components?.find(c => c.type === 'HEADER');
        return header ? header.format : null;
    };

    const handleParamChange = (key, value) => {
        setTemplateParams(prev => ({ ...prev, [key]: value }));
    };

    const handleSaveClick = () => {
        const payload = {
            template_name: null,
            template_language: null,
            template_components: null,
            funnel_id: null,
            direct_message: null
        };

        if (sendType === 'template') {
            if (!selectedTemplateName) {
                toast.error("Por favor, selecione um template");
                return;
            }
            const tObj = templates.find(t => t.name === selectedTemplateName);
            payload.template_name = selectedTemplateName;
            payload.template_language = tObj?.language || 'pt_BR';
            
            // Reconstruir template_components
            const components = [];
            if (tObj) {
                // Header
                const header = tObj.components?.find(c => c.type === 'HEADER');
                if (header) {
                    const parameters = [];
                    if (header.format === 'TEXT') {
                        const val = templateParams['HEADER_0'] || '';
                        parameters.push({ type: 'text', text: val });
                    } else if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(header.format)) {
                        const type = header.format.toLowerCase();
                        const val = templateParams['HEADER_0'] || '';
                        parameters.push({
                            type: type,
                            [type]: { link: val }
                        });
                    }
                    if (parameters.length > 0) {
                        components.push({ type: 'header', parameters });
                    }
                }

                // Body
                const body = tObj.components?.find(c => c.type === 'BODY');
                if (body) {
                    const parameters = [];
                    const matches = body.text.match(/\{\{\d+\}\}/g) || [];
                    matches.forEach((_, idx) => {
                        const val = templateParams[`BODY_${idx}`] || '';
                        parameters.push({ type: 'text', text: val });
                    });
                    if (parameters.length > 0) {
                        components.push({ type: 'body', parameters });
                    }
                }
            }
            payload.template_components = components;
        } else if (sendType === 'funnel') {
            if (!selectedFunnelId) {
                toast.error("Por favor, selecione um funil");
                return;
            }
            payload.funnel_id = parseInt(selectedFunnelId);
        } else {
            if (!directMessage.trim()) {
                toast.error("Por favor, digite a mensagem");
                return;
            }
            payload.direct_message = directMessage;
        }

        onSave(viewingMessageSchedule.id, payload);
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-white/10 rounded-[3rem] w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl relative">
                
                {/* Cabeçalho */}
                <div className="p-8 border-b border-white/5 bg-slate-800/40 flex items-center justify-between">
                    <div>
                        <h3 className="text-2xl font-black text-white flex items-center gap-3">
                            <FiMessageSquare className="text-purple-400" />
                            {isEditing ? 'Editar Conteúdo do Envio' : 'Conteúdo do Envio'}
                        </h3>
                        <p className="text-slate-400 text-xs mt-1">
                            {isEditing 
                                ? 'Altere o template e preencha as variáveis dinamicamente.' 
                                : 'Esta é a mensagem que será disparada automaticamente para os contatos.'}
                        </p>
                    </div>
                </div>

                {/* Conteúdo Central */}
                <div className="flex-1 overflow-y-auto p-8 space-y-8 premium-scrollbar">
                    
                    {/* Modo Edição */}
                    {isEditing ? (
                        <div className="space-y-6">
                            <div className="space-y-6">
                                {/* Dropdown de Seleção de Template */}
                                <div className="space-y-2 relative">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Template do WhatsApp</label>
                                    <div 
                                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                        className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 text-xs font-bold text-white outline-none cursor-pointer flex justify-between items-center shadow-inner"
                                    >
                                        <span className={selectedTemplateName ? 'text-white' : 'text-slate-500'}>
                                            {selectedTemplateName || '-- Selecione um Template --'}
                                        </span>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`text-slate-500 transition-all ${isDropdownOpen ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9" /></svg>
                                    </div>

                                    {isDropdownOpen && (
                                        <div className="absolute top-full left-0 w-full mt-2 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-[130] overflow-hidden">
                                            <div className="p-3 border-b border-white/5 bg-black/20 space-y-2">
                                                <div className="relative">
                                                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={12} />
                                                    <input 
                                                        autoFocus
                                                        type="text"
                                                        placeholder="Filtrar templates..."
                                                        className="w-full bg-slate-800 border border-white/5 rounded-xl pl-9 pr-4 py-2 text-xs font-medium text-white outline-none focus:border-purple-500/30 transition-all"
                                                        value={searchQuery}
                                                        onChange={(e) => setSearchQuery(e.target.value)}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </div>

                                                {allTags.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 pt-1" onClick={(e) => e.stopPropagation()}>
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedTag(null)}
                                                            className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider transition-all ${
                                                                !selectedTag 
                                                                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20' 
                                                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-750 hover:text-white'
                                                            }`}
                                                        >
                                                            Todos
                                                        </button>
                                                        {allTags.map(tag => (
                                                            <button
                                                                type="button"
                                                                key={tag}
                                                                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                                                                className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider transition-all ${
                                                                    selectedTag === tag 
                                                                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20' 
                                                                        : 'bg-slate-800 text-slate-400 hover:bg-slate-750 hover:text-white'
                                                                }`}
                                                            >
                                                                {tag}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="max-h-52 overflow-y-auto premium-scrollbar">
                                                {templates
                                                    .filter(t => {
                                                        if (!t || !t.name) return false;
                                                        const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase());
                                                        const matchesTag = !selectedTag || (Array.isArray(t.tags) && t.tags.includes(selectedTag));
                                                        return matchesSearch && matchesTag;
                                                    })
                                                    .map(t => (
                                                        <div 
                                                            key={t.name}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedTemplateName(t.name);
                                                                setTemplateParams({});
                                                                setIsDropdownOpen(false);
                                                                setSearchQuery('');
                                                                setSelectedTag(null);
                                                            }}
                                                            className={`px-6 py-2.5 hover:bg-purple-500/10 cursor-pointer transition-colors flex flex-col gap-0.5 ${selectedTemplateName === t.name ? 'bg-purple-500/5' : ''}`}
                                                        >
                                                            <div className="flex justify-between items-center gap-2">
                                                                <span className="text-xs font-bold text-white truncate max-w-[60%]">{t.name}</span>
                                                                {t.tags && t.tags.length > 0 && (
                                                                    <div className="flex flex-wrap gap-1 justify-end max-w-[40%]">
                                                                        {t.tags.map(tag => (
                                                                            <span key={tag} className="px-1 py-0.5 rounded bg-slate-800 text-purple-400 border border-purple-500/10 text-[8px] font-bold truncate">
                                                                                {tag}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))
                                                }
                                                {templates.filter(t => {
                                                    if (!t || !t.name) return false;
                                                    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase());
                                                    const matchesTag = !selectedTag || (Array.isArray(t.tags) && t.tags.includes(selectedTag));
                                                    return matchesSearch && matchesTag;
                                                }).length === 0 && (
                                                    <div className="px-6 py-8 text-center text-slate-500 text-[10px] font-bold uppercase tracking-widest italic">
                                                        Nenhum template encontrado
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Inputs de Mídia e Variáveis do Template */}
                                {selectedTemplateObj && (
                                    <div className="space-y-6 pt-4 border-t border-white/5">
                                        
                                        {/* Cabeçalho de Mídia se aplicável */}
                                        {['IMAGE', 'VIDEO', 'DOCUMENT'].includes(getHeaderFormat(selectedTemplateObj)) && (
                                            <div className="p-5 bg-slate-800/40 border border-white/5 rounded-3xl space-y-3">
                                                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                                    <FiLink className="text-purple-400" />
                                                    URL da Mídia do Cabeçalho ({getHeaderFormat(selectedTemplateObj)})
                                                </label>
                                                <input 
                                                    type="text"
                                                    value={templateParams['HEADER_0'] || ''}
                                                    onChange={(e) => handleParamChange('HEADER_0', e.target.value)}
                                                    placeholder={`Cole o link público da ${getHeaderFormat(selectedTemplateObj).toLowerCase()}...`}
                                                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3 text-white font-medium text-xs outline-none focus:border-purple-500/50 shadow-inner"
                                                />
                                                <p className="text-[10px] text-slate-500 italic">Preencha com uma URL de imagem/vídeo direta para envio (ex: https://site.com/imagem.jpg).</p>
                                            </div>
                                        )}

                                        {/* Variáveis do Corpo */}
                                        {extractTemplateVariables(selectedTemplateObj).length > 0 && (
                                            <div className="p-5 bg-slate-800/40 border border-white/5 rounded-3xl space-y-4">
                                                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest">Variáveis Dinâmicas do Corpo</label>
                                                <div className="grid grid-cols-1 gap-4">
                                                    {extractTemplateVariables(selectedTemplateObj).map(v => {
                                                        const currentValue = templateParams[v.key] || '';
                                                        const isDynamic = ['{{nome}}', '{{name}}', '{{telefone}}', '{{phone}}', '{{primeiro_nome}}', '{{first_name}}'].includes(currentValue);
                                                        const selectValue = isDynamic 
                                                            ? (['{{nome}}', '{{name}}'].includes(currentValue) 
                                                                ? '{{nome}}' 
                                                                : (['{{primeiro_nome}}', '{{first_name}}'].includes(currentValue) ? '{{primeiro_nome}}' : '{{telefone}}'))
                                                            : (currentValue ? 'custom' : '');

                                                        return (
                                                            <div key={v.key} className="space-y-2 bg-black/20 p-4 rounded-2xl border border-white/5">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-[10px] font-black text-purple-400 uppercase tracking-wider pl-1">{v.label}</span>
                                                                    <span className="text-[7px] font-bold text-slate-600 uppercase tracking-widest">Parâmetro de Corpo</span>
                                                                </div>
                                                                <div className="flex flex-col md:flex-row gap-3">
                                                                    <div className="flex-1">
                                                                        <select
                                                                            value={selectValue}
                                                                            onChange={(e) => {
                                                                                const val = e.target.value;
                                                                                if (val === 'custom') {
                                                                                    handleParamChange(v.key, '');
                                                                                } else {
                                                                                    handleParamChange(v.key, val);
                                                                                }
                                                                            }}
                                                                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none cursor-pointer focus:border-purple-500/50 shadow-inner"
                                                                        >
                                                                            <option value="">-- Mapear dinamicamente... --</option>
                                                                            <option value="{{nome}}">Nome do Contato ({"{{nome}}"})</option>
                                                                            <option value="{{primeiro_nome}}">Primeiro Nome do Contato ({"{{primeiro_nome}}"})</option>
                                                                            <option value="{{telefone}}">Telefone do Contato ({"{{telefone}}"})</option>
                                                                            <option value="custom">Texto Fixo / Personalizado</option>
                                                                        </select>
                                                                    </div>
                                                                    {selectValue === 'custom' && (
                                                                        <div className="flex-1 animate-in slide-in-from-right duration-200">
                                                                            <input 
                                                                                type="text"
                                                                                value={isDynamic ? '' : currentValue}
                                                                                onChange={(e) => handleParamChange(v.key, e.target.value)}
                                                                                placeholder="Digite o texto personalizado fixo..."
                                                                                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-600 outline-none focus:border-purple-500/50 shadow-inner"
                                                                            />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Pré-visualização ao vivo */}
                                        <div className="space-y-3">
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Visualização em Tempo Real</label>
                                            <TemplatePreview template={selectedTemplateObj} params={templateParams} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        /* Modo Visualização Simples */
                        <div className="space-y-6">
                            {sendType === 'direct_message' && (
                                <div className="space-y-4">
                                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Mensagem Direta (Texto)</div>
                                    <div className="bg-slate-950 p-6 rounded-[2rem] border border-white/5 shadow-inner leading-relaxed text-sm text-slate-200 whitespace-pre-wrap font-medium">
                                        {directMessage || <span className="italic text-slate-600">Nenhum texto preenchido.</span>}
                                    </div>
                                </div>
                            )}

                            {sendType === 'funnel' && (
                                <div className="space-y-4">
                                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Funil de Automação</div>
                                    <div className="p-6 bg-slate-950 rounded-[2rem] border border-white/5 flex items-center gap-4 shadow-inner">
                                        <div className="w-12 h-12 bg-purple-500/10 rounded-2xl border border-purple-500/20 flex items-center justify-center text-purple-400">
                                            <FiFolder size={20} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-black text-white">
                                                {funnels.find(f => String(f.id) === String(selectedFunnelId))?.name || 'Funil não selecionado'}
                                            </div>
                                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Disparará todos os blocos configurados no funil</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {sendType === 'template' && (
                                <div className="space-y-4">
                                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
                                        Template WhatsApp: <span className="text-white font-black">{selectedTemplateName}</span>
                                    </div>
                                    {selectedTemplateObj ? (
                                        <TemplatePreview template={selectedTemplateObj} params={templateParams} />
                                    ) : (
                                        <div className="text-center py-10 bg-slate-950 border border-white/5 rounded-3xl text-xs font-bold text-slate-500 uppercase tracking-widest italic">
                                            Carregando pré-visualização do template...
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Rodapé do Modal */}
                <div className="p-8 bg-slate-800/40 border-t border-white/5 flex items-center justify-between">
                    <div>
                        {isEditing ? (
                            <button 
                                onClick={() => setIsEditing(false)}
                                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-2xl font-black text-xs transition-all uppercase tracking-widest active:scale-95"
                            >
                                Voltar para visualização
                            </button>
                        ) : (
                            <button 
                                onClick={() => setIsEditing(true)}
                                className="px-6 py-3 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-2xl border border-purple-500/20 font-black text-xs transition-all uppercase tracking-widest flex items-center gap-2 active:scale-95 shadow-lg shadow-purple-900/5"
                            >
                                <FiEdit2 size={12} />
                                Alterar Mensagem
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={onClose}
                            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-black text-xs transition-all uppercase tracking-widest active:scale-95"
                        >
                            Fechar
                        </button>
                        {isEditing && (
                            <button 
                                onClick={handleSaveClick}
                                disabled={isUpdating}
                                className="px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-black text-xs transition-all uppercase tracking-widest flex items-center gap-2 active:scale-95 shadow-xl shadow-purple-900/30"
                            >
                                {isUpdating ? (
                                    <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <FiSave size={12} />
                                )}
                                Salvar Alterações
                            </button>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
