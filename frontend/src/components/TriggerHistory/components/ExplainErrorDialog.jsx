import React from 'react';
import { createPortal } from 'react-dom';
import { FiAlertCircle } from 'react-icons/fi';
import { ERROR_EXPLANATIONS, getExplanationKey } from './ContactsModalHelpers';

const ExplainErrorDialog = ({ errorReason, onClose }) => {
    if (!errorReason) return null;

    const expKey = getExplanationKey(errorReason);
    const explanation = ERROR_EXPLANATIONS[expKey];
    if (!explanation) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 w-screen h-screen">
            <div className="w-full max-w-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200" style={{ userSelect: 'none', cursor: 'default' }}>
                <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                    <FiAlertCircle className="text-blue-500 w-5 h-5" /> 
                    {explanation.titulo}
                </h3>
                
                <div className="space-y-4">
                    <div>
                        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wider block mb-1">O que é este erro:</span>
                        <p className="text-xs text-gray-655 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl border border-gray-150 dark:border-gray-700">
                            {explanation.descricao}
                        </p>
                    </div>

                    <div>
                        <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block mb-1">O que fazer com os contatos:</span>
                        <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed bg-amber-500/10 dark:bg-yellow-500/5 p-3 rounded-xl border border-amber-500/20">
                            {explanation.acao}
                        </p>
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-md hover:shadow-blue-500/20"
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ExplainErrorDialog;
export { getExplanationKey };
