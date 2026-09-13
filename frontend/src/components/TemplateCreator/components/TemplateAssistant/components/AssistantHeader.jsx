import React from 'react';
import { FiZap, FiMaximize2, FiMinimize2, FiX } from 'react-icons/fi';

export default function AssistantHeader({ isMaximized, onToggleMaximize, onClose }) {
  return (
    <div className="px-6 py-4 bg-gradient-to-r from-blue-600/90 to-indigo-600/90 dark:from-blue-900/40 dark:to-indigo-900/40 border-b border-gray-100 dark:border-gray-800/40 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-white/10 dark:bg-blue-500/20 rounded-xl flex items-center justify-center text-white dark:text-blue-400">
          <FiZap className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <h3 className="font-bold text-white dark:text-gray-100 flex items-center gap-1.5 text-base">
            ZapVoice IA
          </h3>
          <p className="text-[11px] text-blue-100/80 dark:text-gray-400/85">
            Assistente de templates do WhatsApp
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleMaximize}
          className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
          title={isMaximized ? 'Minimizar' : 'Maximizar'}
        >
          {isMaximized ? <FiMinimize2 size={16} /> : <FiMaximize2 size={16} />}
        </button>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
          title="Fechar"
        >
          <FiX size={18} />
        </button>
      </div>
    </div>
  );
}
