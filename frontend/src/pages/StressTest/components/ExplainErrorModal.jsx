import React from 'react';
import { createPortal } from 'react-dom';
import { FiAlertCircle } from 'react-icons/fi';
import { ERROR_EXPLANATIONS } from '../utils/errorExplanations';

export default function ExplainErrorModal({ explainError, onClose }) {
  if (!explainError) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 w-screen h-screen">
      <div className="w-full max-w-md bg-white dark:bg-[#131722] border border-gray-200 dark:border-white/5 rounded-3xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2 mb-4">
          <FiAlertCircle className="text-blue-500 w-5 h-5" />
          {ERROR_EXPLANATIONS[explainError]?.titulo || "Explicação do Erro"}
        </h3>

        <div className="space-y-4">
          <div>
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1">O que é este erro?</span>
            <p className="text-xs text-gray-650 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-white/5 rounded-xl p-3">
              {ERROR_EXPLANATIONS[explainError]?.descricao}
            </p>
          </div>

          <div>
            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block mb-1">O que fazer?</span>
            <p className="text-xs text-gray-650 dark:text-gray-300 leading-relaxed bg-amber-50 dark:bg-amber-900/10 rounded-xl p-3 border border-amber-200 dark:border-amber-500/20">
              {ERROR_EXPLANATIONS[explainError]?.solucao}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95"
        >
          Entendido
        </button>
      </div>
    </div>,
    document.body
  );
}
