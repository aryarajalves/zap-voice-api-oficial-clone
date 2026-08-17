import React from 'react';

export default function TagsPreviewModal({ selectedTagsForModal, onClose }) {
  if (!selectedTagsForModal) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-700 animate-in zoom-in-95 duration-200 p-6">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">
          Todas as etiquetas de: <span className="text-blue-500">{selectedTagsForModal.contactName}</span>
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Este contato possui {selectedTagsForModal.tags.length} etiquetas associadas:
        </p>
        <div className="flex flex-wrap gap-1.5 max-h-[200px] overflow-y-auto p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-800">
          {selectedTagsForModal.tags.map((tag, idx) => (
            <span key={idx} className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded text-xs font-medium border border-blue-100 dark:border-blue-800/30">
              {tag}
            </span>
          ))}
        </div>
        <div className="mt-6 flex justify-end">
          <button 
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs font-semibold rounded-lg transition-all"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
