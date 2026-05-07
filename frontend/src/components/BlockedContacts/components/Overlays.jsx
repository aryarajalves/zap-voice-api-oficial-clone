import React from 'react';
import { createPortal } from 'react-dom';
import { FiUpload } from 'react-icons/fi';

export const ProgressOverlay = ({ importing, importLabel, importProgress }) => {
    if (!importing) return null;
    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-lg animate-in fade-in duration-300">
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 w-full max-w-md shadow-2xl text-center space-y-6 border border-white/5">
                <div className="relative w-28 h-28 mx-auto">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle cx="56" cy="56" r="50" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-100 dark:text-gray-700" />
                        <circle
                            cx="56" cy="56" r="50" stroke="currentColor" strokeWidth="8" fill="transparent"
                            strokeDasharray={314}
                            strokeDashoffset={314 - (314 * (importProgress.current / importProgress.total || 0))}
                            className="text-red-600 transition-all duration-500 ease-out"
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-black text-gray-900 dark:text-white">
                            {Math.round((importProgress.current / importProgress.total) * 100 || 0)}%
                        </span>
                    </div>
                </div>
                <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{importLabel}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Por favor, mantenha esta aba aberta. Estamos processando sua solicitação de forma segura.
                    </p>
                </div>
                <div className="space-y-3">
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3.5 overflow-hidden shadow-inner border border-white/5">
                        <div
                            className="h-full bg-gradient-to-r from-red-500 to-red-700 transition-all duration-300 rounded-full shadow-lg"
                            style={{ width: `${(importProgress.current / importProgress.total) * 100 || 0}%` }}
                        />
                    </div>
                    <div className="flex justify-between items-center px-1">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Processando</span>
                        <span className="text-xs font-black text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded border border-red-500/10">
                            {importProgress.current} / {importProgress.total}
                        </span>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export const LoadingOverlay = ({ visible, message, icon: Icon = FiUpload }) => {
    if (!visible) return null;
    return createPortal(
        <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-gray-800 p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center gap-6 border border-white/5 max-w-sm w-full mx-4">
                <div className="relative w-20 h-20">
                    <div className="absolute inset-0 border-4 border-red-500/10 rounded-full" />
                    <div className="absolute inset-0 border-4 border-red-600 rounded-full border-t-transparent animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Icon className="text-red-600 animate-pulse" size={32} />
                    </div>
                </div>
                <div className="text-center space-y-2">
                    <h4 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{message.title || 'Processando'}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{message.subtitle || 'Aguarde um instante...'}</p>
                </div>
            </div>
        </div>,
        document.body
    );
};
