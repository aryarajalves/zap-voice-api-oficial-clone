import React from 'react';
import { FiChevronRight, FiCopy, FiCheck, FiExternalLink } from 'react-icons/fi';

const TutorialCard = ({
  tutorial,
  copiedId,
  onSelect,
  onCopyLink,
  onOpenNewTab
}) => {
  const Icon = tutorial.icon;

  return (
    <div
      onClick={() => onSelect(tutorial.id)}
      className="text-left bg-white dark:bg-[#1e293b] hover:bg-gray-50/50 dark:hover:bg-gray-800/40 rounded-3xl border border-gray-100 dark:border-white/5 p-6 shadow-md hover:shadow-xl transition-all duration-300 group hover:-translate-y-1 flex flex-col justify-between min-h-[220px] cursor-pointer"
    >
      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${tutorial.color} text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
            <Icon size={22} />
          </div>

          {/* Botões de Ação Rápida */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => onCopyLink(e, tutorial.id)}
              className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-500 dark:text-gray-400 rounded-xl transition-all border border-transparent hover:border-gray-200 dark:hover:border-white/5 cursor-pointer"
              title="Copiar link público para enviar ao cliente"
            >
              {copiedId === tutorial.id ? <FiCheck className="text-green-500" size={14} /> : <FiCopy size={14} />}
            </button>
            <button
              type="button"
              onClick={(e) => onOpenNewTab(e, tutorial.id)}
              className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-500 dark:text-gray-400 rounded-xl transition-all border border-transparent hover:border-gray-200 dark:hover:border-white/5 cursor-pointer"
              title="Abrir tutorial público em nova aba"
            >
              <FiExternalLink size={14} />
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-[9px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest">
            {tutorial.subtitle}
          </span>
          <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase leading-tight tracking-wide">
            {tutorial.title}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium leading-relaxed mt-1">
            {tutorial.description}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider mt-4">
        Começar Tutorial <FiChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
      </div>
    </div>
  );
};

export default TutorialCard;
