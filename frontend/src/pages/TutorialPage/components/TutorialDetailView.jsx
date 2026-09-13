import React from 'react';
import { FiArrowLeft, FiCopy, FiCheck, FiExternalLink } from 'react-icons/fi';
import TutorialStepCard from './TutorialStepCard';

const TutorialDetailView = ({
  tutorial,
  copiedId,
  onBack,
  onCopyLink,
  onOpenNewTab
}) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
      {/* Header de navegação */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="p-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-200 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 transition-all flex items-center justify-center cursor-pointer"
          >
            <FiArrowLeft size={18} />
          </button>
          <div>
            <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
              Tutorial Detalhado
            </span>
            <h2 className="text-xl font-black text-gray-900 dark:text-white leading-tight">
              {tutorial.title}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={(e) => onCopyLink(e, tutorial.id)}
            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold transition-all border border-gray-200/50 dark:border-white/5 flex items-center gap-2 uppercase tracking-wider cursor-pointer"
          >
            {copiedId === tutorial.id ? <FiCheck className="text-green-500" size={14} /> : <FiCopy size={14} />}
            Copiar Link
          </button>
          <button
            type="button"
            onClick={(e) => onOpenNewTab(e, tutorial.id)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/10 flex items-center gap-2 uppercase tracking-wider cursor-pointer"
          >
            <FiExternalLink size={14} />
            Abrir em Nova Aba
          </button>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-8">
        {tutorial.steps.map((step, index) => (
          <TutorialStepCard key={index} step={step} />
        ))}
      </div>
    </div>
  );
};

export default TutorialDetailView;
