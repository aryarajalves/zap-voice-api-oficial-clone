import React from 'react';
import { FiClock } from 'react-icons/fi';

export default function FollowUpToggle({ isActive, onToggle }) {
  return (
    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 dark:from-blue-500/10 dark:to-indigo-500/10 rounded-2xl border border-blue-500/10 dark:border-blue-500/20">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${isActive ? 'bg-indigo-500/20 text-indigo-500 shadow-md shadow-indigo-500/10' : 'bg-gray-500/10 text-gray-500'}`}>
          <FiClock size={16} />
        </div>
        <div>
          <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">
            Disparar Mensagem de Follow-up (Recorrência de Template)
          </span>
          <p className="text-[9px] text-gray-500 dark:text-gray-400 mt-0.5">
            Caso o contato não responda à mensagem inicial, envie um segundo template automaticamente.
          </p>
        </div>
      </div>
      <label className="relative inline-flex items-center cursor-pointer select-none">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={isActive}
          onChange={(e) => onToggle(e.target.checked)}
        />
        <div className="w-10 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
      </label>
    </div>
  );
}
