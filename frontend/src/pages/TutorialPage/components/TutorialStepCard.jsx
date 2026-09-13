import React from 'react';
import { FiExternalLink } from 'react-icons/fi';

const TutorialStepCard = ({ step }) => {
  return (
    <div className="bg-white dark:bg-[#1e293b] rounded-3xl border border-gray-100 dark:border-white/5 shadow-md overflow-hidden">
      <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 md:gap-8 items-start">
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-indigo-600/10 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 font-black flex items-center justify-center text-sm">
              {step.num}
            </span>
            <h3 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-wider">
              {step.title}
            </h3>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
            {step.text}
          </p>

          {step.url && (
            <a
              href={step.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/10 uppercase tracking-wider"
            >
              Acessar link oficial <FiExternalLink size={12} />
            </a>
          )}
        </div>

        {step.image && (
          <div className="w-full md:w-1/2 rounded-2xl overflow-hidden border border-gray-200/50 dark:border-white/5 bg-gray-50 dark:bg-[#0f172a] shadow-inner">
            <img
              src={step.image}
              alt={step.title}
              className="w-full h-auto object-cover max-h-[350px]"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default TutorialStepCard;
