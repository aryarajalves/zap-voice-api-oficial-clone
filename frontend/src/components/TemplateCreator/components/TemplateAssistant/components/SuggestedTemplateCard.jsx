import React from 'react';
import { FiZap, FiChevronDown, FiChevronUp, FiCheck } from 'react-icons/fi';

export default function SuggestedTemplateCard({
  tplData,
  isExpanded,
  onToggleExpand,
  fieldsToApply,
  toggleField,
  onApplyTemplate
}) {
  if (!tplData) return null;

  return (
    <div className="mt-3 p-4 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100/60 dark:border-blue-900/35 rounded-2xl w-full max-w-[90%] flex flex-col gap-3 transition-all">
      <div
        onClick={onToggleExpand}
        className="flex items-center justify-between cursor-pointer group"
      >
        <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
          <FiZap size={12} className="animate-bounce" />
          <span>Template Sugerido Detectado</span>
        </div>
        <div className="text-blue-500 hover:text-blue-600 flex items-center gap-1 text-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider">
            {isExpanded ? 'Ocultar' : 'Revisar/Visualizar'}
          </span>
          {isExpanded ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
        </div>
      </div>

      {isExpanded && (
        <div className="text-xs bg-white/60 dark:bg-gray-900/70 p-3.5 rounded-xl border border-blue-50/50 dark:border-blue-900/20 space-y-3 max-h-[250px] overflow-y-auto">
          {tplData.name && (
            <div className="flex items-start gap-2.5 pb-2 border-b border-gray-100 dark:border-gray-800/40">
              <input
                type="checkbox"
                checked={fieldsToApply.name}
                onChange={() => toggleField('name')}
                className="mt-0.5 rounded text-blue-600 border-gray-300 dark:border-gray-700"
              />
              <div className="flex-1">
                <span className="font-bold text-[10px] uppercase text-gray-400">Nome</span>
                <div className="font-mono text-gray-700 dark:text-gray-200 mt-0.5">
                  {tplData.name}
                </div>
              </div>
            </div>
          )}

          {tplData.category && (
            <div className="flex items-start gap-2.5 pb-2 border-b border-gray-100 dark:border-gray-800/40">
              <input
                type="checkbox"
                checked={fieldsToApply.category}
                onChange={() => toggleField('category')}
                className="mt-0.5 rounded text-blue-600 border-gray-300 dark:border-gray-700"
              />
              <div className="flex-1">
                <span className="font-bold text-[10px] uppercase text-gray-400">Categoria</span>
                <div className="text-gray-700 dark:text-gray-200 mt-0.5 font-semibold">
                  {tplData.category}
                </div>
              </div>
            </div>
          )}

          {tplData.header_text && (
            <div className="flex items-start gap-2.5 pb-2 border-b border-gray-100 dark:border-gray-800/40">
              <input
                type="checkbox"
                checked={fieldsToApply.header}
                onChange={() => toggleField('header')}
                className="mt-0.5 rounded text-blue-600 border-gray-300 dark:border-gray-700"
              />
              <div className="flex-1">
                <span className="font-bold text-[10px] uppercase text-gray-400">
                  Cabeçalho ({tplData.header_type || 'NONE'})
                </span>
                <div className="text-gray-700 dark:text-gray-200 mt-0.5 whitespace-pre-line">
                  {tplData.header_text}
                </div>
              </div>
            </div>
          )}

          {tplData.body_text && (
            <div className="flex items-start gap-2.5 pb-2 border-b border-gray-100 dark:border-gray-800/40">
              <input
                type="checkbox"
                checked={fieldsToApply.body}
                onChange={() => toggleField('body')}
                className="mt-0.5 rounded text-blue-600 border-gray-300 dark:border-gray-700"
              />
              <div className="flex-1">
                <span className="font-bold text-[10px] uppercase text-gray-400">
                  Corpo da Mensagem
                </span>
                <div className="text-gray-700 dark:text-gray-200 mt-0.5 whitespace-pre-line leading-relaxed bg-blue-50/20 dark:bg-blue-950/10 p-2 rounded-lg">
                  {tplData.body_text}
                </div>
              </div>
            </div>
          )}

          {tplData.footer_text && (
            <div className="flex items-start gap-2.5 pb-2 border-b border-gray-100 dark:border-gray-800/40">
              <input
                type="checkbox"
                checked={fieldsToApply.footer}
                onChange={() => toggleField('footer')}
                className="mt-0.5 rounded text-blue-600 border-gray-300 dark:border-gray-700"
              />
              <div className="flex-1">
                <span className="font-bold text-[10px] uppercase text-gray-400">Rodapé</span>
                <div className="text-gray-500 dark:text-gray-400 mt-0.5 italic">
                  {tplData.footer_text}
                </div>
              </div>
            </div>
          )}

          {Array.isArray(tplData.buttons) && tplData.buttons.length > 0 && (
            <div className="flex items-start gap-2.5">
              <input
                type="checkbox"
                checked={fieldsToApply.buttons}
                onChange={() => toggleField('buttons')}
                className="mt-0.5 rounded text-blue-600 border-gray-300 dark:border-gray-700"
              />
              <div className="flex-1">
                <span className="font-bold text-[10px] uppercase text-gray-400">
                  Botões ({tplData.buttons.length})
                </span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {tplData.buttons.map((b, bIdx) => (
                    <div
                      key={bIdx}
                      className="bg-gray-100 dark:bg-gray-800 text-[10px] px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700/60 font-semibold text-gray-650 dark:text-gray-300"
                    >
                      {b.text} <span className="text-[8px] opacity-60">({b.type})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => onApplyTemplate(tplData)}
        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
      >
        <FiCheck size={14} /> Aplicar Campos Selecionados
      </button>
    </div>
  );
}
