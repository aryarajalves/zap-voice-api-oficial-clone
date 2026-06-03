import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiTag } from 'react-icons/fi';
import useScrollLock from '../hooks/useScrollLock';

const FunnelTagModal = ({
    isOpen,
    onClose,
    onConfirm,
    funnel,
    container = document.body
}) => {
    const [tagValue, setTagValue] = useState('');

    useScrollLock(isOpen);

    useEffect(() => {
        if (isOpen && funnel) {
            setTagValue(funnel.tag || '');
        }
    }, [isOpen, funnel]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onConfirm(funnel.id, tagValue.trim());
        onClose();
    };

    return createPortal(
        <div className="fixed inset-0 z-[20000] flex items-center justify-center p-4 sm:p-6 select-none">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
            />

            {/* Modal Content */}
            <div
                className="relative bg-white dark:bg-[#1e293b] rounded-[2.5rem] shadow-2xl max-w-md w-full overflow-hidden transform transition-all animate-in zoom-in-95 fade-in duration-300 border border-gray-100 dark:border-white/5"
                onClick={e => e.stopPropagation()}
            >
                {/* Header with gradient line */}
                <div className="h-2 w-full bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-600" />

                <div className="p-10">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="flex flex-col items-center text-center gap-6">
                            <div className="p-5 rounded-[2rem] flex-shrink-0 shadow-lg bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 shadow-violet-500/10">
                                <FiTag size={40} />
                            </div>

                            <div className="space-y-2 w-full">
                                <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                    Etiquetar Funil
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400 text-sm font-medium leading-relaxed">
                                    Defina uma etiqueta para organizar seus funis. Ela aparecerá nas listas de seleção do sistema.
                                </p>
                            </div>
                        </div>

                        {/* Input Box */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-450 dark:text-gray-400 uppercase tracking-widest px-1 block">
                                Nome da Etiqueta
                            </label>
                            <input
                                type="text"
                                maxLength={30}
                                placeholder="Ex: Vendas, Boas-vindas, Recuperação..."
                                className="w-full bg-gray-50 dark:bg-slate-900/60 border border-gray-200 dark:border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/50 transition-all shadow-inner"
                                value={tagValue}
                                onChange={(e) => setTagValue(e.target.value)}
                                autoFocus
                            />
                        </div>

                        {/* Footer Buttons */}
                        <div className="flex justify-center gap-4 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-8 py-3.5 rounded-2xl text-gray-700 dark:text-gray-300 font-black uppercase tracking-widest text-[10px] hover:bg-gray-100 dark:hover:bg-white/5 transition-all border border-gray-200 dark:border-white/10 active:scale-95"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="px-10 py-3.5 rounded-2xl text-white font-black uppercase tracking-widest text-[10px] shadow-2xl transition-all active:scale-95 bg-violet-600 hover:bg-violet-700 shadow-violet-600/30 flex items-center justify-center min-w-[140px]"
                            >
                                Salvar
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>,
        container
    );
};

export default FunnelTagModal;
