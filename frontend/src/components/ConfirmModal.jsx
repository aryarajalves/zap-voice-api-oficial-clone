import React from 'react';
import { createPortal } from 'react-dom';
import { FiAlertCircle, FiAlertTriangle, FiX } from 'react-icons/fi';
import useScrollLock from '../hooks/useScrollLock';

const ConfirmModal = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    isDangerous = false,
    container = document.body
}) => {
    useScrollLock(isOpen);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[20000] flex items-center justify-center p-4 sm:p-6">
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
                <div className={`h-2 w-full ${isDangerous ? 'bg-gradient-to-r from-red-600 via-orange-600 to-red-600' : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600'}`} />

                <div className="p-10">
                    <div className="flex flex-col items-center text-center gap-6">
                        <div className={`p-5 rounded-[2rem] flex-shrink-0 shadow-lg ${isDangerous
                            ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 shadow-red-500/10'
                            : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 shadow-blue-500/10'}`}
                        >
                            {isDangerous ? <FiAlertTriangle size={40} /> : <FiAlertCircle size={40} />}
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                {title}
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
                                {message}
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-center gap-4 mt-10">
                        <button
                            onClick={onClose}
                            className="px-8 py-3.5 rounded-2xl text-gray-700 dark:text-gray-300 font-black uppercase tracking-widest text-[10px] hover:bg-gray-100 dark:hover:bg-white/5 transition-all border border-gray-200 dark:border-white/10 active:scale-95"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className={`px-10 py-3.5 rounded-2xl text-white font-black uppercase tracking-widest text-[10px] shadow-2xl transition-all active:scale-95 flex items-center justify-center min-w-[140px] ${isDangerous
                                ? 'bg-red-600 hover:bg-red-700 shadow-red-600/30'
                                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30'
                                }`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        container
    );
};

export default ConfirmModal;

