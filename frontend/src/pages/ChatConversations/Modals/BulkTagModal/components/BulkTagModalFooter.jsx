import React from 'react';

export default function BulkTagModalFooter({
  onClose,
  onApply,
  selectedTags = [],
  initialTags = [],
  targetCategory = 'chat',
  isApplying = false
}) {
  const isChat = targetCategory === 'chat';
  const hasInitialTags = initialTags && initialTags.length > 0;
  const isRemovingAll = hasInitialTags && selectedTags.length === 0;

  const getApplyButtonText = () => {
    if (isApplying) return 'Salvando...';
    if (isRemovingAll) {
      return isChat ? 'Remover etiquetas do Chat' : 'Remover etiquetas de Contatos';
    }
    if (selectedTags.length > 1) {
      return `Salvar ${selectedTags.length} etiquetas ${isChat ? 'no Chat' : 'em Contatos'}`;
    }
    return isChat ? 'Aplicar no Chat' : 'Aplicar em Contatos';
  };

  const isButtonDisabled = isApplying || (selectedTags.length === 0 && !hasInitialTags);

  return (
    <div className="flex justify-end items-center gap-3">
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
        onClick={() => onApply && onApply(selectedTags, targetCategory, { initialTags })}
        disabled={isButtonDisabled}
        className={`px-5 py-2 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition flex items-center gap-2 cursor-pointer shadow-lg ${
          isRemovingAll
            ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
            : isChat
            ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'
            : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20'
        }`}
      >
        {getApplyButtonText()}
      </button>
    </div>
  );
}
