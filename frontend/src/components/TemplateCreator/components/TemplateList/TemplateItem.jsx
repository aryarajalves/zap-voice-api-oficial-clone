import React from 'react';
import { FiCheck, FiClock, FiAlertCircle, FiZap, FiTrash2 } from 'react-icons/fi';

const TemplateItem = ({ tpl, logic }) => {
    const { handleEdit, setTemplateToDelete, setIsDeleteModalOpen } = logic;

    return (
        <div className="p-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 hover:border-blue-200 dark:hover:border-blue-800 transition-all group">
            <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-800 dark:text-gray-100 truncate" title={tpl.name}>
                        {tpl.name}
                    </p>
                    <p className="text-[10px] text-gray-500 font-medium">{tpl.category} • {tpl.language}</p>
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
        </div>
    );
};

export default TemplateItem;
