import React from 'react';
import { FiTrash2, FiZap } from 'react-icons/fi';

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
                        type="button"
                        onClick={onCancel}
                        className="py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-[1.5rem] font-black text-xs transition-all active:scale-95 uppercase tracking-widest cursor-pointer"
                    >
                        Cancelar
                    </button>
                    <button 
                        type="button"
                        onClick={onConfirm}
                        disabled={isProcessing}
                        className={`py-4 bg-${colorClass}-600 hover:bg-${colorClass}-500 text-white rounded-[1.5rem] font-black text-xs transition-all active:scale-95 shadow-xl shadow-${colorClass}-900/40 uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer`}
                    >
                        {isProcessing && <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
                        {isDelete ? 'Excluir Agora' : 'Confirmar Disparo'}
                    </button>
                </div>
            </div>
        </div>
    );
}
