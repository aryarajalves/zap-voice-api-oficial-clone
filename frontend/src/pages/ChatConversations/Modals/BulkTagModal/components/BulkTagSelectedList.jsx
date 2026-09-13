import React from 'react';
import { FiX } from 'react-icons/fi';

export default function BulkTagSelectedList({
  selectedTags = [],
  targetCategory,
  resolveColor,
  handleRemoveTag,
  handleClearAllTags
}) {
  if (selectedTags.length === 0) return null;

  const isChat = targetCategory === 'chat';

  return (
    <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-400 font-medium">
            {selectedTags.length === 1 ? 'Etiqueta selecionada:' : `Etiquetas selecionadas (${selectedTags.length}):`}
          </span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isChat ? 'bg-blue-500/20 text-blue-300' : 'bg-indigo-500/20 text-indigo-300'}`}>
            {isChat ? 'Chat' : 'Contatos'}
          </span>
        </div>
        {selectedTags.length > 1 && (
          <button
            type="button"
            onClick={handleClearAllTags}
            className="text-[11px] text-slate-400 hover:text-red-400 transition cursor-pointer"
          >
            Limpar todas
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar pt-0.5">
        {selectedTags.map((tag) => (
          <span
            key={tag}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
              isChat
                ? 'bg-blue-600/20 text-blue-300 border-blue-500/30'
                : 'bg-indigo-600/20 text-indigo-300 border-indigo-500/30'
            }`}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: resolveColor(tag) }}
            />
            <span className="truncate max-w-[130px]">{tag}</span>
            <button
              type="button"
              onClick={() => handleRemoveTag(tag)}
              className="hover:text-red-400 ml-0.5 text-slate-400 cursor-pointer transition"
              title={`Remover ${tag}`}
            >
              <FiX size={13} />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
