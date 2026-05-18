import React, { useState, useEffect } from 'react';
import { FiX, FiUsers, FiEdit2, FiZap, FiTrash2, FiEye, FiCheck, FiFolder, FiMessageSquare, FiSearch, FiSave, FiLink, FiAlertCircle } from 'react-icons/fi';
import TemplatePreview from '../BulkSender/common/TemplatePreview';
import { toast } from 'react-hot-toast';

export function ViewContactsModal({ viewingContacts, onClose }) {
    if (!viewingContacts) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden shadow-2xl relative">
                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                    <div>
                        <h3 className="text-2xl font-black text-white flex items-center gap-3">
                            <FiUsers className="text-blue-400" />
                            Público Alvo
                        </h3>
                        <p className="text-slate-400 text-xs mt-1">
                            {viewingContacts.mode === 'tag' 
                                ? `Contatos atuais com a etiqueta: ${viewingContacts.tag}` 
                                : 'Lista estática de destinatários'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-2xl transition-colors">
                        <FiX className="text-slate-400" />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {viewingContacts.contacts.length === 0 ? (
                        <div className="text-center py-20 text-slate-500 font-bold uppercase tracking-widest text-xs">
                            Nenhum contato encontrado
                        </div>
                    ) : (
                        viewingContacts.contacts.map((contact, i) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all">
                                <div className="space-y-0.5">
                                    <div className="text-sm font-black text-white">{contact.name}</div>
                                    <div className="text-[10px] text-slate-500 font-bold">{contact.email || '-'}</div>
                                </div>
                                <div className="text-blue-400 font-black text-xs tabular-nums">{contact.phone}</div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-6 bg-slate-800/40 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Total de contatos: <span className="text-white text-sm">{viewingContacts.count}</span>
                    </span>
                    <button 
                        onClick={onClose}
                        className="px-8 py-3 bg-white text-slate-900 rounded-2xl font-black text-xs hover:bg-slate-100 transition-all active:scale-95 shadow-xl"
                    >
                        FECHAR
                    </button>
                </div>
            </div>
        </div>
    );
}

export function ConfirmActionModal({ selectedSchedule, onCancel, onConfirm, isProcessing }) {
    if (!selectedSchedule || !['trigger', 'delete'].includes(selectedSchedule.type)) return null;
    
    const isDelete = selectedSchedule.type === 'delete';
    const Icon = isDelete ? FiTrash2 : FiZap;
    const title = isDelete ? 'Excluir Agendamento?' : 'Disparar Agora?';
    const colorClass = isDelete ? 'red' : 'amber';
    const description = isDelete 
        ? 'Tem certeza que deseja remover permanentemente este disparo recorrente? Esta ação não pode ser desfeita.'
        : `Isso criará uma execução manual do template ${selectedSchedule.template_name?.split('|').pop()} para todos os contatos vinculados agora.`;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in zoom-in-95 duration-300">
            <div className={`bg-slate-900 border border-${colorClass}-500/20 rounded-[3rem] w-full max-w-md p-10 text-center space-y-8 shadow-[0_0_50px_rgba(245,158,11,0.1)]`}>
                <div className={`w-20 h-20 bg-${colorClass}-500/10 text-${colorClass}-500 rounded-[2rem] flex items-center justify-center mx-auto border border-${colorClass}-500/20 shadow-2xl shadow-${colorClass}-500/10`}>
                    <Icon size={40} />
                </div>
                <div className="space-y-3">
                    <h3 className="text-2xl font-black text-white">{title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <button 
                        onClick={onCancel}
                        className="py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-[1.5rem] font-black text-xs transition-all active:scale-95 uppercase tracking-widest"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={onConfirm}
                        disabled={isProcessing}
                        className={`py-4 bg-${colorClass}-600 hover:bg-${colorClass}-500 text-white rounded-[1.5rem] font-black text-xs transition-all active:scale-95 shadow-xl shadow-${colorClass}-900/40 uppercase tracking-widest flex items-center justify-center gap-2`}
                    >
                        {isProcessing && <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
                        {isDelete ? 'Excluir Agora' : 'Confirmar Disparo'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export function EditScheduleModal({ selectedSchedule, editFreq, setEditFreq, editDays, setEditDays, editDayOfMonth, setEditDayOfMonth, editTime, setEditTime, onCancel, onSave, isEditing }) {
    if (!selectedSchedule || selectedSchedule.type) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in zoom-in-95 duration-300">
            <div className="bg-slate-900 border border-white/10 rounded-[3rem] w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-white/5 bg-slate-800/40">
                    <h3 className="text-2xl font-black text-white flex items-center gap-3">
                        <FiEdit2 className="text-blue-400" />
                        Editar Agendamento
                    </h3>
                    <p className="text-slate-400 text-xs mt-1">Ajuste a periodicidade e o horário do disparo.</p>
                </div>

                <div className="p-8 space-y-8 flex-1 overflow-y-auto premium-scrollbar">
                    <div className="grid grid-cols-2 gap-4">
                        <button 
                            onClick={() => { setEditFreq('weekly'); setEditDays([]); }}
                            className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${editFreq === 'weekly' ? 'bg-blue-500 border-blue-400 text-white shadow-xl translate-y-[-2px]' : 'bg-black/20 border-white/5 text-slate-500 hover:bg-black/40'}`}
                        >
                            Semanal
                        </button>
                        <button 
                            onClick={() => { setEditFreq('monthly'); setEditDays([]); setEditDayOfMonth(""); }}
                            className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${editFreq === 'monthly' ? 'bg-blue-500 border-blue-400 text-white shadow-xl translate-y-[-2px]' : 'bg-black/20 border-white/5 text-slate-500 hover:bg-black/40'}`}
                        >
                            Mensal
                        </button>
                    </div>

                    {editFreq === 'weekly' ? (
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Dias da Semana</label>
                                <div className="flex flex-wrap gap-2 justify-between">
                                    {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((day, idx) => {
                                        const isSelected = editDays.some(d => d.day === idx);
                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setEditDays(prev => prev.filter(d => d.day !== idx));
                                                    } else {
                                                        setEditDays(prev => [...prev, { day: idx, time: editTime }].sort((a, b) => a.day - b.day));
                                                    }
                                                }}
                                                className={`w-11 h-11 rounded-[1.2rem] flex items-center justify-center font-black text-xs transition-all shadow-md ${isSelected ? 'bg-blue-600 text-white shadow-blue-900/40 ring-2 ring-blue-400/20' : 'bg-black/40 text-slate-600 hover:bg-black/60'}`}
                                            >
                                                {day}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Dias do Mês</label>
                                <span className="text-[8px] text-slate-500 font-bold uppercase italic">Ex: 1, 15, 30</span>
                            </div>
                            <input
                                type="text"
                                placeholder="1, 15, 30"
                                value={editDayOfMonth}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setEditDayOfMonth(val);
                                    const dayNumbers = val.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d) && d >= 1 && d <= 31);
                                    const newEditDays = dayNumbers.map(d => {
                                        const existing = editDays.find(ed => ed.day === d);
                                        return existing || { day: d, time: editTime };
                                    });
                                    setEditDays(newEditDays);
                                }}
                                className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-bold text-xl outline-none focus:border-blue-500/50 shadow-inner"
                            />
                        </div>
                    )}

                    {editDays.length > 0 && (
                        <div className="space-y-3 pt-4 border-t border-white/5">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest text-center block">Horários Específicos por Dia</label>
                            <div className="grid grid-cols-1 gap-2">
                                {editDays.map((dayConfig, i) => (
                                    <div key={i} className="flex items-center justify-between bg-black/20 p-3 rounded-2xl border border-white/5">
                                        <span className="text-[10px] font-black text-white uppercase">
                                            {editFreq === 'weekly' 
                                                ? ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'][dayConfig.day]
                                                : `Dia ${dayConfig.day}`
                                            }
                                        </span>
                                        <input 
                                            type="time" 
                                            value={dayConfig.time}
                                            onChange={(e) => {
                                                const newDays = [...editDays];
                                                newDays[i].time = e.target.value;
                                                setEditDays(newDays);
                                            }}
                                            className="bg-slate-800 text-white font-bold text-xs p-2 rounded-xl outline-none focus:ring-1 ring-blue-500/50"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">{editFreq === 'weekly' ? 'Horário Padrão (Fallback)' : 'Horário Padrão para Novos Dias'}</label>
                        <input
                            type="time"
                            value={editTime}
                            onChange={(e) => setEditTime(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-bold text-xl outline-none focus:border-blue-500/50 shadow-inner"
                        />
                    </div>
                </div>

                <div className="p-8 bg-slate-800/40 border-t border-white/5 grid grid-cols-2 gap-4">
                    <button 
                        onClick={onCancel}
                        className="py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-[1.5rem] font-black text-xs transition-all active:scale-95 uppercase tracking-widest"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={onSave}
                        disabled={isEditing || (editFreq === 'weekly' && editDays.length === 0)}
                        className="py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-[1.5rem] font-black text-xs transition-all active:scale-95 shadow-xl shadow-blue-900/40 uppercase tracking-widest border border-blue-400/20 flex items-center justify-center gap-2"
                    >
                        {isEditing && <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
                        Salvar Alterações
                    </button>
                </div>
            </div>
        </div>
    );
}

export function ViewMessageModal({ viewingMessageSchedule, onClose, onSave, templates, funnels, isUpdating }) {
    if (!viewingMessageSchedule) return null;

    const [isEditing, setIsEditing] = useState(false);
    const [sendType, setSendType] = useState('direct_message');
    const [selectedTemplateName, setSelectedTemplateName] = useState('');
    const [selectedFunnelId, setSelectedFunnelId] = useState('');
    const [directMessage, setDirectMessage] = useState('');
    const [templateParams, setTemplateParams] = useState({});
    
    // Dropdown de templates
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

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
            if (viewingMessageSchedule.template_name) {
                setSendType('template');
                setSelectedTemplateName(viewingMessageSchedule.template_name);
                setTemplateParams(convertComponentsToParams(viewingMessageSchedule.template_components));
            } else if (viewingMessageSchedule.funnel_id) {
                setSendType('funnel');
                setSelectedFunnelId(viewingMessageSchedule.funnel_id);
            } else {
                setSendType('direct_message');
                setDirectMessage(viewingMessageSchedule.direct_message || '');
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
                                ? 'Altere o tipo de mensagem, template e preencha as variáveis.' 
                                : 'Esta é a mensagem que será disparada automaticamente para os contatos.'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-2xl transition-colors">
                        <FiX className="text-slate-400" />
                    </button>
                </div>

                {/* Conteúdo Central */}
                <div className="flex-1 overflow-y-auto p-8 space-y-8 premium-scrollbar">
                    
                    {/* Modo Edição */}
                    {isEditing ? (
                        <div className="space-y-6">
                            {/* Tipo de Envio Selector */}
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Tipo de Envio</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { id: 'template', label: 'Template Oficial', icon: FiCheck },
                                        { id: 'direct_message', label: 'Mensagem Direta', icon: FiMessageSquare },
                                        { id: 'funnel', label: 'Funil ZapVoice', icon: FiFolder }
                                    ].map(type => (
                                        <button
                                            key={type.id}
                                            onClick={() => setSendType(type.id)}
                                            className={`py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-wider border transition-all flex items-center justify-center gap-2 ${sendType === type.id ? 'bg-purple-600 border-purple-500 text-white shadow-xl shadow-purple-900/20 translate-y-[-1px]' : 'bg-black/20 border-white/5 text-slate-500 hover:bg-black/40'}`}
                                        >
                                            <type.icon size={12} />
                                            {type.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Conteúdo Dinâmico com base no Tipo de Envio */}
                            {sendType === 'direct_message' && (
                                <div className="space-y-3">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Texto da Mensagem</label>
                                    <textarea
                                        rows={6}
                                        value={directMessage}
                                        onChange={(e) => setDirectMessage(e.target.value)}
                                        placeholder="Digite a mensagem de texto livre..."
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-medium text-sm outline-none focus:border-purple-500/50 shadow-inner"
                                    />
                                </div>
                            )}

                            {sendType === 'funnel' && (
                                <div className="space-y-3">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Selecione o Funil</label>
                                    <select
                                        value={selectedFunnelId}
                                        onChange={(e) => setSelectedFunnelId(e.target.value)}
                                        className="w-full bg-slate-950 border border-white/10 rounded-2xl p-5 text-white font-bold text-sm outline-none focus:border-purple-500/50 cursor-pointer shadow-inner"
                                    >
                                        <option value="">-- Escolha um Funil --</option>
                                        {funnels.map(f => (
                                            <option key={f.id} value={f.id}>{f.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {sendType === 'template' && (
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
                                                <div className="p-3 border-b border-white/5 bg-black/20">
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
                                                </div>
                                                <div className="max-h-52 overflow-y-auto premium-scrollbar">
                                                    {templates
                                                        .filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
                                                        .map(t => (
                                                            <div 
                                                                key={t.name}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedTemplateName(t.name);
                                                                    setTemplateParams({});
                                                                    setIsDropdownOpen(false);
                                                                    setSearchQuery('');
                                                                }}
                                                                className={`px-6 py-2.5 hover:bg-purple-500/10 cursor-pointer transition-colors text-xs font-bold text-white ${selectedTemplateName === t.name ? 'bg-purple-500/5' : ''}`}
                                                            >
                                                                {t.name}
                                                            </div>
                                                        ))
                                                    }
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
                                                        {extractTemplateVariables(selectedTemplateObj).map(v => (
                                                            <div key={v.key} className="space-y-1.5">
                                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">{v.label}</span>
                                                                <input 
                                                                    type="text"
                                                                    value={templateParams[v.key] || ''}
                                                                    onChange={(e) => handleParamChange(v.key, e.target.value)}
                                                                    placeholder={`Preencha o valor de ${v.label}...`}
                                                                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3 text-white font-medium text-xs outline-none focus:border-purple-500/50 shadow-inner"
                                                                />
                                                            </div>
                                                        ))}
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
                            )}
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
