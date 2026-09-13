import React from 'react';
import { FiLayers } from 'react-icons/fi';

export default function NoActiveClientScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8 text-center animate-fade-in">
      <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
        <FiLayers size={40} className="text-gray-300 dark:text-gray-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Inicie uma Sessão</h2>
      <p className="max-w-xs text-sm leading-relaxed">Selecione um cliente ativo no menu ao lado.</p>
    </div>
  );
}
