import React from 'react';
import { FiAlertTriangle, FiLoader, FiTrash2 } from 'react-icons/fi';

export default function DeleteImportHistoryModal({
  isOpen,
  type,
  selectedCount,
  deleting,
  onClose,
  onConfirm
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-gray-700 animate-in zoom-in-95 duration-200 p-6">
        <div className="flex items-center gap-3 text-red-600 mb-4">
          <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
            <FiAlertTriangle size={20} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Confirmar Exclusão
          </h3>
        </div>
        
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
          Tem certeza que deseja apagar {type === 'bulk' ? `as ${selectedCount} listas selecionadas` : 'esta lista'} do histórico? Essa ação é permanente e não poderá ser desfeita. (Isso apagará apenas o registro do histórico de importação, não afetará os contatos criados).
        </p>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs font-semibold rounded-xl transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={onConfirm}
            className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-red-500/20 flex items-center gap-1.5 cursor-pointer"
          >
            {deleting ? <FiLoader className="animate-spin" /> : <FiTrash2 />}
            Confirmar e Excluir
          </button>
        </div>
      </div>
    </div>
  );
}
