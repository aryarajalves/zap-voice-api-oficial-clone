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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-gray-900/60 dark:bg-black/70 backdrop-blur-md animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div
                className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all animate-in zoom-in-95 fade-in duration-300 border border-gray-100 dark:border-gray-700"
                onClick={e => e.stopPropagation()}
            >
                {/* Header with gradient line */}
                <div className={`h-1.5 w-full ${isDangerous ? 'bg-gradient-to-r from-red-500 to-orange-500' : 'bg-gradient-to-r from-blue-500 to-indigo-500'}`} />

                <div className="p-6">
                    <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-xl flex-shrink-0 ${isDangerous
                            ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                            : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'}`}
                        >
                            {isDangerous ? <FiAlertTriangle size={24} /> : <FiAlertCircle size={24} />}
                        </div>

                        <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                    {title}
                                </h3>
                                <button
                                    onClick={onClose}
                                    className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <FiX size={20} />
                                </button>
                            </div>
                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                {message}
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-8">
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-xl text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all border border-gray-200 dark:border-gray-600 active:scale-95"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className={`px-6 py-2.5 rounded-xl text-white font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center min-w-[120px] ${isDangerous
                                ? 'bg-red-600 hover:bg-red-700 shadow-red-500/20'
                                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
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

