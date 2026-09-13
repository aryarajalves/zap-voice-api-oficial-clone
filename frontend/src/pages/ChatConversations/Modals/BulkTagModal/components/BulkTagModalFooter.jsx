import React from 'react';

export default function BulkTagModalFooter({
  onClose,
  onApply,
  selectedTags = [],
  targetCategory = 'chat',
  isApplying = false
}) {
  const isChat = targetCategory === 'chat';

  const getApplyButtonText = () => {
    if (isApplying) return 'Aplicando...';
    if (selectedTags.length > 1) {
      return `Aplicar ${selectedTags.length} etiquetas ${isChat ? 'no Chat' : 'em Contatos'}`;
    }
    return isChat ? 'Aplicar no Chat' : 'Aplicar em Contatos';
  };

  return (
    <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700 transition cursor-pointer"
        disabled={isApplying}
      >
        Cancelar
      </button>
      <button
        type="button"
        id="btn-apply-bulk-tag"
        onClick={() => onApply && onApply(selectedTags, targetCategory)}
        disabled={isApplying || selectedTags.length === 0}
        className={`px-5 py-2 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition flex items-center gap-2 cursor-pointer shadow-lg ${
          isChat
            ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'
            : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20'
        }`}
      >
        {getApplyButtonText()}
      </button>
    </div>
  );
}
