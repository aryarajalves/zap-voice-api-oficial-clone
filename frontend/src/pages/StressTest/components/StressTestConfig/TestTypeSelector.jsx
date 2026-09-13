import React from 'react';
import { FiZap } from 'react-icons/fi';

export default function TestTypeSelector({ testType, setTestType }) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
        Tipo de Teste
      </label>
      <div className="grid grid-cols-2 gap-1.5 bg-gray-100 dark:bg-gray-800/50 p-1.5 rounded-xl">
        <button
          type="button"
          onClick={() => setTestType('funnel')}
          className={`py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
            testType === 'funnel'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          Funil
        </button>
        <button
          type="button"
          onClick={() => setTestType('template')}
          className={`py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
            testType === 'template'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          Template
        </button>
        <button
          type="button"
          onClick={() => setTestType('webhook')}
          className={`py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${
            testType === 'webhook'
              ? 'bg-violet-600 text-white shadow-md'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          <FiZap size={11} className="shrink-0" /> Webhook
        </button>
        <button
          type="button"
          onClick={() => setTestType('contacts')}
          className={`py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${
            testType === 'contacts'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          👥 Contatos
        </button>
      </div>
    </div>
  );
}
