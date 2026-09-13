import React from 'react';
import { FiPlus, FiCheck } from 'react-icons/fi';

export default function BulkTagAvailableList({
  filteredLabels = [],
  searchTerm = '',
  isExactMatch = false,
  targetCategory,
  selectedTags = [],
  resolveColor,
  handleCreateCustomTag,
  handleToggleTag
}) {
  const isChat = targetCategory === 'chat';

  return (
    <div className="space-y-1">
      <span className="text-[11px] font-semibold text-slate-400">
        Etiquetas disponíveis ({filteredLabels.length}):
      </span>
      <div className="max-h-48 overflow-y-auto overflow-x-hidden rounded-xl border border-slate-800 bg-slate-950/40 p-1 divide-y divide-slate-800/40 custom-scrollbar">
        {/* Opção de criar nova se digitou algo que não existe exatamente */}
        {searchTerm.trim() && !isExactMatch && (
          <button
            type="button"
            onClick={() => handleCreateCustomTag(searchTerm)}
            className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition cursor-pointer font-semibold min-w-0"
          >
            <FiPlus size={13} className="shrink-0" />
            <span className="truncate min-w-0">
              Criar e selecionar nova etiqueta {isChat ? 'no Chat' : 'em Contatos'}: "<strong>{searchTerm.trim()}</strong>"
            </span>
          </button>
        )}

        {/* Lista de etiquetas existentes */}
        {filteredLabels.map((label) => {
          const isSelected = selectedTags.some((t) => t.toLowerCase() === label.toLowerCase());
          const labelColor = resolveColor(label);

          return (
            <button
              key={label}
              type="button"
              onClick={() => handleToggleTag(label)}
              className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between rounded-lg transition cursor-pointer ${
                isSelected
                  ? isChat
                    ? 'bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30'
                    : 'bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2 truncate flex-1 mr-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                  style={{ backgroundColor: labelColor }}
                />
                <span className="truncate min-w-0">{label}</span>
              </span>
              {isSelected && (
                <FiCheck
                  size={14}
                  className={isChat ? 'text-blue-400 shrink-0' : 'text-indigo-400 shrink-0'}
                />
              )}
            </button>
          );
        })}

        {filteredLabels.length === 0 && !searchTerm.trim() && (
          <div className="py-6 text-center text-xs text-slate-500">
            Nenhuma etiqueta disponível.
          </div>
        )}

        {filteredLabels.length === 0 && searchTerm.trim() && isExactMatch && (
          <div className="py-4 text-center text-xs text-slate-500">
            Nenhuma outra etiqueta encontrada.
          </div>
        )}
      </div>
    </div>
  );
}
