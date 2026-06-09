import React from 'react';
import { FiX, FiDatabase, FiTag } from 'react-icons/fi';

export default function CustomFieldsModal({ isOpen, onClose, lead }) {
  if (!isOpen || !lead) return null;

  const variables = lead.variables || {};
  const variableKeys = Object.keys(variables);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop escuro e transparente sem fechamento ao clicar fora */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />

      {/* Painel Central */}
      <div className="relative bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-lg mx-4 z-10 scale-in duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b border-gray-100 dark:border-gray-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-lg">
              <FiDatabase size={20} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
                Dados Extraídos
              </h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                Lead: {lead.name || lead.phone}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Corpo */}
        <div className="max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
          {variableKeys.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-950/20 rounded-xl border border-gray-100 dark:border-gray-800">
              <FiTag size={36} className="mx-auto text-gray-300 dark:text-gray-700 mb-2" />
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                Nenhuma variável customizada foi extraída para este contato ainda.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5">
              {variableKeys.map((key) => (
                <div
                  key={key}
                  className="flex justify-between items-center bg-gray-50 dark:bg-gray-950/20 p-3.5 rounded-xl border border-gray-100 dark:border-gray-800 hover:shadow-sm transition"
                >
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-rose-500 dark:text-rose-400 uppercase tracking-widest font-mono">
                      {key}
                    </span>
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 mt-0.5 break-all">
                      {variables[key]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2.5 mt-6 pt-3 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4.5 py-2 text-xs font-bold text-gray-700 bg-gray-100 dark:bg-gray-800 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
