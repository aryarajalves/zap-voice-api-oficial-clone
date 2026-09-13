import React from 'react';

export default function ContactsModalFooter({
  handleCopyContacts,
  selectedPhonesCount = 0,
  totalCount = 0,
  onClose
}) {
  const getCopyButtonLabel = () => {
    if (selectedPhonesCount > 0) {
      return `Copiar Selecionados (${selectedPhonesCount})`;
    }
    if (totalCount > 0) {
      return `Copiar Lista (${totalCount})`;
    }
    return 'Copiar Lista';
  };

  return (
    <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex justify-end gap-3 z-10">
      <button
        onClick={handleCopyContacts}
        className="px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition font-medium flex items-center gap-2 cursor-pointer"
      >
        {getCopyButtonLabel()}
      </button>
      <button
        onClick={onClose}
        className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition font-medium cursor-pointer"
      >
        Fechar
      </button>
    </div>
  );
}
