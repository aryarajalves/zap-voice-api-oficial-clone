import React from 'react';
import { FiCheckCircle } from 'react-icons/fi';

export default function ImportStep3Success({ importResult }) {
  if (!importResult) return null;

  return (
    <div className="py-10 flex flex-col items-center text-center space-y-4">
      <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-2">
        <FiCheckCircle size={48} />
      </div>
      <div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Sucesso!</h3>
        <p className="text-gray-550 dark:text-gray-400">{importResult.message}</p>
      </div>
      <div className="grid grid-cols-2 gap-4 w-full max-w-xs mt-4">
        <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700">
          <p className="text-[10px] uppercase font-bold text-gray-400">Importados</p>
          <p className="text-2xl font-bold text-emerald-600">{importResult.imported}</p>
        </div>
        <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700">
          <p className="text-[10px] uppercase font-bold text-gray-400">Erros</p>
          <p className="text-2xl font-bold text-red-500">{importResult.errors}</p>
        </div>
      </div>
    </div>
  );
}
