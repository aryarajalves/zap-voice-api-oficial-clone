import React from 'react';
import { FiX } from 'react-icons/fi';

export default function MaximizedDataPreviewModal({
  isOpen,
  onClose,
  previewData,
  renderPreviewTable
}) {
  if (!isOpen || !previewData) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-8 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full h-full max-w-6xl overflow-hidden border border-gray-200 dark:border-gray-700 animate-in zoom-in-95 duration-150 flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50 shrink-0">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">Prévia dos Dados</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {previewData.total_rows} contatos ({previewData.unique_rows} únicos)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-400"
          >
            <FiX size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-gray-900/40">
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 overflow-auto">
            {renderPreviewTable(false)}
          </div>
        </div>
      </div>
    </div>
  );
}
