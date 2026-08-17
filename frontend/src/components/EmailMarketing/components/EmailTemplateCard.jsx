import React from 'react';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';

export default function EmailTemplateCard({ template, onEdit, onDelete }) {
  const plainTextPreview = template.body_html
    ? template.body_html.replace(/<[^>]*>?/gm, '').trim()
    : '';

  return (
    <div className="bg-white dark:bg-slate-800/80 backdrop-blur-md p-5 rounded-2xl border border-gray-100 dark:border-white/10 shadow-md flex flex-col justify-between hover:shadow-lg transition-all">
      <div>
        <h3 className="font-bold text-gray-800 dark:text-white text-base mb-1 truncate">
          {template.name}
        </h3>
        <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-3 truncate">
          📌 Assunto: {template.subject}
        </p>
        <div className="bg-gray-50 dark:bg-slate-900/60 p-3 rounded-xl text-xs text-gray-600 dark:text-gray-300 font-mono h-24 overflow-hidden text-ellipsis">
          {plainTextPreview || 'Sem conteúdo'}
        </div>
      </div>
      <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100 dark:border-gray-700">
        <button
          type="button"
          onClick={() => onEdit(template)}
          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
        >
          <FiEdit2 /> Editar
        </button>
        <button
          type="button"
          onClick={() => onDelete(template)}
          className="text-xs font-semibold text-red-500 hover:underline flex items-center gap-1"
        >
          <FiTrash2 /> Excluir
        </button>
      </div>
    </div>
  );
}
