import React from 'react';
import { toast } from 'react-hot-toast';

const ErrorReportModal = ({ errorModal, setErrorModal }) => {
    if (!errorModal.isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm animated-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh]">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-red-50 dark:bg-red-900/30">
                    <h3 className="font-bold text-red-800 dark:text-red-300 text-lg flex items-center gap-2">
                        ❌ Relatório de Falhas
                    </h3>
                    <button onClick={() => setErrorModal({ ...errorModal, isOpen: false })} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-0 overflow-y-auto flex-1 bg-white dark:bg-gray-800 min-h-[300px]">
                    {errorModal.isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                            {errorModal.errors.map((err, i) => (
                                <div key={i} className="p-3 hover:bg-red-50 dark:hover:bg-red-900/10 transition">
                                    <div className="flex justify-between items-start">
                                        <div className="font-mono text-sm font-bold text-gray-800 dark:text-gray-200">
                                            {err.phone}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {new Date(err.time).toLocaleString()}
                                        </div>
                                    </div>
                                    <div className="mt-1 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-100 dark:border-red-900/50">
                                        {err.reason}
                                    </div>
                                </div>
                            ))}
                            {errorModal.errors.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                                    <p className="text-sm">Nenhuma falha registrada.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex justify-end gap-3">
                    <button onClick={() => {
                        const text = errorModal.errors.map(e => `${e.phone};${e.reason};${e.time}`).join('\n');
                        navigator.clipboard.writeText(text);
                        toast.success('Relatório copiado!');
                    }} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition font-medium text-xs">Copiar Tudo</button>
                    <button onClick={() => setErrorModal({ ...errorModal, isOpen: false })} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium">Fechar</button>
                </div>
            </div>
        </div>
    );
};

export default ErrorReportModal;
