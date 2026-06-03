import React, { useState } from 'react';
import { FiCheck, FiClock, FiAlertCircle, FiZap, FiTrash2, FiTag, FiPlus, FiX, FiArchive, FiBookmark } from 'react-icons/fi';
import ConfirmModal from '../../../ConfirmModal';

const TemplateItem = ({ tpl, logic }) => {
    const { handleEdit, setTemplateToDelete, setIsDeleteModalOpen, updateTemplateTags, templates, deleteTemplateTagGlobal, archiveTemplate, unarchiveTemplate, handlePinTemplate } = logic;
    const [showTagPopover, setShowTagPopover] = useState(false);
    const [newTagInput, setNewTagInput] = useState('');
    const [tempTags, setTempTags] = useState(tpl.tags || []);
    const [tagToDelete, setTagToDelete] = useState(null);
    const [isDeleteTagModalOpen, setIsDeleteTagModalOpen] = useState(false);

    const allExistingTags = Array.from(
        new Set([
            ...(templates || []).flatMap(t => t.tags || []),
            ...tempTags
        ])
    );

    const handleToggleTag = (tag) => {
        if (tempTags.includes(tag)) {
            setTempTags(tempTags.filter(t => t !== tag));
        } else {
            setTempTags([...tempTags, tag]);
        }
    };

    const handleAddNewTag = (e) => {
        e.preventDefault();
        const cleanTag = newTagInput.trim().toLowerCase();
        if (cleanTag && !tempTags.includes(cleanTag)) {
            setTempTags([...tempTags, cleanTag]);
            setNewTagInput('');
        }
    };

    const handleSaveTags = async () => {
        const success = await updateTemplateTags(tpl.id, tempTags);
        if (success) {
            setShowTagPopover(false);
        }
    };

    const handleOpenPopover = () => {
        setTempTags(tpl.tags || []);
        setShowTagPopover(true);
    };

    return (
        <div className={`p-4 rounded-xl border-2 transition-all group relative ${
            tpl.is_pinned 
                ? 'border-amber-500 bg-amber-500/[0.04] dark:border-amber-500/30 shadow-md shadow-amber-500/5 dark:shadow-amber-500/10' 
                : 'border-gray-150 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 hover:border-blue-200 dark:hover:border-blue-800'
        }`}>
            <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-800 dark:text-gray-100 truncate flex items-center gap-1.5" title={tpl.name}>
                        {tpl.is_pinned && <span className="text-amber-500 animate-pulse text-xs shrink-0">📌</span>}
                        <span className="truncate">{tpl.name}</span>
                    </p>
                    <p className="text-[10px] text-gray-500 font-medium">{tpl.category} • {tpl.language}</p>
                    {tpl.created_at && (() => {
                        try {
                            const date = new Date(tpl.created_at);
                            // Formatar para fuso horário de Brasília
                            const formatted = date.toLocaleString('pt-BR', {
                                timeZone: 'America/Sao_Paulo',
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                            });
                            return <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-0.5">Criado em: {formatted}</p>;
                        } catch (err) {
                            return null;
                        }
                    })()}
                </div>
                <div className="flex flex-col items-end gap-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${['APPROVED', 'ACTIVE'].includes(tpl.status) ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        tpl.status === 'PENDING' || tpl.status === 'IN_APPEAL' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            tpl.status === 'REJECTED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
                        }`}>
                        {['APPROVED', 'ACTIVE'].includes(tpl.status) && <FiCheck size={10} />}
                        {tpl.status === 'PENDING' && <FiClock size={10} />}
                        {tpl.status === 'REJECTED' && <FiAlertCircle size={10} />}
                        {tpl.status}
                    </span>
                    {tpl.is_archived && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-lg border text-amber-500 border-amber-500/20 bg-amber-500/5 flex items-center gap-1">
                            <FiArchive size={8} /> ARQUIVADO
                        </span>
                    )}
                    {tpl.quality_score && (
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-lg border flex items-center gap-1 ${tpl.quality_score === 'HIGH' ? 'text-green-500 border-green-500/20 bg-green-500/5' :
                            tpl.quality_score === 'MEDIUM' ? 'text-yellow-500 border-yellow-500/20 bg-yellow-500/5' :
                                'text-red-500 border-red-500/20 bg-red-500/5'
                            }`}>
                            <FiZap size={8} /> {tpl.quality_score}
                        </span>
                    )}
                </div>
            </div>

            {/* Linha de Etiquetas (Tags) */}
            <div className="flex flex-wrap items-center gap-1.5 mb-3 relative">
                {(tpl.tags || []).map((tag, idx) => (
                    <span 
                        key={idx} 
                        className="text-[9px] font-bold px-2 py-0.5 bg-blue-50/60 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/30 rounded"
                    >
                        {tag}
                    </span>
                ))}
                
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (showTagPopover) {
                            setShowTagPopover(false);
                        } else {
                            handleOpenPopover();
                        }
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded bg-violet-50 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-800 transition-all flex items-center justify-center border border-violet-100 dark:border-violet-800/30"
                    title="Gerenciar Etiquetas"
                >
                    <FiTag size={10} />
                </button>

                {/* Botão de Fixar / Desafixar */}
                {!tpl.is_archived && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handlePinTemplate(tpl.id, !tpl.is_pinned);
                        }}
                        className={`opacity-0 group-hover:opacity-100 p-1 rounded transition-all flex items-center justify-center border ${
                            tpl.is_pinned 
                                ? 'bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-800 border-amber-100 dark:border-amber-800/30' 
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 border-gray-250 dark:border-gray-650'
                        }`}
                        title={tpl.is_pinned ? "Desafixar do Topo" : "Fixar no Topo"}
                    >
                        <FiBookmark size={10} fill={tpl.is_pinned ? "currentColor" : "none"} />
                    </button>
                )}

                {showTagPopover && (
                    <div 
                        className="absolute left-0 top-7 z-50 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl w-60 animate-in fade-in slide-in-from-top-1 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100 dark:border-gray-700">
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Etiquetas</span>
                            <button 
                                onClick={() => setShowTagPopover(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                <FiX size={12} />
                            </button>
                        </div>

                        <div className="max-h-24 overflow-y-auto mb-2 pr-1 custom-scrollbar">
                            {allExistingTags.length === 0 ? (
                                <p className="text-[10px] text-gray-400 dark:text-gray-500 italic py-1">Nenhuma etiqueta criada ainda.</p>
                            ) : (
                                <div className="flex flex-col gap-1">
                                    {allExistingTags.map((tag) => (
                                        <div key={tag} className="flex items-center justify-between gap-2 group/tag py-0.5 hover:bg-slate-500/5 rounded px-1 transition-all">
                                            <label className="flex items-center gap-2 cursor-pointer select-none text-[10px] text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 flex-1 min-w-0">
                                                <input 
                                                    type="checkbox"
                                                    checked={tempTags.includes(tag)}
                                                    onChange={() => handleToggleTag(tag)}
                                                    className="w-3 h-3 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-700 shrink-0"
                                                />
                                                <span className="truncate" title={tag}>{tag}</span>
                                            </label>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setTagToDelete(tag);
                                                    setIsDeleteTagModalOpen(true);
                                                }}
                                                className="opacity-0 group-hover/tag:opacity-100 p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-500/10 rounded transition-all shrink-0"
                                                title="Excluir etiqueta permanentemente"
                                            >
                                                <FiTrash2 size={10} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <form onSubmit={handleAddNewTag} className="flex gap-1 mb-3">
                            <input
                                type="text"
                                value={newTagInput}
                                onChange={(e) => setNewTagInput(e.target.value)}
                                placeholder="Nova etiqueta..."
                                className="flex-1 px-2 py-1 text-[10px] rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:border-blue-500"
                            />
                            <button
                                type="submit"
                                className="p-1 rounded bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center shrink-0"
                            >
                                <FiPlus size={12} />
                            </button>
                        </form>

                        <button
                            onClick={handleSaveTags}
                            className="w-full py-1.5 text-[10px] font-bold text-center text-white bg-green-500 hover:bg-green-600 rounded transition-colors"
                        >
                            Salvar Alterações
                        </button>
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] text-gray-600 dark:text-gray-400 line-clamp-2 italic leading-relaxed flex-1">
                    {Array.isArray(tpl.components) ? tpl.components.find(c => c.type === 'BODY')?.text : ''}
                </p>
                <div className="flex flex-col gap-1">
                    {tpl.status !== 'PENDING' && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setTemplateToDelete(tpl.name);
                                setIsDeleteModalOpen(true);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1.5 bg-red-50 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-800 transition-all"
                            title="Excluir Template"
                        >
                            <FiTrash2 size={12} />
                        </button>
                    )}
                    {tpl.is_archived ? (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                unarchiveTemplate(tpl.name);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1.5 bg-green-50 dark:bg-green-900/40 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-800 transition-all flex items-center justify-center"
                            title="Desarquivar Template"
                        >
                            <FiArchive size={12} />
                        </button>
                    ) : (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                archiveTemplate(tpl.name);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1.5 bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-800 transition-all flex items-center justify-center"
                            title="Arquivar Template"
                        >
                            <FiArchive size={12} />
                        </button>
                    )}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(tpl);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800 transition-all text-[10px] font-bold"
                    >
                        EDITAR
                    </button>
                </div>
            </div>

            {tpl.rejection_reason && tpl.status === 'REJECTED' && (
                <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300 w-full mb-2">
                    <p className="text-[10px] text-red-600 dark:text-red-400 font-bold flex items-center gap-1">
                        <FiAlertCircle size={12} className="shrink-0" /> Motivo da Rejeição:
                    </p>
                    <p className="text-[10px] text-red-500/80 dark:text-red-400/80 mt-1 italic leading-tight">
                        {tpl.rejection_reason}
                    </p>
                </div>
            )}
            {tpl.status === 'PAUSED' && (
                <div className="flex flex-col gap-1 w-full mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300 mb-2">
                    <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                        <FiAlertCircle size={12} className="shrink-0" />
                        <span>Template Pausado por Baixa Qualidade</span>
                    </div>
                    <p className="text-[10px] text-amber-500/80 dark:text-amber-400/80 italic leading-tight">
                        Meta pausou este template. Clique em <b>EDITAR</b>, melhore o conteúdo e envie novamente.
                    </p>
                </div>
            )}

            <ConfirmModal
                isOpen={isDeleteTagModalOpen}
                onClose={() => {
                    setIsDeleteTagModalOpen(false);
                    setTagToDelete(null);
                }}
                onConfirm={async () => {
                    if (tagToDelete) {
                        await deleteTemplateTagGlobal(tagToDelete);
                        setTempTags(prev => prev.filter(t => t !== tagToDelete));
                    }
                }}
                title="Excluir Etiqueta"
                message={`Tem certeza de que deseja excluir a etiqueta "${tagToDelete}" de todos os templates? Esta ação não pode ser desfeita.`}
                confirmText="Excluir Globalmente"
                isDangerous={true}
            />
        </div>
    );
};

export default TemplateItem;
