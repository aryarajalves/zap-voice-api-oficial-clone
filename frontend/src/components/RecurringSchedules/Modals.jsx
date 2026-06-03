import React, { useState, useEffect } from 'react';
import { FiX, FiUsers, FiEdit2, FiZap, FiTrash2, FiEye, FiCheck, FiFolder, FiMessageSquare, FiSearch, FiSave, FiLink, FiAlertCircle, FiRotateCcw, FiRefreshCw } from 'react-icons/fi';
import TemplatePreview from '../BulkSender/common/TemplatePreview';
import { toast } from 'react-hot-toast';

export function ViewContactsModal({ viewingContacts, onClose, onSaveExclusions, isSavingExclusions, onRefreshContacts }) {
    const [localExclusions, setLocalExclusions] = useState([]);
    const [filterType, setFilterType] = useState('all'); // 'all' | 'active' | 'excluded'
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        if (viewingContacts) {
            setLocalExclusions(viewingContacts.exclusion_list || []);
            setFilterType('all');
        }
    }, [viewingContacts]);

    if (!viewingContacts) return null;

    const contacts = viewingContacts.contacts || [];

    const handleToggleExclusion = (phone) => {
        setLocalExclusions(prev => {
            if (prev.includes(phone)) {
                return prev.filter(p => p !== phone);
            } else {
                return [...prev, phone];
            }
        });
    };

    const hasChanges = JSON.stringify([...localExclusions].sort()) !== JSON.stringify([...(viewingContacts.exclusion_list || [])].sort());

    const activeContacts = contacts.filter(c => !localExclusions.includes(c.phone));
    const excludedContacts = contacts.filter(c => localExclusions.includes(c.phone));

    const displayedContacts = contacts.filter(c => {
        const isExcluded = localExclusions.includes(c.phone);
        if (filterType === 'active') return !isExcluded;
        if (filterType === 'excluded') return isExcluded;
        return true;
    });

    const handleSave = async () => {
        if (onSaveExclusions) {
            await onSaveExclusions(viewingContacts.id, localExclusions);
        }
    };

    const handleRefresh = async () => {
        if (onRefreshContacts) {
            setIsRefreshing(true);
            try {
                await onRefreshContacts(viewingContacts.id);
                toast.success("Contatos atualizados com sucesso!");
            } catch (err) {
                toast.error("Erro ao atualizar contatos.");
            } finally {
                setIsRefreshing(false);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200">
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
                    <div className="flex items-center gap-2">
                        {onRefreshContacts && (
                            <button 
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                className="p-3 hover:bg-white/5 rounded-2xl transition-colors flex items-center gap-2 text-slate-400 hover:text-white"
                                title="Atualizar contatos da lista"
                            >
                                <FiRefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
                            </button>
                        )}
                        <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-2xl transition-colors">
                            <FiX className="text-slate-400" />
                        </button>
                    </div>
                </div>

                {/* Filtros rápidos de status */}
                <div className="px-8 py-4 bg-slate-950/20 border-b border-white/5 flex items-center gap-2">
                    <button
                        onClick={() => setFilterType('all')}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filterType === 'all' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white/5 hover:bg-white/10 text-slate-400'}`}
                    >
                        Todos ({contacts.length})
                    </button>
                    <button
                        onClick={() => setFilterType('active')}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filterType === 'active' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white/5 hover:bg-white/10 text-slate-400'}`}
                    >
                        Ativos ({activeContacts.length})
                    </button>
                    <button
                        onClick={() => setFilterType('excluded')}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filterType === 'excluded' ? 'bg-rose-600 text-white shadow-lg' : 'bg-white/5 hover:bg-white/10 text-slate-400'}`}
                    >
                        Removidos ({excludedContacts.length})
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-2 premium-scrollbar">
                    {displayedContacts.length === 0 ? (
                        <div className="text-center py-20 text-slate-500 font-bold uppercase tracking-widest text-xs">
                            Nenhum contato nesta visualização
                        </div>
                    ) : (
                        displayedContacts.map((contact, i) => {
                            const isExcluded = localExclusions.includes(contact.phone);
                            return (
                                <div 
                                    key={i} 
                                    className={`flex items-center justify-between p-4 border rounded-2xl transition-all ${isExcluded ? 'bg-rose-950/10 border-rose-500/10 opacity-60' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                                >
                                    <div className="space-y-0.5">
                                        <div className="flex items-center gap-2">
                                            <div className="text-sm font-black text-white">{contact.name}</div>
                                            {isExcluded && (
                                                <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 rounded-full font-black text-[9px] uppercase tracking-widest border border-rose-500/20">
                                                    Removido
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-[10px] text-slate-500 font-bold">{contact.email || '-'}</div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className={`font-black text-xs tabular-nums ${isExcluded ? 'text-slate-500 line-through' : 'text-blue-400'}`}>
                                            {contact.phone}
                                        </div>
                                        <button
                                            onClick={() => handleToggleExclusion(contact.phone)}
                                            className={`p-2 rounded-xl border transition-all ${isExcluded ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20 text-rose-400'}`}
                                            title={isExcluded ? "Adicionar de volta ao disparo" : "Remover do disparo"}
                                        >
                                            {isExcluded ? <FiRotateCcw size={14} /> : <FiTrash2 size={14} />}
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="p-6 bg-slate-800/40 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Total nesta lista: <span className="text-white text-sm">{displayedContacts.length}</span>
                    </span>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={onClose}
                            className="px-6 py-3 bg-slate-800 text-slate-300 rounded-2xl font-black text-xs hover:bg-slate-700 transition-all active:scale-95"
                        >
                            FECHAR
                        </button>
                        <button 
                            onClick={handleSave}
                            disabled={!hasChanges || isSavingExclusions}
                            className={`px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs transition-all active:scale-95 shadow-xl shadow-blue-900/40 flex items-center gap-2 ${(!hasChanges || isSavingExclusions) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isSavingExclusions && <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
                            SALVAR ALTERAÇÕES
                        </button>
                    </div>
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

export { ViewMessageModal } from './ViewMessageModal';
