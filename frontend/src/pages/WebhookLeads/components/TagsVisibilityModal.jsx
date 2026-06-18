export function TagsVisibilityModal({
  selectedTagsForModal,
  modalTags,
  savingTags,
  onClose,
  onToggle,
  onSave,
}) {
  if (!selectedTagsForModal) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-700 animate-in zoom-in-95 duration-200 p-6 flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            Gerenciar Etiquetas de: <span className="text-blue-500">{selectedTagsForModal.contactName}</span>
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Selecione no máximo 3 etiquetas para ficarem visíveis na tela inicial. As demais ficarão ocultas sob o indicador +N.
          </p>
        </div>
        
        <div className="flex flex-col gap-1.5 max-h-[260px] overflow-y-auto p-1.5 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-800/80">
          {modalTags.length === 0 ? (
            <p className="text-xs text-gray-400 italic text-center py-4">Sem etiquetas associadas.</p>
          ) : (
            modalTags.map((tag, idx) => (
              <div 
                key={idx} 
                onClick={() => onToggle(idx)}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50 cursor-pointer transition-all border border-transparent hover:border-gray-200/50 dark:hover:border-gray-700 select-none"
              >
                <div className="flex items-center gap-2.5">
                  <input 
                    type="checkbox"
                    checked={tag.visible}
                    onChange={() => {}} // event bubbles from onClick on parent div
                    className="rounded border-gray-300 dark:border-gray-650 text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-800 h-4 w-4 pointer-events-none"
                  />
                  <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded text-xs font-semibold border border-blue-100 dark:border-blue-800/30 whitespace-nowrap">
                    {tag.name}
                  </span>
                </div>
                {tag.visible ? (
                  <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded border border-emerald-100 dark:border-emerald-900/30">Visível</span>
                ) : (
                  <span className="text-[9px] font-bold text-gray-400 dark:text-gray-550 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700/50">Oculto</span>
                )}
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end gap-2.5 mt-2">
          <button 
            onClick={onClose}
            disabled={savingTags}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-650 text-gray-700 dark:text-gray-200 text-xs font-semibold rounded-lg transition-all disabled:opacity-50"
          >
            Cancelar
          </button>
          <button 
            onClick={onSave}
            disabled={savingTags}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all shadow-md shadow-blue-500/10 disabled:opacity-50 flex items-center gap-1.5"
          >
            {savingTags ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>
    </div>
  );
}
